import os
from werkzeug.utils import secure_filename

class FileService:
    @staticmethod
    def check_dir_access(dir_path):
        try:
            os.listdir(dir_path)
            return True
        except PermissionError:
            return False
        except Exception:
            return False