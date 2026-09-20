"""Password hashing (PBKDF2, Python standard library) and JWT login tokens."""

import base64
import binascii
import hashlib
import hmac
import secrets
import sqlite3
from datetime import timedelta
from pathlib import Path

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings
from .db import get_db, utcnow

_ALGO = "pbkdf2_sha256"
_ITERATIONS = 600_000  # OWASP recommendation for PBKDF2-SHA256


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return f"{_ALGO}${_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, stored: str) -> bool:
    """False for any stored value we can't read, rather than raising.

    A truncated or hand-edited password_hash row would otherwise crash the
    login endpoint with a 500 instead of answering "no".
    """
    try:
        algo, iterations, salt_b64, digest_b64 = stored.split("$")
        if algo != _ALGO:
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt_b64), int(iterations))
        return hmac.compare_digest(digest, base64.b64decode(digest_b64))
    except (ValueError, TypeError, binascii.Error):
        return False


def _jwt_secret() -> str:
    """JWT_SECRET from settings, or a random one saved in data/.jwt_secret."""
    settings = get_settings()
    if settings.jwt_secret:
        return settings.jwt_secret
    path: Path = settings.data_dir / ".jwt_secret"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(secrets.token_urlsafe(48))
    return path.read_text().strip()


def create_token(user_id: int) -> str:
    now = utcnow()
    payload = {"sub": str(user_id), "iat": now, "exp": now + timedelta(hours=get_settings().jwt_expire_hours)}
    return jwt.encode(payload, _jwt_secret(), algorithm="HS256")


def decode_token(token: str) -> int:
    payload = jwt.decode(token, _jwt_secret(), algorithms=["HS256"])
    return int(payload["sub"])


_bearer = HTTPBearer(auto_error=False)


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: sqlite3.Connection = Depends(get_db),
) -> sqlite3.Row:
    """FastAPI dependency: the signed-in user, or 401."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None:
        raise unauthorized
    try:
        user_id = decode_token(creds.credentials)
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized from None
    user = db.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    if user is None:
        raise unauthorized
    return user


def seed_demo_user() -> None:
    """Create the demo account from settings if it doesn't exist yet."""
    from .db import connect

    settings = get_settings()
    if not settings.seed_demo_user:
        return
    with connect() as conn:
        exists = conn.execute("SELECT 1 FROM users WHERE email = ?", (settings.demo_email.lower(),)).fetchone()
        if not exists:
            conn.execute(
                "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                ("Demo Trader", settings.demo_email.lower(), hash_password(settings.demo_password), utcnow().isoformat()),
            )
