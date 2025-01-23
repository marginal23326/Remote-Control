// static/js/modules/file.js
import { apiCall, SVG_TEMPLATES, CLASSES, formatFileSize, formatDate, BaseFileManager } from './utils.js';
import { LoadingButton } from './dom.js';

class FileManager extends BaseFileManager {
    constructor() {
        super();
        this.currentPath = '/';
        this.currentFileList = [];
        this.buttons = {};
        this.dropZone = null;
        this.filteredRows = new Map();
        this.elements = {
            fileList: null,
            currentPath: null,
            searchInput: null
        };
    }

    initializeElements() {
        this.elements.fileList = document.getElementById('fileList');
        this.elements.currentPath = document.getElementById('currentPath');
        this.elements.searchInput = document.getElementById('searchInput');
    }

    initializeButtons() {
        const buttonConfigs = {
            downloadFile: 'Downloading...',
            deleteItem: 'Deleting...',
            renameItem: 'Renaming...',
            createFolder: 'Creating...',
            uploadFile: 'Uploading...',
            refresh: 'Refreshing...'
        };
        
        this.buttons = Object.fromEntries(
            Object.entries(buttonConfigs)
                .map(([id, loadingText]) => {
                    const button = document.getElementById(id);
                    if (id === 'deleteItem') {
                        button.innerHTML = SVG_TEMPLATES.cross() + ' ' + button.textContent;
                    }
                    return button ? [id, new LoadingButton(button, loadingText)] : null;
                })
                .filter(Boolean)
        );
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
                this.selectionManager.updateItemHover(row);
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
        const selectionCount = this.selectionManager.selectedItems.size;
        const hasDirectorySelected = Array.from(this.selectionManager.selectedItems).some(item => 
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
            elements.renameInput.value = Array.from(this.selectionManager.selectedItems)[0]
                .querySelector('td:first-child > div').textContent.trim();
        } else {
            elements.renameInput.value = '';
        }
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
            const upRow = this.createUpDirectoryRow(this.currentPath, () => 
                this.listFiles(this.getParentPath())
            );
            fragment.appendChild(upRow);
        }

        items.forEach(item => {
            const row = this.createTableRow(item, item.no_access ? CLASSES.noAccess : []);
            
            if (item.is_dir && !item.no_access) {
                row.addEventListener('dblclick', () => this.listFiles(item.path));
            }

            const cells = [this.createItemNameCell(item)];

            if (item.is_dir) {
                cells.push('-', '-');
            } else {
                cells.push(
                    formatFileSize(item.size), 
                    item.last_modified ? formatDate(item.last_modified) : '-'
                );
            }

            cells.forEach(content => row.appendChild(this.createCell(content)));

            if (highlightPath && item.path === highlightPath) {
                row.classList.add(CLASSES.highlight);
                setTimeout(() => row.classList.remove(CLASSES.highlight), 1500);
            }

            fragment.appendChild(row);
        });

        this.elements.fileList.innerHTML = '';
        this.elements.fileList.appendChild(fragment);
        
        this.currentFileList = items;
        this.filteredRows.clear();
        this.filterFiles('');
    }

    filterFiles(searchTerm) {
        const normalizedSearch = searchTerm.toLowerCase();
        if (!this.filteredRows.has(normalizedSearch)) {
            const visibilityMap = new Map();
            this.elements.fileList.querySelectorAll('tr[data-path]').forEach(row => {
                const fileName = row.querySelector('td:first-child > div').textContent.toLowerCase();
                visibilityMap.set(row, fileName.includes(normalizedSearch));
            });
            this.filteredRows.set(normalizedSearch, visibilityMap);
        }
        
        const visibilityMap = this.filteredRows.get(normalizedSearch);
        visibilityMap.forEach((isVisible, row) => {
            row.style.display = isVisible ? '' : 'none';
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

            this.selectionManager.notifyItemsUpdate();
        } catch (error) {
            console.error('Error listing files:', error);
            fileList.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500">Error: ${error.message}</td></tr>`;
        }
    }

    async handleDownload(selectedItems) {
        const selectedFiles = selectedItems.filter(item => item.dataset.isDir !== 'true');
        if (selectedFiles.length === 0) {
            alert('Please select at least one file to download (directories cannot be downloaded)');
            return;
        }

        try {
            const paths = selectedFiles.map(item => item.dataset.path);
            const queryString = paths.map(path => `paths[]=${encodeURIComponent(path)}`).join('&');
            
            const response = await fetch(`/api/download?${queryString}`);
            
            if (response.ok) {
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
                iframe.src = `/api/download?${queryString}`;
                
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 5000);
            } else if (response.status === 403) {
                alert('Access denied: You do not have permission to download these files');
            } else {
                alert('Error downloading files');
            }

        } catch (error) {
            console.error('Error downloading files:', error);
            alert('Error downloading files');
        }
    }

    async handleDelete(selectedItems) {
        const paths = selectedItems.map(item => item.dataset.path);
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
            handleButtonClick('downloadFile', async () => {
                await this.handleDownload(this.getSelectedItems());
            })
        );

        // Upload button
        document.getElementById('uploadFile')?.addEventListener('click', () =>
            handleButtonClick('uploadFile', async () => {
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
            handleButtonClick('deleteItem', async () => {
                await this.handleDelete(this.getSelectedItems());
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
            handleButtonClick('renameItem', async () => {
                const selectedItem = this.getSelectedItems()[0];
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
                }, 50);
            });

            // Prevent file selection when clicking in search input
            searchInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    initialize() {
        this.initializeElements();
        this.initializeButtons();
        this.dropZone = new DropZone('dropZone', this.handleFileUpload.bind(this));
        this.initializeEventListeners();
        super.initialize();
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