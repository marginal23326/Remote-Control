# events/__init__.py
from .connection_events import register_connection_events
from .audio_events import register_audio_events
from .input_events import register_input_events
from .auth_events import register_auth_events
from .shell_events import register_shell_events


def register_events(socketio, input_manager, audio_manager, shell_manager):
    register_connection_events(socketio)
    register_audio_events(socketio, audio_manager)
    register_input_events(socketio, input_manager)
    register_shell_events(socketio, shell_manager)
    register_auth_events(socketio)
