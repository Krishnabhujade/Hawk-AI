"""Hawk AI API.

Run from the backend folder:
    uvicorn app.main:app --reload
Then open http://localhost:8000/docs
"""

import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import __version__, state
from .config import get_settings
from .data.market import MarketService, UnknownSymbol
from .db import init_db
from .routers import auth, content, market, orders, system
from .security import seed_demo_user

log = logging.getLogger("hawk")


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        init_db()
        seed_demo_user()
        service = MarketService.build(settings)
        state.set_market(service)
        threading.Thread(target=service.warm_up, name="warm-up", daemon=True).start()
        yield

    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description="Backend for the Hawk AI trading terminal: replayed NSE market data, AI calls and paper trading.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    async def unknown_symbol(request: Request, exc: UnknownSymbol):
        return JSONResponse(
            status_code=404,
            content={"detail": f"No data for {exc.args[0]} on the replay day. Check the symbol or run the prepare step."},
        )

    app.add_exception_handler(UnknownSymbol, unknown_symbol)

    for module in (system, auth, market, content, orders):
        app.include_router(module.router)

    @app.get("/", include_in_schema=False)
    def root():
        return {"name": settings.app_name, "docs": "/docs"}

    return app


app = create_app()
