import { apiCall, SVG_TEMPLATES, CLASSES, formatFileSize, formatDate } from './utils.js';
import { LoadingButton } from './dom.js';

class FileManager {
    constructor() {
        this.currentPath = '/';
        this.selectedItems = new Set();
        this.currentFileList = [];
        this.lastSelectedItem = null;
        this.selectionAnchor = null;
        this.buttons = {};
        this.dropZone = null;
        this.isDragging = false;
        this.dragStartElement = null;
        this.scrollAnimationFrame = null;
        this.currentScrollSpeed = 0;
    }

    initializeButtons() {
        const buttonConfigs = {
            download: 'Downloading...',
            delete: 'Deleting...',
            rename: 'Renaming...',
            createFolder: 'Creating...',
            upload: 'Uploading...',
            refresh: 'Refreshing...'
        };
        
        this.buttons = Object.fromEntries(
            Object.entries(buttonConfigs)
                .map(([id, loadingText]) => {
                    const button = document.getElementById(id);
                    return button ? [id, new LoadingButton(button, loadingText)] : null;
                })
                .filter(Boolean)
        );
    }

    clearSelection() {
        this.selectedItems.forEach(item => this.toggleItemSelection(item, false));
        this.selectedItems.clear();
        this.lastSelectedItem = null;
    }

