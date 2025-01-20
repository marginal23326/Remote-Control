# config/auth_config.py
import os
import sys

from werkzeug.security import generate_password_hash


def resource_path(relative_path):
    base_path = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_path, relative_path)


USER_CONFIG_FILE = resource_path("user_config.json")


def load_user_config():
    if not os.path.exists(USER_CONFIG_FILE):
        return None

    with open(USER_CONFIG_FILE) as f:
        import json

        return json.load(f)


def save_user_config(username, password):
    user_config = {
        "username": username,
        "password_hash": generate_password_hash(password),
    }
    with open(USER_CONFIG_FILE, "w") as f:
        import json

        json.dump(user_config, f)


USER_CONFIG = load_user_config()
