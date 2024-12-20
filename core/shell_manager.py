# core/shell_manager.py

import subprocess
import platform
import threading
import queue
import time
import os
import re

class ShellManager:
    def __init__(self):
        self.shells = {}
        self.output_queues = {}
        self.current_paths = {}  # Store current path for each session

    def create_session(self, session_id):
        if platform.system() == 'Windows':
            try:
                process = subprocess.Popen(
                    'cmd.exe',
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    bufsize=0,
                    universal_newlines=True,
                    shell=True,
                    cwd="C:\\",
                    startupinfo=subprocess.STARTUPINFO()
                )
                
                self.shells[session_id] = {
                    'process': process,
                    'cwd': "C:\\"
                }
                self.current_paths[session_id] = "C:\\"
                self.output_queues[session_id] = queue.Queue()
                
                # Start output monitoring threads
                threading.Thread(
                    target=self._monitor_output,
                    args=(session_id, process.stdout, False),
                    daemon=True
                ).start()
                
                threading.Thread(
                    target=self._monitor_output,
                    args=(session_id, process.stderr, True),
                    daemon=True
                ).start()
                
                return True
            except Exception as e:
                print(f"Failed to create shell session: {str(e)}")
                return False

    def _monitor_output(self, session_id, pipe, is_stderr):
        try:
            buffer = ""
            while session_id in self.shells:
                char = pipe.read(1)
                if not char:
                    time.sleep(0.01)
                    continue
                
                buffer += char
                
                # Update current path when detected in output
                if not is_stderr:
                    self._check_and_update_path(session_id, buffer)
                
                # If we have a complete line or enough characters, send it
                if char == '\n' or len(buffer) >= 80:
                    if buffer.strip():
                        self.output_queues[session_id].put(buffer)
                    buffer = ""
                
            # Flush any remaining buffer
            if buffer and session_id in self.shells:
                self.output_queues[session_id].put(buffer)
                
        except Exception as e:
            print(f"Error monitoring output: {str(e)}")

    def _check_and_update_path(self, session_id, text):
        # Pattern to match Windows prompt (e.g., "C:\Users>")
        prompt_pattern = r'^([A-Z]:\\[^>]*?)>'
        match = re.search(prompt_pattern, text)
        if match:
            new_path = match.group(1)
            if session_id in self.current_paths and self.current_paths[session_id] != new_path:
                self.current_paths[session_id] = new_path
                # Send special message to update prompt
                self.output_queues[session_id].put(f"__UPDATE_PROMPT__{new_path}>")

    def write_to_shell(self, session_id, data):
        if session_id not in self.shells:
            return False
            
        shell = self.shells[session_id]
        try:
            # Handle special commands
            if data.strip().lower() == 'python':
                # For Python REPL, use -i flag for interactive mode
                self._cleanup_current_process(session_id)
                self._start_python_repl(session_id)
                return True
            
            # Ensure command ends with newline
            if not data.endswith('\n'):
                data += '\n'
            
            # Write to process stdin
            shell['process'].stdin.write(data)
            shell['process'].stdin.flush()
            return True
        except Exception as e:
            print(f"Error writing to shell: {str(e)}")
            return False

    def _cleanup_current_process(self, session_id):
        if session_id in self.shells:
            try:
                self.shells[session_id]['process'].terminate()
                time.sleep(0.1)  # Give it a moment to clean up
            except:
                pass

    def _start_python_repl(self, session_id):
        try:
            process = subprocess.Popen(
                ['python', '-i'],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=0,
                universal_newlines=True,
                shell=True,
                cwd=self.current_paths[session_id]
            )
            
            self.shells[session_id]['process'] = process
            
            # Clear existing threads and start new ones
            self.output_queues[session_id] = queue.Queue()
            
            threading.Thread(
                target=self._monitor_output,
                args=(session_id, process.stdout, False),
                daemon=True
            ).start()
            
            threading.Thread(
                target=self._monitor_output,
                args=(session_id, process.stderr, True),
                daemon=True
            ).start()
            
        except Exception as e:
            print(f"Error starting Python REPL: {str(e)}")
            self.output_queues[session_id].put(f"Error starting Python REPL: {str(e)}\n")

    def get_current_path(self, session_id):
        return self.current_paths.get(session_id, "C:\\")

    def read_output(self, session_id, timeout=0.1):
        if session_id not in self.output_queues:
            return None
            
        output = []
        try:
            while True:
                try:
                    line = self.output_queues[session_id].get_nowait()
                    output.append(line)
                except queue.Empty:
                    break
        except Exception as e:
            print(f"Error reading output: {str(e)}")
            
        return ''.join(output) if output else None

    def cleanup_session(self, session_id):
        if session_id not in self.shells:
            return
            
        try:
            shell = self.shells[session_id]
            process = shell['process']
            
            if process.stdin:
                process.stdin.close()
            if process.stdout:
                process.stdout.close()
            if process.stderr:
                process.stderr.close()
                
            process.terminate()
            
            if session_id in self.output_queues:
                del self.output_queues[session_id]
            if session_id in self.current_paths:
                del self.current_paths[session_id]
                
            del self.shells[session_id]
        except Exception as e:
            print(f"Error cleaning up session: {str(e)}")

# Create singleton instance
shell_manager = ShellManager()