# routes/shell_routes.py
from flask import Blueprint, jsonify, request
from flask_login import login_required
from flask_socketio import emit
from core.shell_manager import shell_manager

bp = Blueprint('shell', __name__)

@bp.route('/api/shell/create', methods=['POST'])
@login_required
def create_shell():
    cols = request.json.get('cols', 80)
    rows = request.json.get('rows', 24)
    session_id = str(id(shell_manager))
    success = shell_manager.create_session(session_id, cols, rows)
    return jsonify({'status': 'success' if success else 'error', 'session_id': session_id})

def register_shell_events(socketio):
    @socketio.on('shell_input')
    @login_required
    def handle_shell_input(data):
        session_id = data.get('session_id')
        command = data.get('command')
        
        if not session_id or command is None:
            emit('shell_error', {'message': 'Invalid session or command'})
            return
            
        success = shell_manager.write_to_shell(session_id, command)
        if not success:
            emit('shell_error', {'message': 'Failed to write to shell'})

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
                emit('shell_output', {'output': output})

    @socketio.on('disconnect')
    def handle_disconnect():
        for session_id in list(shell_manager.shells.keys()):
            shell_manager.cleanup_session(session_id)