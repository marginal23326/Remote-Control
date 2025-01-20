# routes/shell_routes.py
import uuid

from flask import Blueprint, current_app, jsonify, request
from flask_login import login_required

bp = Blueprint("shell", __name__)


@bp.route("/api/shell/create", methods=["POST"])
@login_required
def create_shell():
    shell_manager = current_app.shell_manager
    cols = request.json.get("cols", 80)
    rows = request.json.get("rows", 24)
    session_id = str(uuid.uuid4())
    success = shell_manager.create_session(session_id, cols, rows)
    return jsonify({"status": "success" if success else "error", "session_id": session_id})
