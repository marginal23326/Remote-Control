from flask import current_app
from flask_login import current_user
from flask_socketio import emit


def register_connection_events(socketio):
    @socketio.on("connect")
    def handle_connect():
        if current_user.is_authenticated:
            emit("auth_status", {"authenticated": True})
        else:
            emit("auth_status", {"authenticated": False})

    @socketio.on("disconnect")
    def handle_disconnect():
        print("Client disconnected")
        with current_app.audio_manager.audio_lock:
            for stream_name in current_app.audio_manager.streams:
                if stream_name.startswith("server"):
                    current_app.audio_manager.streams[stream_name]["active"] = False
                if stream_name == "client_playback":
                    current_app.audio_manager.streams[stream_name]["active"] = False
                    while not current_app.audio_manager.streams[stream_name]["queue"].empty():
                        current_app.audio_manager.streams[stream_name]["queue"].get()
