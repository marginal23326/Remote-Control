// static/js/modules/task.js
import { apiCall, SVG_TEMPLATES, BaseTaskManager } from './utils.js';

function initializeTaskManager(socket) {
    const taskManager = new BaseTaskManager();
    let selectedProcess = null;
    let currentSort = { column: 'name', order: 'asc' };
    let processes = [];
    let expandedGroups = new Set();

    const taskList = document.getElementById('taskList');

    function renderTaskList(newProcesses) {
        newProcesses.forEach(process => {
            if (process.is_group) {
                process.expanded = expandedGroups.has(process.pid);
            }
        });

        processes = newProcesses;
        sortProcesses(processes, currentSort.column, currentSort.order);

        const fragment = document.createDocumentFragment();
        processes.forEach(process => {
            const row = document.createElement('tr');
            row.classList.add('hover:bg-gray-700/50', 'cursor-pointer');
            row.dataset.pid = process.pid;

            const expandArrow = process.is_group 
                ? `<span class="inline-block w-4 mr-2 cursor-pointer expand-arrow">${process.expanded ? '▼' : '▶'}</span>`
                : '<span class="inline-block w-4 mr-2"></span>';

            row.innerHTML = `
                <td class="px-4 py-1 whitespace-nowrap text-sm font-medium text-white">
                    ${expandArrow}${process.name}
                </td>
                <td class="px-4 py-1 whitespace-nowrap text-sm text-gray-500">${process.cpu_percent.toFixed(1)}%</td>
                <td class="px-4 py-1 whitespace-nowrap text-sm text-gray-500">${process.memory_usage.toFixed(1)} MB</td>
                <td class="px-4 py-1 whitespace-nowrap text-sm text-gray-500">${process.pid}</td>
            `;

            fragment.appendChild(row);

            if (process.is_group && process.expanded && process.children) {
                process.children.forEach(childProcess => {
                    const childRow = document.createElement('tr');
                    childRow.classList.add('hover:bg-gray-700/50', 'cursor-pointer', 'child-process');
                    childRow.dataset.pid = childProcess.pid;
                    childRow.dataset.parentPid = process.pid;

                    childRow.innerHTML = `
                        <td class="px-4 py-1 whitespace-nowrap text-sm font-medium text-white pl-16">
                            ${childProcess.name}
                        </td>
                        <td class="px-4 py-1 whitespace-nowrap text-sm text-gray-500">${childProcess.cpu_percent.toFixed(1)}%</td>
                        <td class="px-4 py-1 whitespace-nowrap text-sm text-gray-500">${childProcess.memory_usage.toFixed(1)} MB</td>
                        <td class="px-4 py-1 whitespace-nowrap text-sm text-gray-500">${childProcess.pid}</td>
                    `;

                    fragment.appendChild(childRow);
                });
            }
        });

        taskList.innerHTML = '';
        taskList.appendChild(fragment);

        taskManager.selectionManager.notifyItemsUpdate();
        taskManager.config.onSelectionChange(taskManager.getSelectedItems());

        const endTaskButton = document.getElementById('endTaskButton');
        if (!endTaskButton.hasListener) {
            endTaskButton.innerHTML = SVG_TEMPLATES.cross() + endTaskButton.innerHTML;
            endTaskButton.addEventListener('click', () => {
                const selectedItems = taskManager.getSelectedItems();
                if (selectedItems.length > 0) {
                    selectedItems.forEach(item => {
                        killProcess(parseInt(item.dataset.pid));
                    });
                    document.getElementById('endTaskContainer').classList.add('hidden');
                }
            });
            endTaskButton.hasListener = true;
        }
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

    taskList.addEventListener('click', (event) => {
        const expandArrow = event.target.closest('.expand-arrow');
        if (expandArrow) {
            const row = expandArrow.closest('tr');
            const pid = parseInt(row.dataset.pid);
            const process = processes.find(p => p.pid === pid);
            
            if (process && process.is_group) {
                process.expanded = !process.expanded;
                if (process.expanded) {
                    expandedGroups.add(pid);
                } else {
                    expandedGroups.delete(pid);
                }
                renderTaskList(processes);
                event.stopPropagation();
                return;
            }
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
    socket.on('task_list', (data) => {
        const totalCpuUsage = document.querySelector('#processSection th[data-column="cpu_percent"] .total-usage');
        const totalMemoryUsage = document.querySelector('#processSection th[data-column="memory_usage"] .total-usage');

        totalCpuUsage.textContent = `(${data.total_cpu_usage.toFixed(1)}%)`;
        totalMemoryUsage.textContent = `(${data.total_memory_percentage.toFixed(1)}%)`;

        renderTaskList(data.processes);
    });

    document.addEventListener('click', (event) => {
        const link = event.target.closest('.nav-link');
        if (!link) return;

        const targetSection = link.getAttribute('href').substring(1);
        socket.emit(targetSection === 'processSection' ? 'task_poll_start' : 'task_poll_stop');
    });

    if (!document.getElementById('processSection')?.classList.contains('hidden')) {
        socket.emit('task_poll_start');
    }

    taskManager.initialize();
}

export { initializeTaskManager };