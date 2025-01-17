from flask import Flask
from flask_login import LoginManager, UserMixin
from config.server_config import Config
from config.auth_config import load_user_config
from core.input_manager import InputManager
from core.audio_manager import AudioManager
from core.stream_manager import StreamManager
from core.shell_manager import ShellManager
from core.file_manager import FileManager
from core.task_manager import TaskManager
from routes import auth_routes, stream_routes, system_routes, file_routes, input_routes, shell_routes, task_routes
from events import register_events
from extensions import socketio, init_app


class User(UserMixin):
    def __init__(self, id):
        self.id = id


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    init_app(app)
    login_manager = LoginManager(app)
    login_manager.login_view = "auth.login"

    audio_manager = AudioManager(socketio)
    stream_manager = StreamManager(socketio)
    input_manager = InputManager()
    shell_manager = ShellManager()
    file_manager = FileManager()
    task_manager = TaskManager()

    app.input_manager = input_manager
    app.audio_manager = audio_manager
    app.stream_manager = stream_manager
    app.shell_manager = shell_manager
    app.file_manager = file_manager
    app.task_manager = task_manager

    # Register blueprints
    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(stream_routes.bp)
    app.register_blueprint(system_routes.bp)
    app.register_blueprint(file_routes.bp)
    app.register_blueprint(input_routes.bp)
    app.register_blueprint(shell_routes.bp)
    app.register_blueprint(task_routes.bp)

    # Register socket event handlers
    register_events(socketio, input_manager, audio_manager, shell_manager, task_manager)

    @login_manager.user_loader
    def load_user(user_id):
        user_config = load_user_config()
        if user_config and user_id == user_config["username"]:
            return User(user_id)
        return None

    return app
