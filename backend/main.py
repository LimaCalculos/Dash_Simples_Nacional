import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables, SessionLocal
from app.routers import auth, dashboard, clients, declarations, drive
from app.services.sync_service import run_sync

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL))
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="America/Sao_Paulo")


def scheduled_sync():
    """Called by APScheduler every N minutes."""
    db = SessionLocal()
    try:
        logger.info("Scheduled Drive sync started.")
        result = run_sync(db)
        logger.info(f"Scheduled sync done: {result}")
    except Exception as e:
        logger.error(f"Scheduled sync error: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_tables()
    logger.info("Database tables created/verified.")

    if settings.DRIVE_ROOT_FOLDER_ID:
        scheduler.add_job(
            scheduled_sync,
            "interval",
            minutes=settings.DRIVE_POLL_INTERVAL_MINUTES,
            id="drive_sync",
            replace_existing=True,
        )
        scheduler.start()
        logger.info(f"Drive sync scheduler started (every {settings.DRIVE_POLL_INTERVAL_MINUTES} min).")
    else:
        logger.warning("DRIVE_ROOT_FOLDER_ID not set — auto-sync disabled.")

    yield

    # Shutdown
    if scheduler.running:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="Simples Dashboard API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(clients.router)
app.include_router(declarations.router)
app.include_router(drive.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
