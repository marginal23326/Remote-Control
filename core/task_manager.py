# core/task_manager.py
import psutil

class TaskManager:
    def __init__(self):
        pass

    def get_processes(self):
        processes = []
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                processes.append({
                    'pid': proc.info['pid'],
                    'name': proc.info['name']
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        return processes

    def kill_process(self, pid):
        try:
            process = psutil.Process(pid)
            process.kill()
            return True
        except psutil.NoSuchProcess:
            print(f"No process found with PID: {pid}")
            return False
        except psutil.AccessDenied:
            print(f"Access denied to kill process with PID: {pid}")
            return False
        except Exception as e:
            print(f"Error killing process with PID {pid}: {e}")
            return False