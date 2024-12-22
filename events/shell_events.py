from flask_login import login_required
from flask_socketio import emit
from core.shell_manager import shell_manager

def register_shell_events(socketio):
    @socketio.on('shell_input')
    @login_required
    def handle_shell_input(data):
        session_id = data.get('session_id')
        command = data.get('command')
        shell_manager.write_to_shell(session_id, command)

    @socketio.on('shell_poll')
    @login_required
    def handle_shell_poll(data):
        session_id = data.get('session_id')
        output = shell_manager.read_output(session_id)
        if output:
            emit('shell_output', {'output': output})

    @socketio.on('disconnect')
    def handle_disconnect():
        for session_id in list(shell_manager.shells.keys()):
            shell_manager.cleanup_session(session_id)
