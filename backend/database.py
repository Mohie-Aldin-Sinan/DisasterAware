import os
from pathlib import Path

from sqlmodel import SQLModel, Session, create_engine

BASE_DIR = Path(__file__).resolve().parent


def _get_sqlite_path() -> Path:
    configured_path = os.getenv("DATABASE_PATH")
    if configured_path:
        return Path(configured_path).expanduser()

    if os.getenv("VERCEL"):
        # Vercel's filesystem is ephemeral, so SQLite must live in /tmp.
        return Path("/tmp/database.sqlite3")

    return BASE_DIR / "database.sqlite3"


sqlite_path = _get_sqlite_path()
sqlite_url = f"sqlite:///{sqlite_path.resolve().as_posix()}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, echo=False, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
