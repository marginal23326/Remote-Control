# events/task_events.py
from flask_socketio import emit
from flask_login import login_required
from threading import Event


def register_task_events(socketio, task_manager):
    stop_event = Event()

    @socketio.on("task_poll_start")
    @login_required
    def handle_task_poll_start():
        stop_event.clear()

        while not stop_event.is_set():
            processes = task_manager.get_processes()
            emit("task_list", processes)
            stop_event.wait(timeout=2)

    @socketio.on("task_poll_stop")
    @login_required
    def handle_task_poll_stop():
        stop_event.set()
