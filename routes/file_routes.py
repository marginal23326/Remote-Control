from functools import wraps
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, send_from_directory
from flask_login import login_required

bp = Blueprint("files", __name__)

def handle_errors(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    return wrapper

def success_response(data=None, message=None):
    response = {"status": "success"}
    if data is not None:
        response.update(data if isinstance(data, dict) else {"data": data})
    if message:
        response["message"] = message
    return jsonify(response)

@bp.route("/api/files")
@login_required
@handle_errors
def list_files():
    root_dir = request.args.get("path", "/")

    if not root_dir or root_dir == "/":
        return jsonify(current_app.file_manager.get_drive_list())

    root_dir = f"{root_dir}\\" if not root_dir.endswith("\\") else root_dir
    current_app.file_manager.validate_path(root_dir)
    return jsonify(current_app.file_manager.get_directory_contents(root_dir))

@bp.route("/api/download")
@login_required
@handle_errors
def download_file():
    paths = request.args.getlist("paths[]")
    with current_app.file_manager.prepare_download(paths) as (file_path, filename):
        return send_from_directory(
            Path(file_path).parent,
            Path(file_path).name,
            as_attachment=True,
            download_name=filename,
        )

@bp.route("/api/upload", methods=["POST"])
@login_required
@handle_errors
def upload_file():
    if "files" not in request.files:
        msg = "No file part"
        raise ValueError(msg)

    upload_path = request.form.get("path")
    saved_files = []

    for file in request.files.getlist("files"):
        saved_path = current_app.file_manager.save_uploaded_file(file, upload_path)
        if saved_path:
            saved_files.append(saved_path)

    return success_response(message="Files uploaded successfully")

@bp.route("/api/delete", methods=["POST"])
@login_required
@handle_errors
def delete_file_or_folder():
    paths = request.json.get("paths")
    results = current_app.file_manager.delete_items(paths)

    message = (f"Deleted {len(results['successful'])} items, "
               f"{len(results['failed'])} failed") if results["failed"] else \
               f"Successfully deleted {len(results['successful'])} items"

    return success_response(data=results, message=message)

@bp.route("/api/create_folder", methods=["POST"])
@login_required
@handle_errors
def create_folder():
    parent_path = request.json.get("parentPath")
    folder_name = request.json.get("folderName")
    current_app.file_manager.create_folder(parent_path, folder_name)
    return success_response(message="Folder created successfully")

@bp.route("/api/rename", methods=["POST"])
@login_required
@handle_errors
def rename_file_or_folder():
    old_path = request.json.get("oldPath")
    new_name = request.json.get("newName")
    current_app.file_manager.rename_item(old_path, new_name)
    return success_response(message="Renamed successfully")
