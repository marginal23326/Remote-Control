import time
from ctypes import POINTER, Structure, Union, WinDLL, c_int, c_uint, c_ulong, c_ushort, pointer, sizeof
from ctypes.wintypes import DWORD, LONG, UINT, WORD, WPARAM

# KeyBdInput Flags
KEYEVENTF_EXTENDEDKEY = 0x0001
KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_SCANCODE = 0x0008
KEYEVENTF_UNICODE = 0x0004

EXTENDED_KEY_FLAG = 1024

ULONG_PTR = WPARAM

# Input type constant
INPUT_KEYBOARD = 1

# Define pointer type
PUL = POINTER(c_ulong)

class KEYBDINPUT(Structure):
    _fields_ = [
        ("wVk", c_ushort),
        ("wScan", c_ushort),
        ("dwFlags", c_ulong),
        ("time", c_ulong),
        ("dwExtraInfo", PUL),
    ]

class MOUSEINPUT(Structure):
    _fields_ = (("dx", LONG),
                ("dy", LONG),
                ("mouseData", DWORD),
                ("dwFlags", DWORD),
                ("time", DWORD),
                ("dwExtraInfo", ULONG_PTR))

class HARDWAREINPUT(Structure):
    _fields_ = (("uMsg", DWORD),
                ("wParamL", WORD),
                ("wParamH", WORD))

class InputUnion(Union):
    _fields_ = [
        ("ki", KEYBDINPUT),
        ("mi", MOUSEINPUT),
        ("hi", HARDWAREINPUT),
    ]

class INPUT(Structure):
    _fields_ = [
        ("type", c_ulong),
        ("ii", InputUnion),
    ]

