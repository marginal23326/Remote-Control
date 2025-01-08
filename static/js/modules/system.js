// static/js/modules/system.js
import { apiCall } from './utils.js';

async function updateSystemInfo() {
    const info = await apiCall('/api/system');
    const systemInfoDiv = document.getElementById('systemInfo');
    
    const formattedInfo = [
        `Operating System: ${info.os}`,
        `Architecture: ${info.architecture}`,
        `Processor (CPU): ${info.processor}`,
        `CPU Cores: ${info.cpu_cores}`,
        `CPU Threads: ${info.cpu_threads}`,
        `CPU Base Speed: ${info.cpu_base_speed}`,
        `CPU Max Speed: ${info.cpu_max_speed}`,
        `Memory (RAM): ${info.memory}`,
        `Video Card (GPU): ${Array.isArray(info.gpu) ? info.gpu.join(', ') : info.gpu}`,
        `Monitors: ${Array.isArray(info.monitors) ? info.monitors.join(', ') : info.monitors}`,
        `Storage Drives: ${Array.isArray(info.disks) ? info.disks.join(', ') : info.disks}`,
        `Battery: ${info.battery}`,
        `Username: ${info.username}`,
        `PC Name: ${info.pc_name}`,
        `Domain Name: ${info.domain}`,
        `Host Name: ${info.hostname}`,
        `System Drive: ${info.system_drive}`,
        `System Directory: ${info.system_dir}`,
        `Uptime: ${info.uptime}`,
        `MAC Address: ${info.mac_address}`,
        `LAN IP Address: ${info.lan_ip}`,
        `WAN IP Address: ${info.wan_ip}`,
        `ASN: ${info.asn}`,
        `ISP: ${info.isp}`,
        `Antivirus: ${Array.isArray(info.antivirus) ? info.antivirus.join(', ') : info.antivirus}`,
        `Firewall: ${info.firewall}`,
        `Time Zone: ${info.timezone}`,
        `Country: ${info.country}`,
        `Disk Total: ${info.disk_total}`,
        `Disk Used: ${info.disk_used}`,
        `Disk Free: ${info.disk_free}`,
        `Active Processes: ${info.active_processes}`
    ].join('\n');
    
    systemInfoDiv.textContent = formattedInfo;
}

export { updateSystemInfo };