// static/js/modules/task.js
import { apiCall } from './utils.js';

function initializeTaskManager(socket) {
    const taskList = document.getElementById('taskList');
    let selectedProcess = null;
    let currentSort = { column: 'name', order: 'asc' };
    let processes = [];

    function renderTaskList(newProcesses) {
        processes = newProcesses;
        sortProcesses(processes, currentSort.column, currentSort.order);
        
        const fragment = document.createDocumentFragment();
        processes.forEach(process => {
            const row = document.createElement('tr');
            row.classList.add('hover:bg-gray-700/50', 'cursor-pointer');
            
            // Use dataset for easy process identification
            row.dataset.pid = process.pid;
            
            if (selectedProcess && process.pid === selectedProcess.pid) {
                row.classList.add('bg-blue-500/50');
            }
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">${process.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${process.pid}</td>
            `;
            
            fragment.appendChild(row);
        });

        taskList.innerHTML = '';
        taskList.appendChild(fragment);
    }

    function sortProcesses(processes, column, order) {
        return processes.sort((a, b) => {
            const valueA = a[column];
            const valueB = b[column];
            const modifier = order === 'asc' ? 1 : -1;
            return typeof valueA === 'number' 
                ? (valueA - valueB) * modifier
                : valueA.localeCompare(valueB) * modifier;
        });
    }

    const contextMenu = (() => {
        let menuElement = null;

        function hide() {
            if (menuElement) {
                menuElement.remove();
                menuElement = null;
            }
        }

        function show(x, y) {
            hide();
            
            menuElement = document.createElement('div');
            menuElement.classList.add('context-menu');
            menuElement.style.position = 'absolute';
            menuElement.style.left = `${x}px`;
            menuElement.style.top = `${y}px`;
            menuElement.innerHTML = `
                <ul class="bg-gray-700 border border-gray-600 rounded-lg py-2">
                    <li class="px-4 py-2 text-white hover:bg-gray-600 cursor-pointer">End Task</li>
                </ul>
            `;

            document.body.appendChild(menuElement);
            return menuElement;
        }

        return { show, hide };
    })();

    async function killProcess(pid) {
        try {
            const response = await apiCall('/api/tasks/kill', 'POST', { pid });
            if (response.status === 'success') {
                console.log(response.message);
                socket.emit('task_poll');
            } else {
                console.error(response.message);
            }
        } catch (error) {
            console.error('Error killing process:', error);
        }
    }

    // Event Delegation for row clicks and context menu
    taskList.addEventListener('click', (event) => {
        const row = event.target.closest('tr');
        if (!row) return;

        const pid = parseInt(row.dataset.pid);
        selectedProcess = processes.find(p => p.pid === pid);
        
        // Update only the selection highlight
        taskList.querySelectorAll('tr').forEach(r => 
            r.classList.toggle('bg-blue-500/50', r.dataset.pid === String(pid))
        );
        
        contextMenu.hide();
    });

    taskList.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const row = event.target.closest('tr');
        if (!row) return;

        const pid = parseInt(row.dataset.pid);
        selectedProcess = processes.find(p => p.pid === pid);
        
        // Update only the selection highlight
        taskList.querySelectorAll('tr').forEach(r => 
            r.classList.toggle('bg-blue-500/50', r.dataset.pid === String(pid))
        );

        const menu = contextMenu.show(event.clientX, event.clientY);
        menu.addEventListener('click', () => {
            if (selectedProcess) {
                killProcess(selectedProcess.pid);
            }
            contextMenu.hide();
        });
    });

    // Handle clicking outside context menu
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.context-menu')) {
            contextMenu.hide();
        }
    });

    // Handle sorting
    document.querySelectorAll('#processSection thead th').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            if (column) {
                currentSort.order = currentSort.column === column && currentSort.order === 'asc' ? 'desc' : 'asc';
                currentSort.column = column;
                renderTaskList(processes);
            }
        });
    });

    // Socket events
    socket.on('task_list', renderTaskList);
    socket.emit('task_poll');
}

export { initializeTaskManager };