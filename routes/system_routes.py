from flask import Blueprint, jsonify
from flask_login import login_required
from services.system_service import SystemService

bp = Blueprint('system', __name__)

@bp.route('/api/system')
@login_required
def system_info():
    return jsonify(SystemService.get_system_info())