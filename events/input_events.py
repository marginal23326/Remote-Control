from flask_login import login_required
from flask import current_app

def register_input_events(socketio, input_manager):
    @socketio.on('mouse_event')
    @login_required
    def handle_mouse_event(data):
        current_app.input_manager.handle_mouse_event(data)