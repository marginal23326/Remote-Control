from .stream_manager import StreamManager
from .mouse_controller import MouseController
import platform
import subprocess

class RemoteControlServer:
    def __init__(self):
        self.stream_manager = StreamManager()
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

    def execute_command(self, command):
        try:
            shell = platform.system() == 'Windows'
            process = subprocess.Popen(
                command, shell=shell,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = process.communicate(timeout=60)
            return {
                'status': 'success',
                'stdout': stdout,
                'stderr': stderr,
                'code': process.returncode
            }
        except subprocess.TimeoutExpired:
            return {'status': 'error', 'message': 'Command timed out after 60 seconds'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

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

        self.stream_manager.cursor_position = (x, y)
        from app import socketio
        socketio.emit('mouse_position', {'x': x, 'y': y})