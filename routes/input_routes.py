from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required

bp = Blueprint("input", __name__)


@bp.route("/api/keyboard/shortcut", methods=["POST"])
@login_required
def keyboard_shortcut():
    data = request.json
    shortcut = data.get("shortcut")
    modifiers = data.get("modifiers", [])

    success = current_app.input_manager.handle_keyboard_shortcut(shortcut, modifiers)
    return jsonify({"status": "success" if success else "error"})


@bp.route("/api/keyboard/type", methods=["POST"])
@login_required
def keyboard_type():
    text = request.json.get("text", "")
    success = current_app.input_manager.type_text(text) if len(text) <= 1 else current_app.input_manager.paste_text(text)
    return jsonify({"status": "success" if success else "error"})
