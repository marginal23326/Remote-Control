# routes/task_routes.py
from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required

bp = Blueprint('tasks', __name__)

@bp.route('/api/tasks')
@login_required
def get_tasks():
    processes = current_app.task_manager.get_processes()
    return jsonify(processes)

@bp.route('/api/tasks/kill', methods=['POST'])
@login_required
def kill_task():
    pid = request.json.get('pid')
    if not pid:
        return jsonify({'status': 'error', 'message': 'PID is required'}), 400
    success = current_app.task_manager.kill_process(pid)
    if success:
        return jsonify({'status': 'success', 'message': f'Process with PID {pid} killed successfully'})
    else:
        return jsonify({'status': 'error', 'message': f'Failed to kill process with PID {pid}'}), 500