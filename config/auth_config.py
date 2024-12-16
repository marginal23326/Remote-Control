from werkzeug.security import generate_password_hash

USER_CONFIG = {
    'username': 'admin',
    'password_hash': generate_password_hash('ali')
}