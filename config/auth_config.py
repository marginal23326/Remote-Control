# config/auth_config.py
import os
import sys
from pathlib import Path

from werkzeug.security import generate_password_hash

def resource_path(relative_path):
    base_path = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return base_path / relative_path

USER_CONFIG_FILE = resource_path("user_config.json")

def load_user_config():
    if not USER_CONFIG_FILE.exists():
        return None

    with USER_CONFIG_FILE.open() as f:
        import json

        return json.load(f)

def save_user_config(username, password):
    user_config = {
        "username": username,
        "password_hash": generate_password_hash(password),
    }
    with USER_CONFIG_FILE.open("w") as f:
        import json

        json.dump(user_config, f)

USER_CONFIG = load_user_config()
