# core/task_manager.py
import psutil


class TaskManager:
    def __init__(self):
        pass

    def get_processes(self):
        process_groups = {}

        for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_info", "ppid"]):
            try:
                if proc.info["name"] in ["System Idle Process", ""]:
                    continue

                process_info = {
                    "pid": proc.info["pid"],
                    "name": proc.info["name"],
                    "cpu_percent": proc.info["cpu_percent"],
                    "memory_usage": round(proc.info["memory_info"].rss / (1024 * 1024), 1),
                    "ppid": proc.info["ppid"],
                    "children": [],
                }

                base_name = process_info["name"]
                if base_name not in process_groups:
                    process_groups[base_name] = {
                        "processes": [],
                        "total_cpu": 0,
                        "total_memory": 0,
                    }

                process_groups[base_name]["processes"].append(process_info)
                process_groups[base_name]["total_cpu"] += process_info["cpu_percent"]
                process_groups[base_name]["total_memory"] += process_info["memory_usage"]

            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass

        grouped_processes = []
        for name, group in process_groups.items():
            if len(group["processes"]) > 1:
                parent = {
                    "pid": group["processes"][0]["pid"],
                    "name": name,
                    "cpu_percent": group["total_cpu"],
                    "memory_usage": group["total_memory"],
                    "is_group": True,
                    "expanded": False,
                    "children": group["processes"][1:],
                }
                grouped_processes.append(parent)
            else:
                grouped_processes.append(group["processes"][0])

        return {
            "processes": grouped_processes,
            "total_cpu_usage": psutil.cpu_percent(0.1),
            "total_memory_percentage": psutil.virtual_memory().percent,
        }

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
