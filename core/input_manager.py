from .mouse_controller import MouseController
from .keyboard_controller import KeyboardController


class InputManager:
    def __init__(self):
        self.mouse = MouseController()
        self.keyboard = KeyboardController()
        self.shortcuts = {
            "copy": "ctrl+c", "paste": "ctrl+v", "cut": "ctrl+x",
            "undo": "ctrl+z", "redo": "ctrl+y", "save": "ctrl+s",
            "find": "ctrl+f", "selectall": "ctrl+a",
        }

    def handle_mouse_event(self, data):
        event_type = data["type"]
        x, y = int(data["x"]), int(data["y"])
        self.mouse.position = (x, y)

        if event_type == "click":
            button = data["button"]
            if button in self.mouse.button_map:
                if data["pressed"]:
                    self.mouse.press(button)
                else:
                    self.mouse.release(button)
        elif event_type == "scroll":
            self.mouse.scroll(int(data["dx"]), int(data["dy"]))

    def handle_keyboard_shortcut(self, shortcut, modifiers=None):
        try:
            if shortcut == "" and modifiers:
                for modifier in modifiers:
                    self.keyboard.press(modifier)
                for modifier in reversed(modifiers):
                    self.keyboard.release(modifier)
            elif modifiers:
                self.keyboard.shortcut("+".join(modifiers + [shortcut]))
            elif shortcut in self.shortcuts:
                self.keyboard.shortcut(self.shortcuts[shortcut])
            else:
                self.keyboard.shortcut(shortcut)
            return True
        except Exception as e:
            print(f"Error in keyboard shortcut: {e}")
            return False

    def type_text(self, text, interval=0.0):
        try:
            self.keyboard.type_string(text, interval)
            return True
        except Exception as e:
            print(f"Error typing text: {e}")
            return False
