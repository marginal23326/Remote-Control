from flask_socketio import SocketIO

socketio = SocketIO()


def init_app(app):
    socketio.init_app(app, cors_allowed_origins="*", async_mode='threading', max_http_buffer_size=1000000000)