class KeyboardController:
    def __init__(self):
        self.user32 = WinDLL("user32", use_last_error=True)

        # Define SendInput
        self.user32.SendInput.argtypes = [c_uint, POINTER(INPUT), c_int]
        self.user32.SendInput.restype = c_uint

        # For mapping virtual keys
        self.user32.MapVirtualKeyW.argtypes = [UINT, UINT]
        self.user32.MapVirtualKeyW.restype = UINT

        # Keyboard scan code mappings
        self._init_keyboard_mapping()
        self._init_shift_mapping()

    def _init_keyboard_mapping(self):
        self.keyboard_map = {
            # Function keys
            "f1": 0x3B, "f2": 0x3C, "f3": 0x3D, "f4": 0x3E,
            "f5": 0x3F, "f6": 0x40, "f7": 0x41, "f8": 0x42,
            "f9": 0x43, "f10": 0x44, "f11": 0x57, "f12": 0x58,

            # System keys
            "escape": 0x01, "esc": 0x01,
            "tab": 0x0F,
            "enter": 0x1C, "return": 0x1C,
            " ": 0x39, "space": 0x39,
            "backspace": 0x0E,
            "delete": 0xD3 + 1024, "del": 0xD3 + 1024,
            "insert": 0xD2 + 1024,
            "printscreen": 0xB7, "prtsc": 0xB7,
            "scrolllock": 0x46,
            "pause": 0xC5,
            "capslock": 0x3A,

            # Modifiers
            "shift": 0x2A, "shiftleft": 0x2A, "shiftright": 0x36,
            "ctrl": 0x1D, "ctrlleft": 0x1D, "ctrlright": 0x9D + 1024,
            "alt": 0x38, "altleft": 0x38, "altright": 0xB8 + 1024,
            "win": 0xDB + 1024, "winleft": 0xDB + 1024, "winright": 0xDC + 1024,
            "apps": 0xDD + 1024,

            # Navigation (using MapVirtualKeyW as arrow key scancodes can vary based on the hardware.)
            "up": self.user32.MapVirtualKeyW(0x26, 0) + 1024,
            "down": self.user32.MapVirtualKeyW(0x28, 0) + 1024,
            "left": self.user32.MapVirtualKeyW(0x25, 0) + 1024,
            "right": self.user32.MapVirtualKeyW(0x27, 0) + 1024,
            "home": 0xC7 + 1024,
            "end": 0xCF + 1024,
            "pageup": 0xC9 + 1024,
            "pagedown": 0xD1 + 1024,

            # Basic characters
            "`": 0x29,
            "-": 0x0C,
            "=": 0x0D,
            "[": 0x1A,
            "]": 0x1B,
            "\\": 0x2B,
            ";": 0x27,
            "'": 0x28,
            ",": 0x33,
            ".": 0x34,
            "/": 0x35,

            # Numbers
            "1": 0x02,
            "2": 0x03,
            "3": 0x04,
            "4": 0x05,
            "5": 0x06,
            "6": 0x07,
            "7": 0x08,
            "8": 0x09,
            "9": 0x0A,
            "0": 0x0B,

            # Basic letters
            "a": 0x1E, "b": 0x30, "c": 0x2E, "d": 0x20, "e": 0x12,
            "f": 0x21, "g": 0x22, "h": 0x23, "i": 0x17, "j": 0x24,
            "k": 0x25, "l": 0x26, "m": 0x32, "n": 0x31, "o": 0x18,
            "p": 0x19, "q": 0x10, "r": 0x13, "s": 0x1F, "t": 0x14,
            "u": 0x16, "v": 0x2F, "w": 0x11, "x": 0x2D, "y": 0x15,
            "z": 0x2C,
        }

    def _init_shift_mapping(self):
        self.shift_chars = set('~!@#$%^&*()_+{}|:"<>?ABCDEFGHIJKLMNOPQRSTUVWXYZ')
        self.char_to_base = {
            "~": "`", "!": "1", "@": "2", "#": "3", "$": "4", "%": "5",
            "^": "6", "&": "7", "*": "8", "(": "9", ")": "0", "_": "-",
            "+": "=", "{": "[", "}": "]", "|": "\\", ":": ";", '"': "'",
            "<": ",", ">": ".", "?": "/",
        }

    def _send_input(self, input_struct):
        self.user32.SendInput(1, pointer(input_struct), sizeof(INPUT))

    def _send_keyboard_event(self, scan_code, flags=0):
        extra = c_ulong(0)
        ii_ = InputUnion()
        ii_.ki = KEYBDINPUT(0, scan_code, flags | KEYEVENTF_SCANCODE, 0, pointer(extra))
        command = INPUT(INPUT_KEYBOARD, ii_)
        self._send_input(command)

    def _needs_shift(self, char):
        return char in self.shift_chars

    def _get_base_char(self, char):
        if char.isupper():
            return char.lower()
        return self.char_to_base.get(char, char)

    def press(self, key):
        if not key:
            return False

        key = str(key)
        if len(key) == 1 and self._needs_shift(key):
            base_char = self._get_base_char(key)
            self.press("shift")
            return self._press_base(base_char)

        return self._press_base(key.lower())

    def _press_base(self, key):
        if key not in self.keyboard_map:
            return False

        scan_code = self.keyboard_map[key]
        flags = KEYEVENTF_EXTENDEDKEY if scan_code > EXTENDED_KEY_FLAG else 0
        if scan_code > EXTENDED_KEY_FLAG:
            scan_code -= EXTENDED_KEY_FLAG

        self._send_keyboard_event(scan_code, flags)
        return True

    def release(self, key):
        if not key:
            return False

        key = str(key)
        if len(key) == 1 and self._needs_shift(key):
            base_char = self._get_base_char(key)
            success = self._release_base(base_char)
            self.release("shift")
            return success

        return self._release_base(key.lower())

    def _release_base(self, key):
        if key not in self.keyboard_map:
            return False

        scan_code = self.keyboard_map[key]
        flags = KEYEVENTF_KEYUP
        if scan_code > EXTENDED_KEY_FLAG:
            scan_code -= EXTENDED_KEY_FLAG
            flags |= KEYEVENTF_EXTENDEDKEY

        self._send_keyboard_event(scan_code, flags)
        return True

    def _send_unicode(self, char):
        surrogates = bytearray(char.encode("utf-16le"))

        for i in range(0, len(surrogates), 2):
            higher, lower = surrogates[i:i+2]
            extra = c_ulong(0)
            ii_ = InputUnion()
            ii_.ki = KEYBDINPUT(0, (lower << 8) + higher, KEYEVENTF_UNICODE, 0, pointer(extra))
            self._send_input(INPUT(INPUT_KEYBOARD, ii_))

            ii_.ki = KEYBDINPUT(0, (lower << 8) + higher, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, 0, pointer(extra))
            self._send_input(INPUT(INPUT_KEYBOARD, ii_))

    def type_string(self, text, interval=0.0):
        for char in text:
            if char in self.keyboard_map or char in self.shift_chars:
                self.press(char)
                self.release(char)
            else:
                self._send_unicode(char)

            if interval > 0:
                time.sleep(interval)

    def shortcut(self, keys):
        if not keys:
            return

        key_list = [k.strip() for k in keys.split("+")]

        for key in key_list:
            self.press(key)

        for key in reversed(key_list):
            self.release(key)
