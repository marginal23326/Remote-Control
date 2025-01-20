from flask import Blueprint, redirect, render_template, request, url_for
from flask_login import login_required, login_user, logout_user
from werkzeug.security import check_password_hash

from config.auth_config import load_user_config
from extensions import socketio


class User:
    def __init__(self, user_id):
        self.id = user_id

    @property
    def is_authenticated(self):
        return True

    @property
    def is_active(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def get_id(self):
        return str(self.id)


bp = Blueprint("auth", __name__)


@bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        user_config = load_user_config()

        if user_config and username == user_config["username"] and check_password_hash(user_config["password_hash"], password):
            user = User(username)
            login_user(user)
            socketio.emit("auth_status", {"authenticated": True})
            return redirect(url_for("auth.index"))
        return render_template("login.html", error="Invalid credentials")
    return render_template("login.html", error=None)


@bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("auth.login"))


@bp.route("/")
@login_required
def index():
    return render_template("index.html")
