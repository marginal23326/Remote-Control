import pyaudio
import queue
from threading import Lock, Thread


class AudioManager:
    def __init__(self, socketio):
        self.socketio = socketio
        self.audio_lock = Lock()

        self.configs = {
            "server": {
                "format": pyaudio.paInt16,
                "channels": 1,
                "rate": 48000,
                "chunk": 4096,
                "emit_event": "server_audio_data",
            },
            "client": {
                "format": pyaudio.paInt16,
                "channels": 1,
                "rate": 48000,
                "chunk": 512,
                "emit_event": "client_audio_data",
            },
        }

        self.streams = {
            "client_playback": {
                "active": False,
                "type": "output",
                "config": "client",
                "queue": queue.Queue(),
            },
            "server_mic": {
                "active": False,
                "type": "input",
                "config": "server",
                "device": "mic",
            },
            "server_system": {
                "active": False,
                "type": "input",
                "config": "server",
                "device": "system",
            },
        }

    def _get_system_audio_device(self, p):
        for i in range(p.get_device_count()):
            try:
                info = p.get_device_info_by_index(i)
                if "stereo mix" in info["name"].lower():
                    test_stream = p.open(
                        format=pyaudio.paInt16,
                        channels=1,
                        rate=44100,
                        input=True,
                        frames_per_buffer=1024,
                        input_device_index=i,
                        start=False,
                    )
                    test_stream.close()
                    return i
            except:
                continue
        raise RuntimeError(
            "Stereo Mix not found or disabled. To enable:\n"
            "1. Right-click the speaker icon in the taskbar; open Sound settings.\n"
            "2. Click 'Sound Control Panel' (Win 10) or 'More sound settings' (Win 11); go to the Recording tab.\n"
            "3. Right-click an empty area; select 'Show Disabled Devices'.\n"
            "4. Enable Stereo Mix."
        )

    def _create_stream(self, stream_name):
        state = self.streams[stream_name]
        config = self.configs[state["config"]]

        p = pyaudio.PyAudio()

        rate = config["rate"] // 2 if stream_name == "client_playback" else config["rate"]

        stream_args = {
            "format": config["format"],
            "channels": config["channels"],
            "rate": rate,
            "frames_per_buffer": config["chunk"],
            "input": state["type"] == "input",
            "output": state["type"] == "output",
        }

        if stream_name == "server_system":
            stream_args["input_device_index"] = self._get_system_audio_device(p)

        return p, p.open(**stream_args)

    def _stream_handler(self, sid, stream_name):
        p = None
        stream = None
        state = self.streams[stream_name]
        config = self.configs[state["config"]]

        try:
            with self.audio_lock:
                p, stream = self._create_stream(stream_name)

            while state["active"]:
                try:
                    if state["type"] == "input":
                        data = stream.read(config["chunk"], exception_on_overflow=False)
                        self.socketio.emit(config["emit_event"], data, room=sid)
                    else:
                        data = state["queue"].get(timeout=0.05)
                        if data:
                            stream.write(data)
                except queue.Empty:
                    continue
                except Exception as e:
                    print(f"Stream error ({stream_name}): {e}")
                    break
        finally:
            with self.audio_lock:
                if stream:
                    stream.stop_stream()
                    stream.close()
                if p:
                    p.terminate()

    def start_stream(self, sid, stream_name):
        with self.audio_lock:
            if stream_name not in self.streams:
                raise ValueError(f"Invalid stream: {stream_name}")

            state = self.streams[stream_name]
            if not state["active"]:
                state["active"] = True
                Thread(target=self._stream_handler, args=(sid, stream_name)).start()

    def stop_stream(self, stream_name):
        with self.audio_lock:
            if stream_name in self.streams:
                state = self.streams[stream_name]
                state["active"] = False

                if state["type"] == "output" and "queue" in state:
                    while not state["queue"].empty():
                        state["queue"].get()

                if stream_name == "client_playback":
                    state["queue"] = queue.Queue()

    def update_settings(self, settings):
        with self.audio_lock:
            config = self.configs["client" if settings["type"] == "client" else "server"]
            if "rate" in settings:
                config["rate"] = settings["rate"]
            if "chunk" in settings:
                config["chunk"] = settings["chunk"]
