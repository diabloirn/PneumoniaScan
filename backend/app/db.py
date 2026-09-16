from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os


DB_USER = os.getenv("MYSQL_USER", "root")
DB_PASS = os.getenv("MYSQL_PASSWORD", "")
DB_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
DB_PORT = os.getenv("MYSQL_PORT", "3306")
DB_NAME = os.getenv("MYSQL_DB", "pneumonia_db")


if DB_USER == "root":
    # Force no-password DSN for root when desired
    DATABASE_URL = f"mysql+pymysql://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
elif DB_PASS:
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    # Omit password segment entirely when empty to support root with no password
    DATABASE_URL = f"mysql+pymysql://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


def _init_engine():
    # If explicitly configured or default, attempt MySQL first
    mysql_url = DATABASE_URL
    try:
        test_engine = create_engine(mysql_url, pool_pre_ping=True, connect_args={"connect_timeout": 2})
        with test_engine.connect():
            pass
        print("[DB] Connected to MySQL successfully.")
        return test_engine
    except Exception as e:
        print(f"[DB Warning] MySQL connection failed ({e}). Falling back to local SQLite database.")
        from pathlib import Path
        db_path = Path(__file__).resolve().parent.parent / "pneumonia_db.sqlite3"
        sqlite_url = f"sqlite:///{db_path}"
        sqlite_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
        return sqlite_engine

engine = _init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


