import win32api
from flask import Blueprint, jsonify, request, send_from_directory
from flask_login import login_required
from services.file_service import FileService
from werkzeug.utils import secure_filename
import os
import datetime

bp = Blueprint('files', __name__)

@bp.route('/api/files')
@login_required
def list_files():
    root_dir = request.args.get('path', '/')

    if not root_dir or root_dir == '/':
        drives = []
        for d in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            drive_path = f"{d}:\\"
            if os.path.exists(drive_path):
                try:
                    # Check if we can get drive type (this can also raise errors)
                    drive_type = win32api.GetDriveType(drive_path)
                    drives.append({'name': drive_path, 'path': drive_path, 'is_dir': True, 'drive_type': drive_type})
                except Exception:
                    # Append with unknown type if there was an issue
                    drives.append({'name': drive_path, 'path': drive_path, 'is_dir': True, 'drive_type': 0})
        return jsonify(drives)

    root_dir = f"{root_dir}\\" if not root_dir.endswith("\\") else root_dir

    try:
        if not os.path.abspath(root_dir).startswith(os.path.abspath(root_dir[:3])):
            return jsonify({'status': 'error', 'message': 'Invalid path'})

        # Check access before listing contents
        if not FileService.check_dir_access(root_dir):
            return jsonify({'status': 'error', 'message': 'Access is denied', 'no_access': True})

        items = os.listdir(root_dir)
        file_list = []
        for item in items:
            full_path = os.path.join(root_dir, item)
            is_dir = os.path.isdir(full_path)

            # Check access for the item if it's a directory
            if is_dir and not FileService.check_dir_access(full_path):
                file_list.append({
                    'name': item,
                    'path': full_path,
                    'is_dir': True,
                    'no_access': True  # Mark inaccessible directories
                })
            else:
                file_list.append({
                    'name': item,
                    'path': full_path,
                    'is_dir': is_dir,
                    'no_access': False
                })

        # Sort: folders first (inaccessible after accessible), then files, all alphabetically
        file_list.sort(key=lambda x: (not x['is_dir'], x['no_access'], x['name'].lower()))

        return jsonify(file_list)

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@bp.route('/api/file_info')
@login_required
def file_info():
    file_path = request.args.get('path')
    if not file_path:
        return jsonify({'status': 'error', 'message': 'File path is required'})

    if not os.path.abspath(file_path).startswith(os.path.abspath(file_path[:3])):
        return jsonify({'status': 'error', 'message': 'Invalid path'})

    try:
        file_stats = os.stat(file_path)
        last_modified = datetime.datetime.fromtimestamp(file_stats.st_mtime)
        return jsonify({
            'size': file_stats.st_size,
            'last_modified': last_modified.isoformat(),
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@bp.route('/api/download')
@login_required
def download_file():
    file_path = request.args.get('path')
    if not file_path:
        return jsonify({'status': 'error', 'message': 'File path is required'})

    if not os.path.abspath(file_path).startswith(os.path.abspath(file_path[:3])):
        return jsonify({'status': 'error', 'message': 'Invalid path'})

    try:
        return send_from_directory(
            os.path.dirname(file_path),
            os.path.basename(file_path),
            as_attachment=True
        )
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@bp.route('/api/upload', methods=['POST'])
@login_required
def upload_file():
    if 'files' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file part'})

    upload_path = request.form.get('path')
    absolute_upload_path = os.path.abspath(os.path.join('/', upload_path))
    
    if not absolute_upload_path.startswith(os.path.abspath('/')):
        return jsonify({'status': 'error', 'message': 'Invalid upload path'})

    try:
        for file in request.files.getlist('files'):
            if file.filename:
                file_path = os.path.join(absolute_upload_path, secure_filename(file.filename))
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                file.save(file_path)
        return jsonify({'status': 'success', 'message': 'Files uploaded successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Error saving file: {str(e)}'})

@bp.route('/api/delete', methods=['POST'])
@login_required
def delete_file_or_folder():
    path = request.json.get('path')
    if not path:
        return jsonify({'status': 'error', 'message': 'Path is required'})

    try:
        if os.path.isdir(path):
            os.rmdir(path)
        else:
            os.remove(path)
        return jsonify({'status': 'success', 'message': 'Item deleted successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@bp.route('/api/create_folder', methods=['POST'])
@login_required
def create_folder():
    parent_path = request.json.get('parentPath')
    folder_name = request.json.get('folderName')
    
    if not parent_path or not folder_name:
        return jsonify({'status': 'error', 'message': 'Parent path and folder name are required'})

    try:
        os.makedirs(os.path.join(parent_path, folder_name))
        return jsonify({'status': 'success', 'message': 'Folder created successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

@bp.route('/api/rename', methods=['POST'])
@login_required
def rename_file_or_folder():
    old_path = request.json.get('oldPath')
    new_name = request.json.get('newName')
    
    if not old_path or not new_name:
        return jsonify({'status': 'error', 'message': 'Old path and new name are required'})

    try:
        os.rename(old_path, os.path.join(os.path.dirname(old_path), new_name))
        return jsonify({'status': 'success', 'message': 'Renamed successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})