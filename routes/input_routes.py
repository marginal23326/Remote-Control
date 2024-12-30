from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required

bp = Blueprint('input', __name__)

@bp.route('/api/keyboard/shortcut', methods=['POST'])
@login_required
def keyboard_shortcut():
    data = request.json
    shortcut = data.get('shortcut')
    modifiers = data.get('modifiers', [])
    
    success = current_app.input_manager.handle_keyboard_shortcut(shortcut, modifiers)
    return jsonify({'status': 'success' if success else 'error'})

@bp.route('/api/keyboard/type', methods=['POST'])
@login_required
def keyboard_type():
    success = current_app.input_manager.type_text(request.json.get('text'))
    return jsonify({'status': 'success' if success else 'error'})