# server.py
import sys

from app import create_app
from config.auth_config import USER_CONFIG, save_user_config
from extensions import socketio


def prompt_for_credentials():
    print("No user configuration found.")
    while True:
        username = input("Enter a username: ")
        if not username:
            print("Username cannot be empty.")
            continue

        password = input("Enter a password: ")
        if not password:
            print("Password cannot be empty.")
            continue

        confirm_password = input("Confirm password: ")
        if password != confirm_password:
            print("Passwords do not match. Please try again.")
            continue

        return username, password


if __name__ == "__main__":
    if USER_CONFIG is None:
        username, password = prompt_for_credentials()
        save_user_config(username, password)
        print("User configuration saved.")

    if len(sys.argv) != 2:
        print("Usage: python server.py <port>")
        sys.exit(1)

    port = int(sys.argv[1])

    app = create_app()

    print("\n=== Remote Control Web Server ===")
    print("\nPress Ctrl+C to stop the server\n")

    socketio.run(app, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True)
