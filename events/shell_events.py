# events/shell_events.py
from flask_login import login_required
from flask_socketio import emit

def register_shell_events(socketio, shell_manager):
    @socketio.on('shell_input')
    @login_required
    def handle_shell_input(data):
        session_id = data.get('session_id')
        command = data.get('command')
        shell_manager.write_to_shell(session_id, command)

    @socketio.on('shell_resize')
    @login_required
    def handle_shell_resize(data):
        session_id = data.get('session_id')
        cols = data.get('cols')
        rows = data.get('rows')

        if session_id and cols and rows:
            shell_manager.resize_terminal(session_id, cols, rows)

    @socketio.on('shell_poll')
    @login_required
    def handle_shell_poll(data):
        session_id = data.get('session_id')
        if session_id:
            output = shell_manager.read_output(session_id)
            if output:
                emit('shell_output', {'output': output, 'session_id': session_id})

    @socketio.on('disconnect')
    def handle_disconnect():
        for session_id in list(shell_manager.shells.keys()):
            shell_manager.cleanup_session(session_id)