    async handleFileUpload(files, isDropZone = false) {
        if (!files.length) return;

        const formData = new FormData();
        Array.from(files).forEach(file => formData.append('files', file));
        formData.append('path', this.currentPath);

        if (isDropZone) this.dropZone.setLoading();

        try {
            const response = await apiCall('/api/upload', 'POST', formData);
            if (response.status === 'success') {
                const lastFile = files[files.length - 1].name;
                const highlightPath = `${this.currentPath}${this.currentPath.endsWith('\\') ? '' : '\\'}${lastFile}`;
                await this.listFiles(this.currentPath, highlightPath);
                
                if (!isDropZone) {
                    const fileInput = document.getElementById('fileUpload');
                    fileInput.value = '';
                    document.getElementById('selectedFileName').textContent = 'No file chosen';
                }
                
                alert(response.message);
            } else {
                alert(response.message);
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            alert('Error uploading files');
        } finally {
            if (isDropZone) this.dropZone.reset();
        }
    }

    async handleApiCall(apiEndpoint, method, data, successCallback) {
        try {
            const response = await apiCall(apiEndpoint, method, data);
            if (response.status === 'success') {
                response.message && alert(response.message);
                successCallback?.(response);
            } else {
                alert(response.message || 'An error occurred');
            }
        } catch (error) {
            console.error(`Error in ${apiEndpoint}:`, error);
            alert(`Error: ${error.message}`);
        }
    }

    createTableRow(item, additionalClasses = []) {
        const row = document.createElement('tr');
        row.classList.add(...CLASSES.row, ...additionalClasses, CLASSES.defaultHover);
        
        if (item) {
            row.dataset.path = item.path;
            row.dataset.isDir = item.is_dir.toString();
        }

        ['mouseover', 'mouseout'].forEach(event => {
            row.addEventListener(event, () => {
                row.dataset.hovered = event === 'mouseover';
                this.updateRowHover(row);
            });
        });

        return row;
    }

    createCell(content, colSpan = 1) {
        const cell = document.createElement('td');
        cell.classList.add(...CLASSES.cell);
        cell.colSpan = colSpan;
        cell.innerHTML = content;
        return cell;
    }

    updateFileOperationsUI() {
        const selectionCount = this.selectedItems.size;
        const hasDirectorySelected = Array.from(this.selectedItems).some(item => 
            item.dataset.isDir === 'true'
        );

        const elements = {
            operations: document.getElementById('fileOperations'),
            download: document.getElementById('downloadFile'),
            delete: document.getElementById('deleteItem'),
            renameInput: document.getElementById('renameInput'),
            renameButton: document.getElementById('renameItem')
        };

        elements.operations.classList.toggle('hidden', !selectionCount);
        elements.download.disabled = !selectionCount || hasDirectorySelected;
        elements.delete.disabled = !selectionCount;
        elements.renameInput.disabled = selectionCount !== 1;
        elements.renameButton.disabled = selectionCount !== 1;

        if (selectionCount === 1) {
            elements.renameInput.value = Array.from(this.selectedItems)[0]
                .querySelector('td:first-child > div').textContent.trim();
        } else {
            elements.renameInput.value = '';
        }
    }

    toggleItemSelection(row, add) {
        row.classList.toggle(CLASSES.selected, add);
        row.classList.toggle(CLASSES.defaultHover, !add);
        if (add) {
            this.selectedItems.add(row);
        } else {
            row.classList.remove(CLASSES.selectedHover);
            this.selectedItems.delete(row);
        }
        this.updateRowHover(row);
    }

    handleRangeSelection(row, anchorRow) {
        const visibleRows = Array.from(document.getElementById('fileList').getElementsByTagName('tr'))
            .filter(row => row.dataset.path && row.style.display !== 'none');

        const currentIndex = visibleRows.indexOf(row);
        const anchorIndex = visibleRows.indexOf(anchorRow);

        if (currentIndex === -1 || anchorIndex === -1) return;

        this.selectedItems.forEach(item => this.toggleItemSelection(item, false));
        this.selectedItems.clear();

        const start = Math.min(currentIndex, anchorIndex);
        const end = Math.max(currentIndex, anchorIndex);

        visibleRows.slice(start, end + 1)
            .filter(row => !row.classList.contains(...CLASSES.noAccess))
            .forEach(row => this.toggleItemSelection(row, true));
    }

    handleItemSelection(row, item, event) {
        if (row.classList.contains(...CLASSES.noAccess)) {
            return;
        }

        if (event.shiftKey) {
            if (!this.selectionAnchor) {
                this.selectionAnchor = row;
                this.toggleItemSelection(row, true);
            } else {
                this.handleRangeSelection(row, this.selectionAnchor);
            }
            this.lastSelectedItem = row;
        } else if (event.ctrlKey || event.metaKey) {
            this.toggleItemSelection(row, !this.selectedItems.has(row));
            this.lastSelectedItem = row;
            this.selectionAnchor = row;
        } else {
            if (this.selectedItems.size === 1 && this.selectedItems.has(row)) {
                this.toggleItemSelection(row, false);
                this.lastSelectedItem = null;
                this.selectionAnchor = null;
            } else {
                this.clearSelection();
                this.toggleItemSelection(row, true);
                this.lastSelectedItem = row;
                this.selectionAnchor = row;
            }
        }

        this.updateFileOperationsUI();
    }

    handleDragStart(event, row) {
        if (row.classList.contains(...CLASSES.noAccess)) return;
        
        if (event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey) return;

        this.isDragging = true;
        this.dragStartElement = row;
        
        if (!this.selectedItems.has(row)) {
            this.clearSelection();
            this.selectionAnchor = row;
            this.toggleItemSelection(row, true);
        }

        event.preventDefault();
    }

    handleDragMove(event) {
        if (!this.isDragging || !this.dragStartElement) return;

        const fileList = document.getElementById('fileList');
        const rect = fileList.getBoundingClientRect();
        const mouseY = event.clientY;

        const rows = Array.from(fileList.getElementsByTagName('tr'))
            .filter(row => row.dataset.path && row.style.display !== 'none');

        let targetRow = null;
        for (const row of rows) {
            const rowRect = row.getBoundingClientRect();
            if (mouseY >= rowRect.top && mouseY <= rowRect.bottom) {
                targetRow = row;
                break;
            }
        }

        if (targetRow && !targetRow.classList.contains(...CLASSES.noAccess)) {
            this.handleRangeSelection(targetRow, this.dragStartElement);
            this.lastSelectedItem = targetRow;
        }

        const scrollThreshold = 60;
        const maxScrollSpeed = 15;
        const scrollContainer = fileList.closest('.overflow-auto');
        
        if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            
            if (mouseY < containerRect.top + scrollThreshold) {
                const distance = mouseY - containerRect.top;
                this.currentScrollSpeed = -maxScrollSpeed * Math.max(0, (scrollThreshold - distance) / scrollThreshold);
            } else if (mouseY > containerRect.bottom - scrollThreshold) {
                const distance = containerRect.bottom - mouseY;
                this.currentScrollSpeed = maxScrollSpeed * Math.max(0, (scrollThreshold - distance) / scrollThreshold);
            } else {
                this.currentScrollSpeed = 0;
            }

            if (this.currentScrollSpeed !== 0) {
                this.startScrollAnimation(scrollContainer);
            }
        }
    }

