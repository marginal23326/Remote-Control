from flask import request
from flask_login import login_required


def register_audio_events(socketio, audio_manager):
    @socketio.on("start_server_audio")
    @login_required
    def handle_start_server_audio(data):
        audio_manager.start_stream(request.sid, f"server_{data.get('source', 'mic')}")

    @socketio.on("stop_server_audio")
    @login_required
    def handle_stop_server_audio():
        audio_manager.stop_stream("server_mic")
        audio_manager.stop_stream("server_system")

    @socketio.on("start_client_audio")
    @login_required
    def handle_start_client_audio():
        audio_manager.start_stream(request.sid, "client_playback")

    @socketio.on("stop_client_audio")
    @login_required
    def handle_stop_client_audio():
        audio_manager.stop_stream("client_playback")

    @socketio.on("client_audio_data")
    @login_required
    def handle_client_audio_data(data):
        with audio_manager.audio_lock:
            state = audio_manager.streams.get("client_playback")
            if state and state.get("active"):
                state["queue"].put(data)
