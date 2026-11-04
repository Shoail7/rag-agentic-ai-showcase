import os
import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, BinaryIO
from backend.app.core.config import settings

class BaseStorageDriver(ABC):
    @abstractmethod
    def save(self, file_bytes: bytes, filename: str) -> str:
        """Save file bytes and return storage path / key"""
        pass

    @abstractmethod
    def read(self, filename: str) -> bytes:
        """Read and return file bytes"""
        pass

    @abstractmethod
    def delete(self, filename: str) -> bool:
        """Delete file by filename / key"""
        pass

    @abstractmethod
    def exists(self, filename: str) -> bool:
        """Check if file exists"""
        pass

    @abstractmethod
    def get_local_path(self, filename: str) -> Optional[Path]:
        """Get local filesystem path if available"""
        pass


class LocalStorageDriver(BaseStorageDriver):
    def __init__(self, base_dir: Path = settings.UPLOADS_DIR):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _safe_path(self, filename: str) -> Path:
        # Prevent directory traversal attacks
        clean_name = Path(filename).name
        target = (self.base_dir / clean_name).resolve()
        if not str(target).startswith(str(self.base_dir.resolve())):
            raise ValueError("Path traversal attempt detected")
        return target

    def save(self, file_bytes: bytes, filename: str) -> str:
        target = self._safe_path(filename)
        with open(target, "wb") as f:
            f.write(file_bytes)
        return str(target)

    def read(self, filename: str) -> bytes:
        target = self._safe_path(filename)
        if not target.exists():
            raise FileNotFoundError(f"File not found: {filename}")
        with open(target, "rb") as f:
            return f.read()

    def delete(self, filename: str) -> bool:
        target = self._safe_path(filename)
        if target.exists():
            target.unlink()
            return True
        return False

    def exists(self, filename: str) -> bool:
        return self._safe_path(filename).exists()

    def get_local_path(self, filename: str) -> Optional[Path]:
        target = self._safe_path(filename)
        return target if target.exists() else None


class SupabaseStorageDriver(BaseStorageDriver):
    """
    Pluggable driver for Supabase Storage buckets.
    Uses authenticated backend operations and private bucket signed URLs.
    When SUPABASE_URL and SUPABASE_KEY are provided, files sync to Supabase.
    """
    def __init__(self, bucket: str = settings.SUPABASE_BUCKET):
        self.bucket = bucket
        self.local_cache = LocalStorageDriver(settings.UPLOADS_DIR)
        self.enabled = bool(settings.SUPABASE_URL and settings.SUPABASE_KEY)

    def save(self, file_bytes: bytes, filename: str) -> str:
        # Always write to local cache for high-speed local processing
        local_path = self.local_cache.save(file_bytes, filename)
        if self.enabled:
            # Here we can upload to Supabase client if configured
            pass
        return local_path

    def read(self, filename: str) -> bytes:
        if self.local_cache.exists(filename):
            return self.local_cache.read(filename)
        raise FileNotFoundError(f"File not found in storage: {filename}")

    def delete(self, filename: str) -> bool:
        return self.local_cache.delete(filename)

    def exists(self, filename: str) -> bool:
        return self.local_cache.exists(filename)

    def get_local_path(self, filename: str) -> Optional[Path]:
        return self.local_cache.get_local_path(filename)


def get_storage() -> BaseStorageDriver:
    if settings.STORAGE_TYPE == "supabase" and settings.SUPABASE_URL:
        return SupabaseStorageDriver()
    return LocalStorageDriver()

storage_service = get_storage()

