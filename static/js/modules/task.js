// static/js/modules/task.js
import { apiCall } from './utils.js';

function initializeTaskManager(socket) {
    const taskList = document.getElementById('taskList');
    const taskManager = document.getElementById('taskManager');
    let selectedProcess = null;

    async function updateTaskList() {
        try {
            const processes = await apiCall('/api/tasks', 'GET');
            renderTaskList(processes);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }

    function renderTaskList(processes) {
        taskList.innerHTML = '';
        processes.forEach(process => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${process.pid}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">${process.name}</td>
            `;

            row.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                selectedProcess = process;
                showContextMenu(event.clientX, event.clientY);
            });

            taskList.appendChild(row);
        });
    }

    function showContextMenu(x, y) {
        const contextMenu = document.createElement('div');
        contextMenu.classList.add('context-menu');
        contextMenu.style.position = 'absolute';
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.innerHTML = `
            <ul class="bg-gray-700 border border-gray-600 rounded-lg py-2">
                <li class="px-4 py-2 text-white hover:bg-gray-600 cursor-pointer">End Task</li>
            </ul>
        `;

        contextMenu.addEventListener('click', () => {
            if (selectedProcess) {
                killProcess(selectedProcess.pid);
            }
            contextMenu.remove();
        });

        document.body.appendChild(contextMenu);

        // Remove context menu on click outside
        document.addEventListener('click', function removeContextMenu(event) {
            if (!contextMenu.contains(event.target)) {
                contextMenu.remove();
                document.removeEventListener('click', removeContextMenu);
            }
        });
    }

    async function killProcess(pid) {
        try {
            const response = await apiCall('/api/tasks/kill', 'POST', { pid });
            if (response.status === 'success') {
                console.log(response.message);
                updateTaskList();
            } else {
                console.error(response.message);
            }
        } catch (error) {
            console.error('Error killing process:', error);
        }
    }

    // Initial update
    updateTaskList();

    // Update the task list every 5 seconds
    socket.on('task_list', (processes) => {
        renderTaskList(processes);
    });

    socket.emit('task_poll');
}

export { initializeTaskManager };