    startScrollAnimation(scrollContainer) {
        if (this.scrollAnimationFrame) return;

        const animate = () => {
            if (!this.isDragging || this.currentScrollSpeed === 0) {
                this.scrollAnimationFrame = null;
                return;
            }

            scrollContainer.scrollTop += this.currentScrollSpeed;
            this.scrollAnimationFrame = requestAnimationFrame(animate);
        };

        this.scrollAnimationFrame = requestAnimationFrame(animate);
    }

    handleDragEnd() {
        this.isDragging = false;
        this.dragStartElement = null;
        this.currentScrollSpeed = 0;
        if (this.scrollAnimationFrame) {
            cancelAnimationFrame(this.scrollAnimationFrame);
            this.scrollAnimationFrame = null;
        }
        this.updateFileOperationsUI();
    }

    updateRowHover(row) {
        const isSelected = this.selectedItems.has(row);
        const isHovered = row.dataset.hovered === 'true';

        row.classList.toggle(CLASSES.defaultHover, !isSelected);
        row.classList.toggle(CLASSES.selectedHover, isSelected && isHovered);
        row.classList.toggle(CLASSES.selected, isSelected && !isHovered);
    }

    createUpDirectoryRow(path, onClick) {
        const upRow = this.createTableRow();
        upRow.addEventListener('click', onClick);
        upRow.appendChild(this.createCell(
            `<div class="flex items-center gap-2">${SVG_TEMPLATES.upArrow()}..</div>`,
            3
        ));
        return upRow;
    }

    async updateFileList(items, highlightPath = null) {
        const fragment = document.createDocumentFragment();

        if (this.currentPath !== '/') {
            const upRow = this.createUpDirectoryRow(this.currentPath, () => this.listFiles(this.getParentPath()));
            fragment.appendChild(upRow);
        }

        const createRowPromises = items.map(async (item) => {
            const row = this.createTableRow(item, item.no_access ? CLASSES.noAccess : []);
            
            row.addEventListener('mousedown', (e) => this.handleItemSelection(row, item, e));
            if (item.is_dir && !item.no_access) {
                row.addEventListener('dblclick', () => this.listFiles(item.path));
            }

            const cells = [this.createItemNameCell(item)];

            if (item.is_dir) {
                cells.push('-', '-');
            } else {
                try {
                    const stats = await apiCall(`/api/file_info?path=${encodeURIComponent(item.path)}`);
                    cells.push(formatFileSize(stats.size), formatDate(stats.last_modified));
                } catch {
                    cells.push('Error', 'Error');
                }
            }

            cells.forEach(content => row.appendChild(this.createCell(content)));

            if (highlightPath && item.path === highlightPath) {
                row.classList.add(CLASSES.highlight);
                setTimeout(() => row.classList.remove(CLASSES.highlight), 1500);
            }

            return row;
        });

        const rows = await Promise.all(createRowPromises);
        rows.forEach(row => fragment.appendChild(row));

        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        fileList.appendChild(fragment);
        
        this.currentFileList = items;
        this.filterFiles('');
    }

    filterFiles(searchTerm) {
        const normalizedSearch = searchTerm.toLowerCase();
        document.querySelectorAll('#fileList tr[data-path]').forEach(row => {
            const fileName = row.querySelector('td:first-child > div').textContent.toLowerCase();
            row.style.display = fileName.includes(normalizedSearch) ? '' : 'none';
        });
    }

    createItemNameCell(item) {
        const iconTemplate = item.is_dir ? SVG_TEMPLATES.folder : SVG_TEMPLATES.file;
        const icon = item.is_dir && item.no_access ? iconTemplate('text-gray-500') : iconTemplate();
        return `<div class="flex items-center gap-2">${icon}${item.name}</div>`;
    }

    getParentPath() {
        if (this.currentPath.match(/^[A-Z]:\\$/)) return '/';
        const path = this.currentPath.replace(/\\$/, '');
        return path.substring(0, path.lastIndexOf('\\')) + '\\';
    }

