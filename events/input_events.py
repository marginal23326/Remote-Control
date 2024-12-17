from flask_login import login_required

def register_input_events(socketio, server):
    @socketio.on('mouse_event')
    @login_required
    def handle_mouse_event(data):
        server.handle_mouse_event(data)