// static/js/modules/task.js
import { apiCall } from './utils.js';

function initializeTaskManager(socket) {
    const taskList = document.getElementById('taskList');
    let selectedProcess = null;
    let currentSort = { column: 'name', order: 'asc' };
    let processes = [];
    let expandedGroups = new Set();

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

            if (selectedProcess && process.pid === selectedProcess.pid) {
                row.classList.add('bg-blue-500/50');
            }

            const expandArrow = process.is_group 
                ? `<span class="inline-block w-4 mr-2 cursor-pointer expand-arrow">${process.expanded ? '▼' : '▶'}</span>`
                : '<span class="inline-block w-4 mr-2"></span>';

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    ${expandArrow}${process.name}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${process.cpu_percent.toFixed(1)}%</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${process.memory_usage.toFixed(1)} MB</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${process.pid}</td>
            `;

            fragment.appendChild(row);

            if (process.is_group && process.expanded && process.children) {
                process.children.forEach(childProcess => {
                    const childRow = document.createElement('tr');
                    childRow.classList.add('hover:bg-gray-700/50', 'cursor-pointer', 'child-process');
                    childRow.dataset.pid = childProcess.pid;
                    childRow.dataset.parentPid = process.pid;

                    if (selectedProcess && childProcess.pid === selectedProcess.pid) {
                        childRow.classList.add('bg-blue-500/50');
                    }

                    childRow.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white pl-16">
                            ${childProcess.name}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${childProcess.cpu_percent.toFixed(1)}%</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${childProcess.memory_usage.toFixed(1)} MB</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${childProcess.pid}</td>
                    `;

                    fragment.appendChild(childRow);
                });
            }
        });

        taskList.innerHTML = '';
        taskList.appendChild(fragment);
        const endTaskButton = document.getElementById('endTaskButton');
        if (!endTaskButton.hasListener) {
            endTaskButton.addEventListener('click', () => {
                if (selectedProcess) {
                    killProcess(selectedProcess.pid);
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

        const row = event.target.closest('tr');
        if (!row) return;

        const pid = parseInt(row.dataset.pid);
        selectedProcess = processes.find(p => p.pid === pid) || 
                         processes.flatMap(p => p.children || []).find(c => c.pid === pid);
        
        taskList.querySelectorAll('tr').forEach(r => 
            r.classList.toggle('bg-blue-500/50', r.dataset.pid === String(pid))
        );

        const endTaskContainer = document.getElementById('endTaskContainer');
        if (selectedProcess) {
            endTaskContainer.classList.remove('hidden');
        } else {
            endTaskContainer.classList.add('hidden');
        }
        
        contextMenu.hide();
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('#taskList') && !event.target.closest('#endTaskContainer')) {
            selectedProcess = null;
            taskList.querySelectorAll('tr').forEach(r => 
                r.classList.remove('bg-blue-500/50')
            );
            document.getElementById('endTaskContainer').classList.add('hidden');
        }
    });

    taskList.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const row = event.target.closest('tr');
        if (!row) return;

        const pid = parseInt(row.dataset.pid);
        selectedProcess = processes.find(p => p.pid === pid);
        
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
    socket.on('task_list', (data) => {
        // Update total usage
        const totalCpuUsage = document.querySelector('#processSection th[data-column="cpu_percent"] .total-usage');
        const totalMemoryUsage = document.querySelector('#processSection th[data-column="memory_usage"] .total-usage');

        totalCpuUsage.textContent = `(${data.total_cpu_usage.toFixed(1)}%)`;
        totalMemoryUsage.textContent = `(${data.total_memory_percentage.toFixed(1)}%)`;

        renderTaskList(data.processes);
    });
    socket.emit('task_poll');
}

export { initializeTaskManager };