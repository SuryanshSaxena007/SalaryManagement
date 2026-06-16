from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.v1.employees import register_exception_handlers
from app.api.v1.employees import router as employees_router
from app.api.v1.reports import router as reports_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.lifespan import lifespan


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging("INFO")

    app = FastAPI(title="Salary Management API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Accept"],
    )

    register_exception_handlers(app)
    app.include_router(employees_router)
    app.include_router(reports_router)
    app.include_router(health_router)

    logging.getLogger(__name__).info("Salary Management API starting")
    return app


app = create_app()
