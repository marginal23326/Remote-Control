from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required
import keyboard

bp = Blueprint('input', __name__)

@bp.route('/api/keyboard/shortcut', methods=['POST'])
@login_required
def keyboard_shortcut():
    
    data = request.json
    shortcut = data.get('shortcut')
    modifiers = data.get('modifiers', [])

    try:
        if modifiers:
            keyboard.press_and_release('+'.join(modifiers + [shortcut]))
        elif shortcut in current_app.server.shortcuts:
            keyboard.press_and_release(current_app.server.shortcuts[shortcut])
        else:
            keyboard.press_and_release(shortcut)
        return jsonify({'status': 'success'})
    except:
        return jsonify({'status': 'error', 'message': 'Invalid shortcut'})

@bp.route('/api/keyboard/type', methods=['POST'])
@login_required
def keyboard_type():
    keyboard.write(request.json.get('text'))
    return jsonify({'status': 'success'})