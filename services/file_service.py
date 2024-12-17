import os

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