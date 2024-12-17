from flask import Flask
from flask_login import LoginManager, UserMixin
from config.server_config import Config
from config.auth_config import USER_CONFIG
from core.remote_control import RemoteControlServer
from core.audio_manager import AudioManager
from routes import auth_routes, stream_routes, system_routes, file_routes, input_routes
from events import register_events
from extensions import socketio, init_app

class User(UserMixin):
    def __init__(self, id):
        self.id = id

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    init_app(app)  # Initialize SocketIO
    login_manager = LoginManager(app)
    login_manager.login_view = 'auth.login'

    server = RemoteControlServer()
    audio_manager = AudioManager(socketio)

    app.server = server
    app.audio_manager = audio_manager

    # Register blueprints
    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(stream_routes.bp)
    app.register_blueprint(system_routes.bp)
    app.register_blueprint(file_routes.bp)
    app.register_blueprint(input_routes.bp)

    # Register socket event handlers
    register_events(socketio, server, audio_manager)

    @login_manager.user_loader
    def load_user(user_id):
        if user_id == USER_CONFIG['username']:
            return User(user_id)
        return None

    return app, socketio