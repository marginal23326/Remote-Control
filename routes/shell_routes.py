from flask import Blueprint, jsonify
from flask_login import login_required
from core.shell_manager import shell_manager

bp = Blueprint('shell', __name__)

@bp.route('/api/shell/create', methods=['POST'])
@login_required
def create_shell():
    session_id = str(id(shell_manager))
    success = shell_manager.create_session(session_id)
    return jsonify({'status': 'success' if success else 'error', 'session_id': session_id})