"""Accounts: register, login, current user."""

import re
import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from ..db import get_db, utcnow
from ..schemas import LoginIn, RegisterIn, TokenOut, UserOut
from ..security import create_token, current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, db: sqlite3.Connection = Depends(get_db)):
    email = body.email.strip().lower()
    if not _EMAIL.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    cur = db.execute(
        "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
        (body.name.strip(), email, hash_password(body.password), utcnow().isoformat()),
    )
    db.commit()
    return {"token": create_token(cur.lastrowid), "user": {"name": body.name.strip(), "email": email}}


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: sqlite3.Connection = Depends(get_db)):
    email = body.email.strip().lower()
    if not email or not body.password:
        raise HTTPException(status_code=400, detail="Enter your email and password.")
    user = db.execute("SELECT id, name, email, password_hash FROM users WHERE email = ?", (email,)).fetchone()
    if user is None or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Wrong email or password.")
    return {"token": create_token(user["id"]), "user": {"name": user["name"], "email": user["email"]}}


@router.get("/me", response_model=UserOut)
def me(user: sqlite3.Row = Depends(current_user)):
    return {"name": user["name"], "email": user["email"]}