    async listFiles(path, highlightPath = null) {
        this.clearSelection();
        const fileList = document.getElementById('fileList');
        
        if (path !== this.currentPath) {
            fileList.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-400">Loading...</td></tr>`;
        }

        try {
            const response = await apiCall(`/api/files?path=${encodeURIComponent(path)}`);
            
            if (response.status === 'error') {
                fileList.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500">${response.message}</td></tr>`;
                if (response.no_access && path !== '/') {
                    const upRow = this.createUpDirectoryRow(
                        path,
                        () => this.listFiles(this.getParentPath())
                    );
                    fileList.appendChild(upRow);
                }
                return;
            }

            this.currentPath = path;
            document.getElementById('currentPath').textContent = `Current Path: ${this.currentPath}`;
            await this.updateFileList(response, highlightPath);

        } catch (error) {
            console.error('Error listing files:', error);
            fileList.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500">Error: ${error.message}</td></tr>`;
        }
    }

initializeEventListeners() {
        // Helper function to handle button actions with loading state
        const handleButtonClick = async (buttonId, action) => {
            const button = this.buttons[buttonId];
            if (button) {
                await button.withLoading(action);
            } else {
                await action();
            }
        };

        // Refresh button
        document.getElementById('refresh')?.addEventListener('click', () =>
            handleButtonClick('refresh', () => this.listFiles(this.currentPath))
        );

        // Download button
        document.getElementById('downloadFile')?.addEventListener('click', () =>
            handleButtonClick('download', async () => {
                if (this.selectedItems.size === 0) {
                    alert('Please select files to download');
                    return;
                }

                const selectedFiles = Array.from(this.selectedItems)
                    .filter(item => item.dataset.isDir !== 'true');

                if (selectedFiles.length === 0) {
                    alert('Please select at least one file to download (directories cannot be downloaded)');
                    return;
                }

                try {
                    const paths = selectedFiles.map(item => item.dataset.path);
                    const queryString = paths.map(path => 
                        `paths[]=${encodeURIComponent(path)}`
                    ).join('&');
                    
                    const link = document.createElement('a');
                    link.href = `/api/download?${queryString}`;
                    link.setAttribute('download', '');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (error) {
                    console.error('Error downloading files:', error);
                    alert('Error downloading files');
                }
            })
        );

        // Upload button
        document.getElementById('uploadFile')?.addEventListener('click', () =>
            handleButtonClick('upload', async () => {
                const fileInput = document.getElementById('fileUpload');
                if (!fileInput?.files.length) {
                    alert('Please select a file to upload');
                    return;
                }
                await this.handleFileUpload(fileInput.files);
            })
        );

        // Delete button
        document.getElementById('deleteItem')?.addEventListener('click', () =>
            handleButtonClick('delete', async () => {
                if (this.selectedItems.size === 0) {
                    alert('Please select files or folders to delete');
                    return;
                }

                const paths = Array.from(this.selectedItems).map(item => item.dataset.path);
                const confirmMessage = paths.length === 1 
                    ? `Are you sure you want to delete ${paths[0]}?`
                    : `Are you sure you want to delete ${paths.length} items?`;

                if (!confirm(confirmMessage)) return;

                await this.handleApiCall('/api/delete', 'POST', { paths }, 
                    async response => {
                        if (response.data?.failed?.length) {
                            alert(`Some items failed to delete:\n${response.data.failed
                                .map(f => `${f.path}: ${f.error}`).join('\n')}`);
                        }
                        await this.listFiles(this.currentPath);
                        this.clearSelection();
                    }
                );
            })
        );

        // Create folder button
        document.getElementById('createFolder')?.addEventListener('click', () =>
            handleButtonClick('createFolder', async () => {
                const folderNameInput = document.getElementById('newFolderName');
                const folderName = folderNameInput?.value.trim();
                if (!folderName) {
                    alert('Please enter a folder name');
                    return;
                }

                await this.handleApiCall(
                    '/api/create_folder', 
                    'POST', 
                    { parentPath: this.currentPath, folderName },
                    async () => {
                        const newFolderPath = this.currentPath.endsWith('\\') ? 
                            `${this.currentPath}${folderName}` : 
                            `${this.currentPath}\\${folderName}`;
                        await this.listFiles(this.currentPath, newFolderPath);
                        if (folderNameInput) folderNameInput.value = '';
                    }
                );
            })
        );

        // Rename button
        document.getElementById('renameItem')?.addEventListener('click', () =>
            handleButtonClick('rename', async () => {
                if (this.selectedItems.size !== 1) {
                    alert('Please select a single file or folder to rename');
                    return;
                }

                const selectedItem = Array.from(this.selectedItems)[0];
                const oldPath = selectedItem.dataset.path;
                const renameInput = document.getElementById('renameInput');
                const newName = renameInput?.value.trim();
                
                if (!newName) {
                    alert('Please enter a new name');
                    return;
                }

                await this.handleApiCall(
                    '/api/rename',
                    'POST',
                    { oldPath, newName },
                    async () => {
                        const newPath = this.currentPath.endsWith('\\') ?
                            `${this.currentPath}${newName}` :
                            `${this.currentPath}\\${newName}`;
                        await this.listFiles(this.currentPath, newPath);
                        document.getElementById('fileOperations')?.classList.add('hidden');
                        this.clearSelection();
                        if (renameInput) renameInput.value = '';
                    }
                );
            })
        );

        // File selection display
        document.getElementById('fileUpload')?.addEventListener('change', function() {
            const selectedFileName = document.getElementById('selectedFileName');
            if (!selectedFileName) return;

            selectedFileName.textContent = this.files.length > 1 ? 
                `${this.files.length} files selected` : 
                this.files[0]?.name || 'No file chosen';
            selectedFileName.classList.toggle('text-gray-400', this.files.length === 0);
            selectedFileName.classList.toggle('text-green-400', this.files.length > 0);
        });

        // Search functionality with debounce
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filterFiles(e.target.value);
                }, 300);
            });

            // Prevent file selection when clicking in search input
            searchInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Prevent default mousedown behavior in file list
        document.getElementById('fileList')?.addEventListener('mousedown', (event) => {
            event.preventDefault();
        });

        const fileList = document.getElementById('fileList');
        if (fileList) {
            fileList.addEventListener('mousedown', (e) => {
                const row = e.target.closest('tr');
                if (row?.dataset?.path) {
                    this.handleDragStart(e, row);
                }
            });

            document.addEventListener('mousemove', (e) => {
                if (this.isDragging) {
                    this.handleDragMove(e);
                }
            });

            document.addEventListener('mouseup', () => {
                if (this.isDragging) {
                    this.handleDragEnd();
                }
            });

            fileList.addEventListener('dragstart', (e) => {
                if (this.isDragging) {
                    e.preventDefault();
                }
            });
        }

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ignore if we're in an input field
            if (e.target.tagName === 'INPUT') return;

            // Ctrl+A or Cmd+A to select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                const fileList = document.getElementById('fileList');
                if (!fileList) return;

                const selectableRows = Array.from(fileList.getElementsByTagName('tr'))
                    .filter(row => row.dataset.path && 
                                 !row.classList.contains(...CLASSES.noAccess) && 
                                 row.style.display !== 'none');
                
                this.clearSelection();
                selectableRows.forEach(row => {
                    row.classList.add(CLASSES.selected);
                    this.selectedItems.add(row);
                });
                this.updateFileOperationsUI();
            }
        });
    }

    initialize() {
        this.initializeButtons();
        
        this.dropZone = new DropZone('dropZone', this.handleFileUpload.bind(this));
        
        this.initializeEventListeners();
        this.listFiles(this.currentPath);
    }
}

