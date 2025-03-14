from flask import Blueprint, current_app, jsonify
from flask_login import login_required

bp = Blueprint("system", __name__)


@bp.route("/api/system")
@login_required
def system_info():
    return jsonify(current_app.system_manager.get_system_info())
