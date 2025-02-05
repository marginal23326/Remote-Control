from flask import Flask
from flask_login import LoginManager, UserMixin

from config.auth_config import load_user_config
from config.server_config import Config
from core.ai_service import AIService
from core.audio_manager import AudioManager
from core.file_manager import FileManager
from core.input_manager import InputManager
from core.shell_manager import ShellManager
from core.stream_manager import StreamManager
from core.task_manager import TaskManager
from events import register_events
from extensions import init_app, socketio
from routes import ai_routes, auth_routes, file_routes, input_routes, shell_routes, stream_routes, system_routes, task_routes


class User(UserMixin):
    def __init__(self, user_id):
        self.user_id = user_id


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

    # Initialize AI Service
    ai_service = AIService(socketio, file_manager, input_manager, shell_manager, stream_manager, task_manager,)
    app.ai_service = ai_service

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
    app.register_blueprint(ai_routes.bp)

    # Register socket event handlers
    register_events(socketio, input_manager, audio_manager, shell_manager, task_manager)

    @login_manager.user_loader
    def load_user(user_id):
        user_config = load_user_config()
        if user_config and user_id == user_config["username"]:
            return User(user_id)
        return None

    return app