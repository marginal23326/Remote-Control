from ctypes import POINTER, Structure, Union, WinDLL, c_long, c_ulong, pointer, sizeof
from ctypes.wintypes import BOOL, INT, UINT

# Windows API constants
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP = 0x0040
MOUSEEVENTF_WHEEL = 0x0800
MOUSEEVENTF_HWHEEL = 0x1000
MOUSEEVENTF_ABSOLUTE = 0x8000

# Input type constant
INPUT_MOUSE = 0

# Wheel delta constant
WHEEL_DELTA = 120

# Define pointer type
PUL = POINTER(c_ulong)


class POINT(Structure):
    _fields_ = [("x", c_long), ("y", c_long)]


class MOUSEINPUT(Structure):
    _fields_ = [
        ("dx", c_long),
        ("dy", c_long),
        ("mouseData", c_ulong),
        ("dwFlags", c_ulong),
        ("time", c_ulong),
        ("dwExtraInfo", PUL),
    ]


class INPUT_UNION(Union):
    _fields_ = [("mi", MOUSEINPUT)]


class INPUT(Structure):
    _fields_ = [("type", c_ulong), ("ii", INPUT_UNION)]


class MouseController:
    def __init__(self):
        self.user32 = WinDLL("user32", use_last_error=True)

        # Define SendInput
        self.user32.SendInput.argtypes = [UINT, POINTER(INPUT), INT]
        self.user32.SendInput.restype = UINT

        # For getting cursor position
        self.user32.GetCursorPos.argtypes = [POINTER(POINT)]
        self.user32.GetCursorPos.restype = BOOL

        # For screen metrics
        self.user32.GetSystemMetrics.argtypes = [INT]
        self.user32.GetSystemMetrics.restype = INT

        # Cache screen dimensions
        self.screen_width = self.user32.GetSystemMetrics(0)
        self.screen_height = self.user32.GetSystemMetrics(1)

        # Button mapping
        self.button_map = {
            "left": (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP),
            "right": (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP),
            "middle": (MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP),
        }

    def _send_input(self, input_struct):
        self.user32.SendInput(1, pointer(input_struct), sizeof(INPUT))

    def _to_windows_coordinates(self, x, y):
        return (
            int((x * 65536) // self.screen_width + 1),
            int((y * 65536) // self.screen_height + 1),
        )

    @property
    def position(self):
        point = POINT()
        self.user32.GetCursorPos(pointer(point))
        return (point.x, point.y)

    @position.setter
    def position(self, pos):
        x, y = int(pos[0]), int(pos[1])

        # Ensure coordinates are within screen bounds
        x = max(0, min(x, self.screen_width - 1))
        y = max(0, min(y, self.screen_height - 1))

        # Convert to Windows coordinates
        win_x, win_y = self._to_windows_coordinates(x, y)

        self._send_mouse_event(dx=win_x, dy=win_y, flags=MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE)

    def _send_mouse_event(self, dx=0, dy=0, data=0, flags=0):
        extra = c_ulong(0)
        ii_ = INPUT_UNION()
        ii_.mi = MOUSEINPUT(dx, dy, data, flags, 0, pointer(extra))
        command = INPUT(INPUT_MOUSE, ii_)
        self._send_input(command)

    def press(self, button):
        down_flag, _ = self.button_map.get(button, (None, None))
        if down_flag:
            self._send_mouse_event(flags=down_flag)

    def release(self, button):
        _, up_flag = self.button_map.get(button, (None, None))
        if up_flag:
            self._send_mouse_event(flags=up_flag)

    def scroll(self, dx, dy):
        for delta, flag in [(dy, MOUSEEVENTF_WHEEL), (dx, MOUSEEVENTF_HWHEEL)]:
            if delta != 0:
                self._send_mouse_event(data=delta * WHEEL_DELTA, flags=flag)