class DropZone {
    constructor(elementId, onUpload) {
        this.element = document.getElementById(elementId);
        this.onUpload = onUpload;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const preventDefault = e => {
            e.preventDefault();
            e.stopPropagation();
        };

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => 
            this.element.addEventListener(event, preventDefault)
        );

        ['dragenter', 'dragover'].forEach(event => 
            this.element.addEventListener(event, () => this.highlight())
        );

        ['dragleave', 'drop'].forEach(event => 
            this.element.addEventListener(event, () => this.unhighlight())
        );

        this.element.addEventListener('drop', e => 
            this.onUpload(e.dataTransfer.files, true)
        );
    }

    highlight() {
        this.element.classList.add('bg-blue-500/20', 'border-blue-700');
    }

    unhighlight() {
        this.element.classList.remove('bg-blue-500/20', 'border-blue-700');
    }

    setLoading() {
        this.element.innerHTML = `
            <div class="text-center">
                ${SVG_TEMPLATES.spinner(10)}
                <p class="text-gray-400">Uploading files...</p>
            </div>
        `;
    }

    reset() {
        this.element.innerHTML = `
            <div class="text-center">
                ${SVG_TEMPLATES.upload()}
                <p class="text-gray-400">Drag and drop files here to upload</p>
            </div>
        `;
    }
}

function initializeFileManagement() {
    const fileManager = new FileManager();
    fileManager.initialize();
}

export { initializeFileManagement };