import psutil
import platform
import datetime
import os

class SystemService:
    @staticmethod
    def get_system_info():
        disk = psutil.disk_usage('/')
        mac_address = next(
            (addr.address for n, addrs in psutil.net_if_addrs().items()
             for addr in addrs if addr.family == psutil.AF_LINK
             and psutil.net_if_stats()[n].isup
             and any(ip.address.startswith('192.168.') for ip in addrs)), 
            None
        )
        return {
            'platform_info': f"{platform.system()} {platform.release()} {platform.version()}",
            'machine': platform.machine(),
            'processor': platform.processor(),
            'hostname': platform.node(),
            'boot_time': datetime.datetime.fromtimestamp(psutil.boot_time()).strftime('%Y-%m-%d %H:%M:%S'),
            'cpu_count': os.cpu_count(),
            'total_memory': f"{psutil.virtual_memory().total // (1024 ** 2)} MB",
            'disk_total': f"{disk.total // (1024 ** 3)} GB",
            'disk_used': f"{disk.used // (1024 ** 3)} GB",
            'disk_free': f"{disk.free // (1024 ** 3)} GB",
            'mac_address': mac_address,
            'active_processes': len(psutil.pids())
        }