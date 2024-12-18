from flask_socketio import emit
from flask_login import current_user

def register_auth_events(socketio):
    @socketio.on('check_auth')
    def check_auth():
        emit('auth_status', {'authenticated': current_user.is_authenticated})