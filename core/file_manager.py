import datetime
import os
import shutil
import tempfile
import threading
import zipfile
from contextlib import contextmanager

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

        if not os.path.abspath(path).startswith(os.path.abspath(path[:3])):
            raise ValueError("Invalid path")

        if require_exists and not os.path.exists(path):
            raise ValueError("Path does not exist")

        return True

    def get_drive_list(self):
        drives = []
        for d in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            drive_path = f"{d}:\\"
            if os.path.exists(drive_path):
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
            full_path = os.path.join(root_dir, item)
            is_dir = os.path.isdir(full_path)

            file_info = {
                "name": item,
                "path": full_path,
                "is_dir": is_dir,
                "no_access": is_dir and not self.check_dir_access(full_path),
            }

            if not is_dir:
                try:
                    stats = os.stat(full_path)
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
                if os.path.isdir(path):
                    raise ValueError("Cannot download directories directly")
                yield path, os.path.basename(path)
                return

            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
            temp_path = temp_file.name
            temp_file.close()

            with zipfile.ZipFile(temp_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
                for path in paths:
                    self.validate_path(path)
                    if os.path.isdir(path):
                        continue
                    zip_file.write(path, os.path.basename(path))

            yield temp_path, "download.zip"

            threading.Timer(5.0, lambda p: os.unlink(p) if os.path.exists(p) else None, [temp_path]).start()

        except Exception:
            if temp_file and os.path.exists(temp_file.name):
                try:
                    os.unlink(temp_file.name)
                except:
                    pass
            raise

    def create_folder(self, parent_path, folder_name):
        if not folder_name:
            raise ValueError("Folder name is required")

        self.validate_path(parent_path)
        full_path = os.path.join(parent_path, folder_name)
        os.makedirs(full_path)
        return full_path

    def rename_item(self, old_path, new_name):
        if not new_name:
            raise ValueError("New name is required")

        self.validate_path(old_path)
        new_path = os.path.join(os.path.dirname(old_path), new_name)
        os.rename(old_path, new_path)
        return new_path

    def delete_items(self, paths):
        if not paths or not isinstance(paths, list):
            raise ValueError("Invalid paths provided for deletion")

        results = {"successful": [], "failed": []}

        for path in paths:
            try:
                self.validate_path(path)
                if os.path.isdir(path):
                    shutil.rmtree(path)
                else:
                    os.remove(path)
                results["successful"].append(path)
            except Exception as e:
                results["failed"].append({"path": path, "error": str(e)})

        return results

    def save_uploaded_file(self, file, upload_path):
        absolute_upload_path = os.path.abspath(os.path.join("/", upload_path))
        self.validate_path(absolute_upload_path, require_exists=False)

        if file.filename:
            file_path = os.path.join(absolute_upload_path, secure_filename(file.filename))
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            file.save(file_path)
            return file_path
        return None
