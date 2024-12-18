// static/js/modules/system.js
import { apiCall } from './utils.js';

async function updateSystemInfo() {
    const info = await apiCall('/api/system');
    const systemInfoDiv = document.getElementById('systemInfo');
    
    const formattedInfo = [
        `Hostname: ${info.hostname}`,
        `Platform: ${info.platform_info || 'N/A'}`,
        `Architecture: ${info.machine}`,
        `Processor: ${info.processor}`,
        `Boot Time: ${info.boot_time || 'N/A'}`,
        `CPU Count: ${info.cpu_count || 'N/A'}`,
        `Total Memory: ${info.total_memory || 'N/A'}`,
        `Disk Total: ${info.disk_total || 'N/A'}`,
        `Disk Used: ${info.disk_used || 'N/A'}`,
        `Disk Free: ${info.disk_free || 'N/A'}`,
        `MAC Address: ${info.mac_address || 'N/A'}`,
        `Active Processes: ${info.active_processes || 'N/A'}`
    ].join('\n');
    
    systemInfoDiv.textContent = formattedInfo;
}

export { updateSystemInfo }; 
