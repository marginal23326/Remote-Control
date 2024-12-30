# config/auth_config.py
import os
from werkzeug.security import generate_password_hash

USER_CONFIG_FILE = 'user_config.json'

def load_user_config():
    if not os.path.exists(USER_CONFIG_FILE):
        return None

    with open(USER_CONFIG_FILE, 'r') as f:
        import json
        return json.load(f)

def save_user_config(username, password):
    user_config = {
        'username': username,
        'password_hash': generate_password_hash(password)
    }
    with open(USER_CONFIG_FILE, 'w') as f:
        import json
        json.dump(user_config, f)

# Load the user config at startup
USER_CONFIG = load_user_config()