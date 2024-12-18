// static/js/modules/file.js
import { apiCall, SVG_TEMPLATES, CLASSES, formatFileSize, formatDate } from './utils.js';
import { LoadingButton } from './dom.js';

const downloadButton = new LoadingButton('downloadFile', 'Downloading...');
const deleteButton = new LoadingButton('deleteItem', 'Deleting...');
const renameButton = new LoadingButton('renameItem', 'Renaming...');
const createFolderButton = new LoadingButton('createFolder', 'Creating...');
const uploadButton = new LoadingButton('uploadFile', 'Uploading...');

class DropZone {
    constructor(elementId) {
        this.element = document.getElementById(elementId);
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

let currentPath = '/';
let selectedItemPath = null;
let selectedItem = null;
let currentFileList = [];

function clearSelection() {
    if (selectedItem) {
        selectedItem.classList.remove(CLASSES.selected);
        selectedItem = null;
        selectedItemPath = null;
    }
    
    const elements = ['downloadFile', 'deleteItem', 'renameInput', 'renameItem']
        .forEach(id => {
            const element = document.getElementById(id);
            element.disabled = true;
            if (id === 'renameInput') element.value = '';
        });
}

function createCell(content, colSpan = 1) {
    const cell = document.createElement('td');
    cell.classList.add(...CLASSES.cell);
    if (colSpan > 1) cell.colSpan = colSpan;
    cell.innerHTML = content;
    return cell;
}

function createItemNameCell(item) {
    let iconTemplate = item.is_dir ? SVG_TEMPLATES.folder : SVG_TEMPLATES.file;
    let icon = item.is_dir && item.no_access ? iconTemplate('text-gray-500') : iconTemplate();
    return `<div class="flex items-center gap-2">${icon}${item.name}</div>`;
}

function getParentPath(currentPath) {
    if (currentPath.match(/^[A-Z]:\\$/)) {
        return '/';
    }
    const path = currentPath.endsWith('\\') ?
        currentPath.substring(0, currentPath.length - 1) :
        currentPath;
    return path.substring(0, path.lastIndexOf('\\')) + '\\';
}

function createTableRow(item, classes = []) {
    const row = document.createElement('tr');
    row.classList.add(...CLASSES.row, ...classes);
    if (item) {
        row.dataset.path = item.path;
    }
    return row;
}

function handleItemSelection(row, item) {
    return (event) => {
        const isDirectoryNameCell = event.target.classList.contains('name-cell') && item.is_dir;

        if (isDirectoryNameCell) {
            return;
        }

        if (selectedItem) {
            selectedItem.classList.remove(CLASSES.selected);
        }
        if (selectedItem === row) {
            clearSelection();
        } else {
            row.classList.add(CLASSES.selected);
            selectedItem = row;
            selectedItemPath = item.path;
            document.getElementById('fileOperations').classList.remove('hidden');

            ['downloadFile', 'deleteItem', 'renameInput', 'renameItem'].forEach(id => {
                const element = document.getElementById(id);
                element.disabled = false;
                if (id === 'renameInput') element.value = item.name;
            });

            document.getElementById('downloadFile').disabled = item.is_dir;
        }
    };
}

function handleItemDoubleClick(item) {
    return () => {
        if (item.is_dir && !item.no_access) {
            listFiles(item.path);
        }
    };
}

function createUpDirectoryRow(currentPath) {
    const row = createTableRow();
    row.addEventListener('click', () => listFiles(getParentPath(currentPath)));
    
    const nameCell = createCell(
        `<div class="flex items-center gap-2">${SVG_TEMPLATES.upArrow()}..</div>`,
        3
    );
    row.appendChild(nameCell);
    return row;
}

async function updateFileList(newItems, highlightPath = null) {
    const fileList = document.getElementById('fileList');
    const fragment = document.createDocumentFragment();
    
    if (currentPath !== '/') {
        const upRow = createTableRow(null);
        upRow.addEventListener('click', () => listFiles(getParentPath(currentPath)));
        upRow.appendChild(createCell(
            `<div class="flex items-center gap-2">${SVG_TEMPLATES.upArrow()}..</div>`,
            3
        ));
        fragment.appendChild(upRow);
    }

    for (const item of newItems) {
        const row = createTableRow(item, item.no_access ? CLASSES.noAccess : []);

        row.addEventListener('click', handleItemSelection(row, item));
        row.addEventListener('dblclick', handleItemDoubleClick(item));

        const nameCell = createCell(createItemNameCell(item));
        nameCell.classList.add('name-cell');
        row.appendChild(nameCell);

        if (item.is_dir) {
            row.appendChild(createCell('-'));
            row.appendChild(createCell('-'));
        } else {
            try {
                const stats = await apiCall(`/api/file_info?path=${encodeURIComponent(item.path)}`);
                row.appendChild(createCell(formatFileSize(stats.size)));
                row.appendChild(createCell(formatDate(stats.last_modified)));
            } catch (error) {
                row.appendChild(createCell('Error'));
                row.appendChild(createCell('Error'));
            }
        }

        if (highlightPath && item.path === highlightPath) {
            row.classList.add(CLASSES.highlight);
            setTimeout(() => {
                row.classList.remove(CLASSES.highlight);
            }, 1500);
        }

        fragment.appendChild(row);
    }

    fileList.innerHTML = '';
    fileList.appendChild(fragment);
    currentFileList = newItems;
}

async function listFiles(path, highlightPath = null) {
    clearSelection();
    const fileList = document.getElementById('fileList');
    
    if (path !== currentPath) {
        fileList.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-400">Loading...</td></tr>`;
    }

    try {
        const response = await apiCall(`/api/files?path=${encodeURIComponent(path)}`);
        
        if (response.status === 'error') {
            fileList.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500">${response.message}</td></tr>`;
            if (response.no_access && path !== '/') {
                const upRow = createTableRow(null);
                upRow.addEventListener('click', () => listFiles(getParentPath(path)));
                upRow.appendChild(createCell(
                    `<div class="flex items-center gap-2">${SVG_TEMPLATES.upArrow()}..</div>`,
                    3
                ));
                fileList.appendChild(upRow);
            }
            return;
        }

        currentPath = path;
        document.getElementById('currentPath').textContent = `Current Path: ${currentPath}`;
        
        await updateFileList(response, highlightPath);

    } catch (error) {
        console.error('Error listing files:', error);
        fileList.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-red-500">Error: ${error.message}</td></tr>`;
    }
}

function initializeFileManagement() {
    // File download
    document.getElementById('downloadFile').addEventListener('click', () =>
        downloadButton.withLoading(async () => {
            if (!selectedItemPath) {
                alert('Please select a file to download');
                return;
            }
            try {
                const url = `/api/download?path=${encodeURIComponent(selectedItemPath)}`;
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

    // File upload
    document.getElementById('uploadFile').addEventListener('click', () =>
        uploadButton.withLoading(async () => {
            const fileInput = document.getElementById('fileUpload');
            if (fileInput.files.length === 0) {
                alert('Please select a file to upload');
                return;
            }

            const formData = new FormData();
            const uploadedFiles = [];
            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('files', fileInput.files[i]);
                uploadedFiles.push(fileInput.files[i].name);
            }
            formData.append('path', currentPath);

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (result.status === 'success') {
                    const lastFile = uploadedFiles[uploadedFiles.length - 1];
                    const highlightPath = currentPath.endsWith('\\') ? 
                        `${currentPath}${lastFile}` : 
                        `${currentPath}\\${lastFile}`;
                    await listFiles(currentPath, highlightPath);
                    fileInput.value = '';
                    document.getElementById('selectedFileName').textContent = 'No file chosen';
                } else {
                    alert(result.message);
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                alert('Error uploading file');
            }
        })
    );

    document.getElementById('fileUpload').addEventListener('change', function() {
        updateSelectedFileName(this);
    });

    // File/folder deletion
    document.getElementById('deleteItem').addEventListener('click', () =>
        deleteButton.withLoading(async () => {
            if (!selectedItemPath) {
                alert('Please select a file or folder to delete');
                return;
            }

            if (!confirm(`Are you sure you want to delete ${selectedItemPath}?`)) {
                return;
            }

            try {
                const response = await apiCall('/api/delete', 'POST', { path: selectedItemPath });
                if (response.status === 'success') {
                    alert('Item deleted successfully');
                    listFiles(currentPath);
                    document.getElementById('fileOperations').classList.add('hidden');
                    selectedItemPath = null;
                } else {
                    alert(response.message);
                }
            } catch (error) {
                console.error('Error deleting item:', error);
                alert('Error deleting item');
            }
        })
    );

    // Folder creation
    document.getElementById('createFolder').addEventListener('click', () =>
        createFolderButton.withLoading(async () => {
            const folderName = document.getElementById('newFolderName').value.trim();
            if (!folderName) {
                alert('Please enter a folder name');
                return;
            }

            try {
                const response = await apiCall('/api/create_folder', 'POST', { parentPath: currentPath, folderName });
                if (response.status === 'success') {
                    const newFolderPath = currentPath.endsWith('\\') ? 
                        `${currentPath}${folderName}` : 
                        `${currentPath}\\${folderName}`;
                    await listFiles(currentPath, newFolderPath);
                    document.getElementById('newFolderName').value = '';
                } else {
                    alert(response.message);
                }
            } catch (error) {
                console.error('Error creating folder:', error);
                alert('Error creating folder');
            }
        })
    );

    // File/folder renaming
    document.getElementById('renameItem').addEventListener('click', () =>
        renameButton.withLoading(async () => {
            const newName = document.getElementById('renameInput').value.trim();
            if (!selectedItemPath || !newName) {
                alert('Please select a file or folder and enter a new name');
                return;
            }

            try {
                const response = await apiCall('/api/rename', 'POST', { oldPath: selectedItemPath, newName });
                if (response.status === 'success') {
                    const newPath = currentPath.endsWith('\\') ? 
                        `${currentPath}${newName}` : 
                        `${currentPath}\\${newName}`;
                    await listFiles(currentPath, newPath);
                    document.getElementById('fileOperations').classList.add('hidden');
                    selectedItemPath = null;
                    document.getElementById('renameInput').value = '';
                } else {
                    alert(response.message);
                }
            } catch (error) {
                console.error('Error renaming item:', error);
                alert('Error renaming item');
            }
        })
    );

    // Setup drop zone
    const dropZone = new DropZone('dropZone');
    dropZone.element.addEventListener('drop', async (e) => {
        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        formData.append('path', currentPath);

        dropZone.setLoading();

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.status === 'success') {
                alert('Files uploaded successfully');
                listFiles(currentPath);
            } else {
                alert(result.message);
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            alert('Error uploading files');
        } finally {
            dropZone.reset();
        }
    });

    function updateSelectedFileName(input) {
        const selectedFileName = document.getElementById('selectedFileName');
        selectedFileName.textContent = input.files.length > 1 ? `${input.files.length} files selected` : input.files[0]?.name || 'No file chosen';
        selectedFileName.classList.toggle('text-gray-400', input.files.length === 0);
        selectedFileName.classList.toggle('text-green-400', input.files.length > 0);
    }

    // Initialize file list
    listFiles(currentPath);
}

export { initializeFileManagement };