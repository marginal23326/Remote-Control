# core/shell_manager.py
import queue
import threading
from winpty import PtyProcess


class ShellManager:
    def __init__(self):
        self.shells = {}
        self.output_queues = {}

    def create_session(self, session_id, cols=80, rows=24):
        try:
            # Create PTY instance using ConPTY
            pty = PtyProcess.spawn("cmd.exe", cwd="C:\\", dimensions=(rows, cols))

            self.shells[session_id] = {"pty": pty, "cwd": "C:\\"}

            self.output_queues[session_id] = queue.Queue()

            # Start output monitoring thread
            threading.Thread(
                target=self._monitor_output, args=(session_id,), daemon=True
            ).start()

            return True
        except Exception as e:
            print(f"Failed to create shell session: {str(e)}")
            return False

    def _monitor_output(self, session_id):
        pty = self.shells[session_id]["pty"]
        while session_id in self.shells:
            try:
                data = pty.read()
                if data:
                    self.output_queues[session_id].put(data)
            except EOFError:
                print(f"Console for {session_id} closed.")
                self.cleanup_session(session_id)
            except Exception as e:
                print(f"Error reading output: {str(e)}")
                break

    def write_to_shell(self, session_id, data):
        if session_id not in self.shells:
            return False
        try:
            pty = self.shells[session_id]["pty"]
            pty.write(data)
            return True
        except Exception as e:
            print(f"Error writing to shell: {str(e)}")
            return False

    def read_output(self, session_id):
        if session_id not in self.output_queues:
            return None

        output = []
        try:
            while True:
                try:
                    data = self.output_queues[session_id].get_nowait()
                    output.append(data)
                except queue.Empty:
                    break
        except Exception as e:
            print(f"Error reading output: {str(e)}")

        return "".join(output) if output else None

    def resize_terminal(self, session_id, cols, rows):
        if session_id in self.shells:
            try:
                self.shells[session_id]["pty"].setwinsize(rows, cols)
            except Exception as e:
                print(f"Error resizing terminal: {str(e)}")

    def cleanup_session(self, session_id):
        if session_id not in self.shells:
            return

        try:
            shell = self.shells[session_id]
            shell["pty"].close()
            del self.shells[session_id]
            del self.output_queues[session_id]
        except Exception as e:
            print(f"Error cleaning up session: {str(e)}")
