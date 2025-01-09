# events/task_events.py
from flask_socketio import emit
from flask_login import login_required
import time

def register_task_events(socketio, task_manager):
    @socketio.on('task_poll')
    @login_required
    def handle_task_poll():
        while True:
            processes = task_manager.get_processes()
            emit('task_list', processes)
            time.sleep(5)