from .connection_events import register_connection_events
from .audio_events import register_audio_events
from .input_events import register_input_events
from .auth_events import register_auth_events

def register_events(socketio, server, audio_manager):
    register_connection_events(socketio)
    register_audio_events(socketio, audio_manager)
    register_input_events(socketio, server)
    register_auth_events(socketio)