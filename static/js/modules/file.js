import { apiCall, SVG_TEMPLATES, CLASSES, formatFileSize, formatDate } from './utils.js';
import { LoadingButton } from './dom.js';

class FileManager {
    constructor() {
        this.currentPath = '/';
        this.selectedItemPath = null;
        this.selectedItem = null;
        this.currentFileList = [];
        
        this.buttons = {
            download: new LoadingButton('downloadFile', 'Downloading...'),
            delete: new LoadingButton('deleteItem', 'Deleting...'),
            rename: new LoadingButton('renameItem', 'Renaming...'),
            createFolder: new LoadingButton('createFolder', 'Creating...'),
            upload: new LoadingButton('uploadFile', 'Uploading...')
        };
        
        this.dropZone = new DropZone('dropZone', this.handleFileUpload.bind(this));
    }

    clearSelection() {
        if (this.selectedItem) {
            this.selectedItem.classList.remove(CLASSES.selected);
            this.selectedItem = null;
            this.selectedItemPath = null;
        }
        
        ['downloadFile', 'deleteItem', 'renameInput', 'renameItem'].forEach(id => {
            const element = document.getElementById(id);
            element.disabled = true;
            if (id === 'renameInput') element.value = '';
        });
    }

    async handleFileUpload(files, isDropZone = false) {
        if (files.length === 0) return;

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        formData.append('path', this.currentPath);

        if (isDropZone) this.dropZone.setLoading();

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.status === 'success') {
                const lastFile = files[files.length - 1].name;
                const highlightPath = this.currentPath.endsWith('\\') ? 
                    `${this.currentPath}${lastFile}` : 
                    `${this.currentPath}\\${lastFile}`;
                    
                await this.listFiles(this.currentPath, highlightPath);
                
                if (!isDropZone) {
                    document.getElementById('fileUpload').value = '';
                    document.getElementById('selectedFileName').textContent = 'No file chosen';
                }
                
                alert(result.message || 'Files uploaded successfully');
            } else {
                alert(result.message);
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
                if (response.message) alert(response.message);
                if (successCallback) await successCallback(response);
            } else {
                alert(response.message || 'An error occurred');
            }
        } catch (error) {
            console.error(`Error in ${apiEndpoint}:`, error);
            alert(`Error: ${error.message}`);
        }
    }

    createTableRow(item, classes = []) {
        const row = document.createElement('tr');
        row.classList.add(...CLASSES.row, ...classes);
        if (item) row.dataset.path = item.path;
        return row;
    }

    createCell(content, colSpan = 1) {
        const cell = document.createElement('td');
        cell.classList.add(...CLASSES.cell);
        if (colSpan > 1) cell.colSpan = colSpan;
        cell.innerHTML = content;
        return cell;
    }

    handleItemSelection = (row, item) => (event) => {
        const isDirectoryNameCell = event.target.classList.contains('name-cell') && item.is_dir;
        if (isDirectoryNameCell) return;

        if (this.selectedItem) {
            this.selectedItem.classList.remove(CLASSES.selected);
        }
        
        if (this.selectedItem === row) {
            this.clearSelection();
        } else {
            row.classList.add(CLASSES.selected);
            this.selectedItem = row;
            this.selectedItemPath = item.path;
            
            document.getElementById('fileOperations').classList.remove('hidden');
            ['downloadFile', 'deleteItem', 'renameInput', 'renameItem'].forEach(id => {
                const element = document.getElementById(id);
                element.disabled = false;
                if (id === 'renameInput') element.value = item.name;
            });

            document.getElementById('downloadFile').disabled = item.is_dir;
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

    async updateFileList(newItems, highlightPath = null) {
        const fileList = document.getElementById('fileList');
        const fragment = document.createDocumentFragment();
        
        if (this.currentPath !== '/') {
            const upRow = this.createUpDirectoryRow(
                this.currentPath,
                () => this.listFiles(this.getParentPath())
            );
            fragment.appendChild(upRow);
        }

        for (const item of newItems) {
            const row = this.createTableRow(item, item.no_access ? CLASSES.noAccess : []);
            row.addEventListener('click', this.handleItemSelection(row, item));
            row.addEventListener('dblclick', () => {
                if (item.is_dir && !item.no_access) {
                    this.listFiles(item.path);
                }
            });

            const nameCell = this.createCell(this.createItemNameCell(item));
            nameCell.classList.add('name-cell');
            row.appendChild(nameCell);

            if (item.is_dir) {
                row.appendChild(this.createCell('-'));
                row.appendChild(this.createCell('-'));
            } else {
                try {
                    const stats = await apiCall(`/api/file_info?path=${encodeURIComponent(item.path)}`);
                    row.appendChild(this.createCell(formatFileSize(stats.size)));
                    row.appendChild(this.createCell(formatDate(stats.last_modified)));
                } catch (error) {
                    row.appendChild(this.createCell('Error'));
                    row.appendChild(this.createCell('Error'));
                }
            }

            if (highlightPath && item.path === highlightPath) {
                row.classList.add(CLASSES.highlight);
                setTimeout(() => row.classList.remove(CLASSES.highlight), 1500);
            }

            fragment.appendChild(row);
        }

        fileList.innerHTML = '';
        fileList.appendChild(fragment);
        this.currentFileList = newItems;
    }

    createItemNameCell(item) {
        const iconTemplate = item.is_dir ? SVG_TEMPLATES.folder : SVG_TEMPLATES.file;
        const icon = item.is_dir && item.no_access ? iconTemplate('text-gray-500') : iconTemplate();
        return `<div class="flex items-center gap-2">${icon}${item.name}</div>`;
    }

    getParentPath() {
        if (this.currentPath.match(/^[A-Z]:\\$/)) return '/';
        const path = this.currentPath.endsWith('\\') ?
            this.currentPath.substring(0, this.currentPath.length - 1) :
            this.currentPath;
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
        // Download
        document.getElementById('downloadFile').addEventListener('click', () =>
            this.buttons.download.withLoading(async () => {
                if (!this.selectedItemPath) {
                    alert('Please select a file to download');
                    return;
                }
                try {
                    const url = `/api/download?path=${encodeURIComponent(this.selectedItemPath)}`;
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', '');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (error) {
                    console.error('Error downloading file:', error);
                    alert('Error downloading file');
                }
            })
        );

        // Upload
        document.getElementById('uploadFile').addEventListener('click', () =>
            this.buttons.upload.withLoading(async () => {
                const fileInput = document.getElementById('fileUpload');
                if (fileInput.files.length === 0) {
                    alert('Please select a file to upload');
                    return;
                }
                await this.handleFileUpload(fileInput.files);
            })
        );

        // Delete
        document.getElementById('deleteItem').addEventListener('click', () =>
            this.buttons.delete.withLoading(async () => {
                if (!this.selectedItemPath) {
                    alert('Please select a file or folder to delete');
                    return;
                }

                if (!confirm(`Are you sure you want to delete ${this.selectedItemPath}?`)) {
                    return;
                }

                await this.handleApiCall(
                    '/api/delete', 
                    'POST', 
                    { path: this.selectedItemPath },
                    async () => {
                        await this.listFiles(this.currentPath);
                        document.getElementById('fileOperations').classList.add('hidden');
                        this.selectedItemPath = null;
                    }
                );
            })
        );

        // Create folder
        document.getElementById('createFolder').addEventListener('click', () =>
            this.buttons.createFolder.withLoading(async () => {
                const folderName = document.getElementById('newFolderName').value.trim();
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
                        document.getElementById('newFolderName').value = '';
                    }
                );
            })
        );

        // Rename
        document.getElementById('renameItem').addEventListener('click', () =>
            this.buttons.rename.withLoading(async () => {
                const newName = document.getElementById('renameInput').value.trim();
                if (!this.selectedItemPath || !newName) {
                    alert('Please select a file or folder and enter a new name');
                    return;
                }

                await this.handleApiCall(
                    '/api/rename', 
                    'POST', 
                    { oldPath: this.selectedItemPath, newName },
                    async () => {
                        const newPath = this.currentPath.endsWith('\\') ? 
                            `${this.currentPath}${newName}` : 
                            `${this.currentPath}\\${newName}`;
                        await this.listFiles(this.currentPath, newPath);
                        document.getElementById('fileOperations').classList.add('hidden');
                        this.selectedItemPath = null;
                        document.getElementById('renameInput').value = '';
                    }
                );
            })
        );

        // File selection display
        document.getElementById('fileUpload').addEventListener('change', function() {
            const selectedFileName = document.getElementById('selectedFileName');
            selectedFileName.textContent = this.files.length > 1 ? 
                `${this.files.length} files selected` : 
                this.files[0]?.name || 'No file chosen';
            selectedFileName.classList.toggle('text-gray-400', this.files.length === 0);
            selectedFileName.classList.toggle('text-green-400', this.files.length > 0);
        });
    }

    initialize() {
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
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.element.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            this.element.addEventListener(eventName, () => this.highlight());
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.element.addEventListener(eventName, () => this.unhighlight());
        });

        this.element.addEventListener('drop', (e) => {
            this.onUpload(e.dataTransfer.files, true);
        });
    }

    highlight() {
        this.element.classList.add('bg-blue-500/20', 'border-blue-700');
    }

    unhighlight() {
        this.element.classList.remove('bg-blue-500/20', 'border-blue-700');
    }

    setLoading() {
        this.element.innerHTML = `<div class="text-center">
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