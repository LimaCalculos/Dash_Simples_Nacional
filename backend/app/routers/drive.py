from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db, SessionLocal
from ..models.drive_sync import DriveSync
from ..services.sync_service import run_sync
from ..services.google_drive import check_drive_connection
from ..routers.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/drive", tags=["drive"])


@router.post("/sync-now-test")
def trigger_sync_test(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Manually trigger a Drive sync (TEST - no auth). Runs in background."""
    sync = db.query(DriveSync).first()
    if sync and sync.status == "running":
        return {"message": "Sincronização já em andamento."}

    def _bg_sync():
        bg_db = SessionLocal()
        try:
            result = run_sync(bg_db)
            bg_db.commit()
        finally:
            bg_db.close()

    background_tasks.add_task(_bg_sync)
    return {"message": "Sincronização iniciada em segundo plano."}


@router.get("/status")
def get_drive_status(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sync = db.query(DriveSync).first()
    connected = check_drive_connection()
    return {
        "connected": connected,
        "status": sync.status if sync else "idle",
        "ultima_verificacao": sync.ultima_verificacao.isoformat() if sync and sync.ultima_verificacao else None,
        "arquivos_processados": sync.arquivos_processados if sync else 0,
        "arquivos_novos_ultima_sync": sync.arquivos_novos_ultima_sync if sync else 0,
        "last_error": sync.last_error if sync else None,
        "folder_id": sync.folder_id if sync else None,
    }
