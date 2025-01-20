import datetime
import os
import shutil
import tempfile
import threading
import zipfile
from contextlib import contextmanager
from pathlib import Path

import win32api
from werkzeug.utils import secure_filename

class FileManager:
    def __init__(self):
        pass

    def check_dir_access(self, path):
        try:
            os.listdir(path)
            return True
        except (PermissionError, FileNotFoundError, OSError):
            return False

    def validate_path(self, path, require_exists=True):
        if not path:
            raise ValueError("Path is required")

        if not Path(path).resolve().is_relative_to(Path(path[:3]).resolve()):
            raise ValueError("Invalid path")

        if require_exists and not Path(path).exists():
            raise ValueError("Path does not exist")

        return True

    def get_drive_list(self):
        drives = []
        for d in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            drive_path = f"{d}:\\"
            if Path(drive_path).exists():
                try:
                    drive_type = win32api.GetDriveType(drive_path)
                    drives.append({
                            "name": drive_path,
                            "path": drive_path,
                            "is_dir": True,
                            "drive_type": drive_type,
                        })
                except Exception:
                    drives.append({
                            "name": drive_path,
                            "path": drive_path,
                            "is_dir": True,
                            "drive_type": 0,
                        })
        return drives

    def get_directory_contents(self, root_dir):
        if not self.check_dir_access(root_dir):
            raise ValueError("Access is denied")

        items = os.listdir(root_dir)
        file_list = []

        for item in items:
            full_path = Path(root_dir) / item
            is_dir = full_path.is_dir()

            file_info = {
                "name": item,
                "path": str(full_path),
                "is_dir": is_dir,
                "no_access": is_dir and not self.check_dir_access(str(full_path)),
            }

            if not is_dir:
                try:
                    stats = full_path.stat()
                    file_info.update({
                            "size": stats.st_size,
                            "last_modified": datetime.datetime.fromtimestamp(stats.st_mtime).isoformat(),
                        })
                except (OSError, PermissionError):
                    file_info.update({"size": 0, "last_modified": None})

            file_list.append(file_info)

        file_list.sort(key=lambda x: (not x["is_dir"], x["no_access"], x["name"].lower()))
        return file_list

    @contextmanager
    def prepare_download(self, paths):
        if not paths:
            raise ValueError("No paths provided")

        temp_file = None
        try:
            if len(paths) == 1:
                path = paths[0]
                self.validate_path(path)
                if Path(path).is_dir():
                    raise ValueError("Cannot download directories directly")
                yield path, Path(path).name
                return

            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
            temp_path = temp_file.name
            temp_file.close()

            with zipfile.ZipFile(temp_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
                for path in paths:
                    self.validate_path(path)
                    if Path(path).is_dir():
                        continue
                    zip_file.write(path, Path(path).name)

            yield temp_path, "download.zip"

            threading.Timer(5.0, lambda p: Path(p).unlink() if Path(p).exists() else None, [temp_path]).start()

        except Exception:
            if temp_file and Path(temp_file.name).exists():
                try:
                    Path(temp_file.name).unlink()
                except:
                    pass
            raise

    def create_folder(self, parent_path, folder_name):
        if not folder_name:
            raise ValueError("Folder name is required")

        self.validate_path(parent_path)
        full_path = Path(parent_path) / folder_name
        full_path.mkdir(parents=True)
        return str(full_path)

    def rename_item(self, old_path, new_name):
        if not new_name:
            raise ValueError("New name is required")

        self.validate_path(old_path)
        new_path = Path(old_path).parent / new_name
        Path(old_path).rename(new_path)
        return str(new_path)

    def delete_items(self, paths):
        if not paths or not isinstance(paths, list):
            raise ValueError("Invalid paths provided for deletion")

        results = {"successful": [], "failed": []}

        for path in paths:
            try:
                self.validate_path(path)
                if Path(path).is_dir():
                    shutil.rmtree(path)
                else:
                    Path(path).unlink()
                results["successful"].append(path)
            except Exception as e:
                results["failed"].append({"path": path, "error": str(e)})

        return results

    def save_uploaded_file(self, file, upload_path):
        absolute_upload_path = Path(upload_path).resolve()
        self.validate_path(str(absolute_upload_path), require_exists=False)

        if file.filename:
            file_path = absolute_upload_path / secure_filename(file.filename)
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file.save(file_path)
            return str(file_path)
        return None