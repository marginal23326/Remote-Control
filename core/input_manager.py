# core/input_manager.py
from .mouse_controller import MouseController

class InputManager:
    def __init__(self):
        self.mouse = MouseController()
        self.shortcuts = {
            'copy': 'ctrl+c', 'paste': 'ctrl+v', 'cut': 'ctrl+x',
            'undo': 'ctrl+z', 'redo': 'ctrl+y', 'save': 'ctrl+s',
            'find': 'ctrl+f', 'selectall': 'ctrl+a', 'tab': 'tab',
            'alt-tab': 'alt+tab', 'win': 'windows', 'del': 'delete',
            'backspace': 'backspace', 'esc': 'escape', 'enter': 'enter',
            'up': 'up', 'down': 'down', 'left': 'left', 'right': 'right',
            'pgup': 'page up', 'pgdown': 'page down', 'home': 'home',
            'end': 'end', 'space': 'space'
        }

    def handle_mouse_event(self, data):
        event_type = data['type']
        x, y = int(data['x']), int(data['y'])
        self.mouse.position = (x, y)

        if event_type == 'click':
            button = data['button']
            if button in self.mouse.button_map:
                if data['pressed']:
                    self.mouse.press(button)
                else:
                    self.mouse.release(button)
        elif event_type == 'scroll':
            self.mouse.scroll(int(data['dx']), int(data['dy']))