import os
import platform
import socket
import subprocess
import time

import psutil
import requests
from win32api import GetSystemMetrics


class SystemManager:
    def _run_command(self, command):
        return subprocess.check_output(command, creationflags=subprocess.CREATE_NO_WINDOW).decode()

    def get_windows_edition(self):
        return self._run_command("wmic os get Caption").split("\n")[1].strip().replace("Microsoft ", "")

    def get_processor_info(self):
        return self._run_command("wmic cpu get name").split("\n")[1].strip()

    def get_architecture(self):
        return self._run_command("wmic os get osarchitecture").split("\n")[1].strip()

    def get_gpu_info(self):
        output = self._run_command("wmic path win32_VideoController get name")
        return [line.strip() for line in output.split("\n") if line.strip() and "name" not in line.lower()]

    def get_antivirus_info(self):
        try:
            cmd = "wmic /node:localhost /namespace:\\\\root\\SecurityCenter2 path AntiVirusProduct get displayName"
            output = self._run_command(cmd)
            antiviruses = [line.strip() for line in output.split("\n") if line.strip() and "displayname" not in line.lower()]
        except Exception:
            return ["N/A"]
        else:
            return antiviruses if antiviruses else ["N/A"]

    def get_firewall_info(self):
        output = self._run_command("netsh advfirewall show allprofiles state")
        return "Enabled" if "ON" in output else "Disabled"

    def get_cpu_details(self):
        cmd = "wmic cpu get NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed,CurrentClockSpeed /format:value"
        output = self._run_command(cmd)
        details = dict(line.split("=", 1) for line in output.splitlines() if "=" in line)

        return {
            "cores": details.get("NumberOfCores", "N/A"),
            "threads": details.get("NumberOfLogicalProcessors", "N/A"),
            "base_speed": f"{int(details.get('CurrentClockSpeed', 0)) / 1000:.2f} GHz",
            "max_speed": f"{int(details.get('MaxClockSpeed', 0)) / 1000:.2f} GHz",
        }

    def get_disk_info(self):
        output = self._run_command("wmic diskdrive get Model,Size")
        disks = []
        for line in output.splitlines():
            if "Model" not in line and line.strip():
                parts = line.strip().rsplit(" ", 1)
                if len(parts) == 2:
                    model, size = parts
                    size_gb = int(size) / (1024**3)
                    disks.append(f"{model.strip()} ({size_gb:.0f}GB)")
        return disks if disks else ["N/A"]

    def get_battery_info(self):
        cmd = "wmic path win32_battery get BatteryStatus,EstimatedChargeRemaining"
        output = self._run_command(cmd)
        lines = [line for line in output.splitlines() if line.strip() and "BatteryStatus" not in line]
        if lines:
            status, charge = lines[0].split()
            status_map = {1: "Discharging", 2: "AC Power", 3: "Fully Charged", 4: "Low", 5: "Critical"}
            return f"{status_map.get(int(status), 'Unknown')} ({charge}% remaining)"
        return "No battery detected"

    def get_uptime(self):
        boot_time = psutil.boot_time()
        now = time.time()
        uptime_seconds = int(now - boot_time)
        days = uptime_seconds // 86400
        hours = (uptime_seconds % 86400) // 3600
        minutes = (uptime_seconds % 3600) // 60
        seconds = uptime_seconds % 60
        return f"{days}d : {hours}h : {minutes}m : {seconds}s"

    def get_lan_ip(self):
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]

    def get_network_info(self):
        try:
            ip_info = requests.get("https://api.ipapi.is/", timeout=10).json()
            wan_ip = ip_info.get("ip", "N/A")
            isp = ip_info.get("asn", {}).get("org", "N/A")
            asn = str(ip_info.get("asn", {}).get("asn", "N/A"))
            country = ip_info.get("location", {}).get("country", "N/A")
            timezone = ip_info.get("location", {}).get("timezone", "N/A")
        except Exception:
            wan_ip = isp = asn = country = timezone = "N/A"

        return {
            "lan_ip": self.get_lan_ip(),
            "wan_ip": wan_ip,
            "isp": isp,
            "asn": asn,
            "country": country,
            "timezone": timezone,
        }

    def get_system_info(self):
        disk = psutil.disk_usage("/")
        network_info = self.get_network_info()
        cpu_details = self.get_cpu_details()

        mac_address = next(
            (addr.address for n, addrs in psutil.net_if_addrs().items()
             for addr in addrs if addr.family == psutil.AF_LINK
             and psutil.net_if_stats()[n].isup),
            "N/A",
        )

        return {
            "os": self.get_windows_edition(),
            "architecture": self.get_architecture(),
            "processor": self.get_processor_info(),
            "cpu_cores": cpu_details["cores"],
            "cpu_threads": cpu_details["threads"],
            "cpu_base_speed": cpu_details["base_speed"],
            "cpu_max_speed": cpu_details["max_speed"],
            "memory": f"{psutil.virtual_memory().total // (1024 * 1024)} MB",
            "gpu": self.get_gpu_info(),
            "monitors": f"Display ({GetSystemMetrics(0)}x{GetSystemMetrics(1)})",
            "disks": self.get_disk_info(),
            "battery": self.get_battery_info(),
            "username": os.getlogin(),
            "pc_name": platform.node(),
            "domain": os.environ.get("USERDOMAIN", "-"),
            "hostname": socket.gethostname(),
            "system_drive": os.environ.get("SYSTEMDRIVE", "C:"),
            "system_dir": os.environ.get("SYSTEMROOT", "C:\\Windows") + "\\system32",
            "uptime": self.get_uptime(),
            "mac_address": mac_address,
            "lan_ip": network_info["lan_ip"],
            "wan_ip": network_info["wan_ip"],
            "asn": network_info["asn"],
            "isp": network_info["isp"],
            "antivirus": self.get_antivirus_info(),
            "firewall": self.get_firewall_info(),
            "timezone": network_info["timezone"],
            "country": network_info["country"],
            "disk_total": f"{disk.total // (1024**3)} GB",
            "disk_used": f"{disk.used // (1024**3)} GB",
            "disk_free": f"{disk.free // (1024**3)} GB",
            "active_processes": len(psutil.pids()),
        }
