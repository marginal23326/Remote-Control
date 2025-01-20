from flask import Blueprint, Response, current_app, jsonify, request
from flask_login import login_required

bp = Blueprint("stream", __name__)


@bp.route("/api/screenshot")
@login_required
def screenshot():
    img_str = current_app.stream_manager.get_screenshot()
    return jsonify({
        "status": "success" if img_str else "error",
        "image": img_str,
        "message": "Failed to capture screenshot" if not img_str else None,
    })


@bp.route("/api/stream")
@login_required
def stream():
    sid = request.args.get("sid")
    if not sid:
        return jsonify({"status": "error", "message": "No session ID provided"})

    with current_app.stream_manager.stream_lock:
        current_app.stream_manager.stream_active = True
        current_app.stream_manager.current_stream_sid = sid
        current_app.stream_manager.start_cursor_updates()

    return Response(current_app.stream_manager.stream_generator(sid), mimetype="text/event-stream")


@bp.route("/api/stream/stop")
@login_required
def stop_stream():
    with current_app.stream_manager.stream_lock:
        current_app.stream_manager.stream_active = False
        current_app.stream_manager.current_stream_sid = None
        if current_app.stream_manager.camera.is_capturing:
            current_app.stream_manager.camera.stop()
        current_app.stream_manager.cursor_update_thread = None
    return jsonify({"status": "success"})


@bp.route("/api/stream/settings", methods=["GET", "POST"])
@login_required
def stream_settings():
    if request.method == "POST":
        settings = request.json
        current_app.stream_manager.update_settings(settings)

        if "audio_settings" in settings:
            current_app.audio_manager.update_settings(settings["audio_settings"])

    return jsonify(current_app.stream_manager.get_current_settings())
