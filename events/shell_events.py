from flask_login import login_required
from flask_socketio import emit
from core.shell_manager import shell_manager

def register_shell_events(socketio):
    @socketio.on('shell_input')
    @login_required
    def handle_shell_input(data):
        session_id = data.get('session_id')
        command = data.get('command')
        
        if not session_id or not command:
            emit('shell_error', {'message': 'Invalid session or command'})
            return
            
        success = shell_manager.write_to_shell(session_id, command)
        if not success:
            emit('shell_error', {'message': 'Failed to write to shell'})
            return

    @socketio.on('shell_poll')
    @login_required
    def handle_shell_poll(data):
        session_id = data.get('session_id')
        if not session_id:
            return
            
        output = shell_manager.read_output(session_id)
        if output:
            emit('shell_output', {'output': output})

    @socketio.on('disconnect')
    def handle_disconnect():
        for session_id in list(shell_manager.shells.keys()):
            shell_manager.cleanup_session(session_id)