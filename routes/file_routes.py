import win32api
from flask import Blueprint, jsonify, request, send_from_directory
from flask_login import login_required
from services.file_service import FileService
from werkzeug.utils import secure_filename
import os
import datetime
from functools import wraps

bp = Blueprint('files', __name__)

def handle_errors(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)})
    return wrapper

def validate_path(path, require_exists=True):
    if not path:
        raise ValueError('Path is required')
    
    if not os.path.abspath(path).startswith(os.path.abspath(path[:3])):
        raise ValueError('Invalid path')
        
    if require_exists and not os.path.exists(path):
        raise ValueError('Path does not exist')
    
    return True

def success_response(data=None, message=None):
    response = {'status': 'success'}
    if data is not None:
        response.update(data if isinstance(data, dict) else {'data': data})
    if message:
        response['message'] = message
    return jsonify(response)

def get_drive_list():
    drives = []
    for d in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        drive_path = f"{d}:\\"
        if os.path.exists(drive_path):
            try:
                drive_type = win32api.GetDriveType(drive_path)
                drives.append({
                    'name': drive_path,
                    'path': drive_path,
                    'is_dir': True,
                    'drive_type': drive_type
                })
            except Exception:
                drives.append({
                    'name': drive_path,
                    'path': drive_path,
                    'is_dir': True,
                    'drive_type': 0
                })
    return drives

def get_directory_contents(root_dir):
    if not FileService.check_dir_access(root_dir):
        raise ValueError('Access is denied')

    items = os.listdir(root_dir)
    file_list = []
    
    for item in items:
        full_path = os.path.join(root_dir, item)
        is_dir = os.path.isdir(full_path)
        
        file_info = {
            'name': item,
            'path': full_path,
            'is_dir': is_dir,
            'no_access': is_dir and not FileService.check_dir_access(full_path)
        }
        file_list.append(file_info)
    
    file_list.sort(key=lambda x: (not x['is_dir'], x['no_access'], x['name'].lower()))
    return file_list

@bp.route('/api/files')
@login_required
@handle_errors
def list_files():
    root_dir = request.args.get('path', '/')
    
    if not root_dir or root_dir == '/':
        return jsonify(get_drive_list())
    
    root_dir = f"{root_dir}\\" if not root_dir.endswith("\\") else root_dir
    validate_path(root_dir)
    return jsonify(get_directory_contents(root_dir))

@bp.route('/api/file_info')
@login_required
@handle_errors
def file_info():
    file_path = request.args.get('path')
    validate_path(file_path)
    
    file_stats = os.stat(file_path)
    return success_response({
        'size': file_stats.st_size,
        'last_modified': datetime.datetime.fromtimestamp(file_stats.st_mtime).isoformat()
    })

@bp.route('/api/download')
@login_required
@handle_errors
def download_file():
    file_path = request.args.get('path')
    validate_path(file_path)
    
    return send_from_directory(
        os.path.dirname(file_path),
        os.path.basename(file_path),
        as_attachment=True
    )

@bp.route('/api/upload', methods=['POST'])
@login_required
@handle_errors
def upload_file():
    if 'files' not in request.files:
        raise ValueError('No file part')

    upload_path = request.form.get('path')
    absolute_upload_path = os.path.abspath(os.path.join('/', upload_path))
    validate_path(absolute_upload_path, require_exists=False)
    
    for file in request.files.getlist('files'):
        if file.filename:
            file_path = os.path.join(absolute_upload_path, secure_filename(file.filename))
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            file.save(file_path)
            
    return success_response(message='Files uploaded successfully')

@bp.route('/api/delete', methods=['POST'])
@login_required
@handle_errors
def delete_file_or_folder():
    path = request.json.get('path')
    validate_path(path)
    
    if os.path.isdir(path):
        os.rmdir(path)
    else:
        os.remove(path)
    return success_response(message='Item deleted successfully')

@bp.route('/api/create_folder', methods=['POST'])
@login_required
@handle_errors
def create_folder():
    parent_path = request.json.get('parentPath')
    folder_name = request.json.get('folderName')
    
    if not folder_name:
        raise ValueError('Folder name is required')
    
    validate_path(parent_path)
    full_path = os.path.join(parent_path, folder_name)
    os.makedirs(full_path)
    return success_response(message='Folder created successfully')

@bp.route('/api/rename', methods=['POST'])
@login_required
@handle_errors
def rename_file_or_folder():
    old_path = request.json.get('oldPath')
    new_name = request.json.get('newName')
    
    if not new_name:
        raise ValueError('New name is required')
    
    validate_path(old_path)
    new_path = os.path.join(os.path.dirname(old_path), new_name)
    os.rename(old_path, new_path)
    return success_response(message='Renamed successfully')