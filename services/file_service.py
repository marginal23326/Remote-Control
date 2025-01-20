import os


class FileService:
    @staticmethod
    def check_dir_access(dir_path):
        try:
            os.listdir(dir_path)
        except Exception:
            return False
        else:
            return True

