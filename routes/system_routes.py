from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required
from services.system_service import SystemService

bp = Blueprint('system', __name__)

@bp.route('/api/system')
@login_required
def system_info():
    return jsonify(SystemService.get_system_info())

@bp.route('/api/shell', methods=['POST'])
@login_required
def shell_command():
    return jsonify(current_app.server.execute_command(request.json.get('command')))