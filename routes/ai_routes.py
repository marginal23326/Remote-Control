from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required

bp = Blueprint("ai", __name__)


@bp.route("/api/ai/prompt", methods=["POST"])
@login_required
def handle_ai_prompt():
    data = request.json
    prompt = data.get("prompt")
    if not prompt:
        return jsonify({"status": "error", "message": "No prompt provided."}), 400

    # Write the prompt to the file
    with open("ai_prompt.txt", "w") as f:
        f.write(prompt)

    return jsonify({"status": "success", "message": "Prompt received."})


@bp.route("/api/ai/start", methods=["POST"])
@login_required
def start_ai():
    data = request.json
    initial_prompt = data.get("initial_prompt", "")
    if not current_app.ai_service.running:
        current_app.ai_service.start(initial_prompt)
        return jsonify({"status": "success", "message": "AI service started."})
    return jsonify({"status": "error", "message": "AI service already running."})


@bp.route("/api/ai/stop", methods=["POST"])
@login_required
def stop_ai():
    if current_app.ai_service.running:
        current_app.ai_service.stop()
        return jsonify({"status": "success", "message": "AI service stopped."})
    return jsonify({"status": "error", "message": "AI service not running."})