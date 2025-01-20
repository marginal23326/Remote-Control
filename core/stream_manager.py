import base64
import json
import sys
import time
from threading import Event, Lock, Thread

import dxcam
import win32gui
from cv2 import IMWRITE_JPEG_QUALITY, imencode, resize
from flask import current_app


class StreamManager:
    def __init__(self, socketio):
        self.socketio = socketio
        self.stream_active = False
        self.stream_lock = Lock()
        self.settings_lock = Lock()
        self.current_stream_sid = None
        self.settings_updated = Event()
        self.stream_settings = {
            "quality": 100,
            "resolution_percentage": 100,
            "target_fps": 60,
        }
        self.current_fps = 0
        self.frame_times = []
        self.cursor_update_thread = None
        self.cursor_position = (0, 0)
        self.setup_camera()

    def update_settings(self, new_settings):
        with self.settings_lock:
            for key in ["quality", "resolution_percentage"]:
                if key in new_settings:
                    self.stream_settings[key] = max(1, min(100, int(new_settings[key])))

            if "target_fps" in new_settings:
                new_fps = 60 if new_settings["target_fps"] is None else int(new_settings["target_fps"])
                if new_fps != self.stream_settings["target_fps"]:
                    self.stream_settings["target_fps"] = new_fps
                    if self.camera and self.camera.is_capturing:
                        self.camera.stop()
                        self.camera.start(target_fps=self.stream_settings["target_fps"], video_mode=True)
                        self.settings_updated.set()

    def setup_camera(self):
        self.camera = dxcam.create(output_idx=0, output_color="BGR")
        if not self.camera:
            print("\nError: Failed to initialize camera.")
            sys.exit()

        test_frame = self.camera.grab()
        if test_frame is not None:
            self.native_height, self.native_width = test_frame.shape[:2]
        else:
            print("Error: Failed to get a test frame from the camera.")
            sys.exit()

    def __del__(self):
        if hasattr(self, "camera") and self.camera and self.camera.is_capturing:
            try:
                self.camera.stop()
            except Exception as e:
                print(f"Camera cleanup error: {e}")

    def get_screenshot(self):
        try:
            if self.camera and self.camera.is_capturing:
                self.camera.stop()
            screenshot = self.camera.grab()
            if screenshot is None:
                return None

            _, buffer = imencode(".png", screenshot)
            return base64.b64encode(buffer).decode()
        except Exception as e:
            print(f"Screenshot error: {e}")
            return None

    def update_fps(self):
        current_time = time.time()
        self.frame_times.append(current_time)

        while self.frame_times and self.frame_times[0] < current_time - 1:
            self.frame_times.pop(0)

        self.current_fps = len(self.frame_times)

    def stream_generator(self, sid):
        if not self.camera:
            self.setup_camera()

        try:
            self.camera.start(target_fps=self.stream_settings["target_fps"], video_mode=True)
            self.start_cursor_updates()
        except Exception as e:
            print(f"Failed to start camera: {e}")
            self.setup_camera()
            if not self.camera.start(target_fps=self.stream_settings["target_fps"], video_mode=True):
                return

        while self.stream_active and self.current_stream_sid == sid:
            try:
                if self.settings_updated.is_set():
                    self.settings_updated.clear()
                    continue

                screenshot = self.camera.get_latest_frame()
                if screenshot is None:
                    continue

                with self.settings_lock:
                    resolution_percentage = self.stream_settings["resolution_percentage"]
                    quality = self.stream_settings["quality"]

                if resolution_percentage < 100:
                    new_width = int(self.native_width * (resolution_percentage / 100))
                    new_height = int(self.native_height * (resolution_percentage / 100))
                    screenshot = resize(screenshot, (new_width, new_height))

                _, buffer = imencode(".jpg", screenshot, [int(IMWRITE_JPEG_QUALITY), quality])
                img_str = base64.b64encode(buffer).decode()

                self.update_fps()

                yield f"data: {json.dumps({
                    'image': img_str,
                    'fps': self.current_fps,
                    'active_window': self.get_active_window_title()
                })}\n\n"

            except Exception as e:
                print(f"Stream error: {e}")
                break

        if self.camera and self.camera.is_capturing:
            self.camera.stop()
        self.cursor_update_thread = None

    def get_current_settings(self):
        return {
            **self.stream_settings,
            "native_width": self.native_width,
            "native_height": self.native_height,
            "current_resolution_percentage": self.stream_settings["resolution_percentage"],
            "current_fps": self.stream_settings["target_fps"] or "Unlimited",
        }

    def get_active_window_title(self):
        try:
            return win32gui.GetWindowText(win32gui.GetForegroundWindow())
        except Exception:
            return ""

    def start_cursor_updates(self):
        if self.cursor_update_thread is None or not self.cursor_update_thread.is_alive():
            self.cursor_update_thread = Thread(
                target=self._cursor_update_loop,
                args=(current_app._get_current_object(),),
                daemon=True,
            )
            self.cursor_update_thread.start()

    def _cursor_update_loop(self, app):
        with app.app_context():
            while self.stream_active:
                if self.current_stream_sid:
                    try:
                        x, y = app.input_manager.mouse.position
                        self.socketio.emit("mouse_position", {"x": x, "y": y})
                    except Exception as e:
                        print(f"Error getting or emitting mouse position: {e}")

                target_fps = self.stream_settings["target_fps"] or 60
                sleep_time = 1.0 / target_fps if target_fps > 0 else 0.02
                time.sleep(sleep_time)
