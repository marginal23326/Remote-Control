// static/js/modules/utils.js
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {}
    };
    if (data) {
        if (data instanceof FormData) {
            options.body = data;
        } else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }
    }
    
    const response = await fetch(endpoint, options);
    return response.json();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

const SVG_TEMPLATES = {
    upArrow: () => `
        <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-width="2" d="M12 19V9m0 0-4 4m4-4 4 4"/>
        </svg>`,
    folder: (colorClass = 'text-blue-400') => `
        <svg class="w-5 h-5 ${colorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>`,
    file: () => `
        <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-width="2" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-3 7h3m-3 4h3m-6-4h0m0 4h0"/>
        </svg>`,
    spinner: (size = 4) => `
        <svg class="animate-spin w-${size} h-${size}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5 0 0 5 0 12zm2 5a8 8 0 0 1-2-5H0c0 3 1 6 3 8z"/>
        </svg>`,
    upload: (size = 10, colorClass = 'text-blue-500/70') => `
        <svg class="w-${size} h-${size} mx-auto mb-2 ${colorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-width="2" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12"/>
        </svg>`,
    cross: () => `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>`
};

const CLASSES = {
    row: ['cursor-pointer'],
    cell: ['px-2', 'whitespace-nowrap'],
    noAccess: ['opacity-50', 'cursor-not-allowed'],
    highlight: 'bg-yellow-400/30',
    defaultHover: 'hover:bg-gray-700/50'
};

class SelectionManager {
    constructor(config) {
        this.selectedItems = new Set();
        this.lastSelectedItem = null;
        this.selectionAnchor = null;
        this.isDragging = false;
        this.dragStartElement = null;
        this.scrollAnimationFrame = null;
        this.currentScrollSpeed = 0;
        this.config = {
            containerSelector: '',
            itemSelector: 'tr',
            selectedClass: 'bg-blue-500/50',
            defaultHoverClass: 'hover:bg-gray-700/50',
            selectedHoverClass: 'hover:bg-blue-700/50',
            disabledClass: 'cursor-not-allowed opacity-50',
            getItemId: (element) => element.dataset.id,
            isItemSelectable: (element) => !element.classList.contains('cursor-not-allowed'),
            onSelectionChange: () => {},
            ...config
        };
    }

    initialize() {
        const container = document.querySelector(this.config.containerSelector);
        if (!container) return;

        container.addEventListener('mousedown', (e) => {
            const item = e.target.closest(this.config.itemSelector);
            if (item && this.config.getItemId(item)) {
                if (e.button === 0) { // Left click
                    this.handleItemSelection(item, e);
                    this.handleDragStart(e, item);
                }
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

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                const container = document.querySelector(this.config.containerSelector);
                if (!container) return;

                const selectableItems = Array.from(container.querySelectorAll(this.config.itemSelector))
                    .filter(item => this.config.isItemSelectable(item));
                
                this.clearSelection();
                selectableItems.forEach(item => this.toggleItemSelection(item, true));
            }
        });
    }

    handleItemSelection(item, event) {
        if (!this.config.isItemSelectable(item)) return;

        if (event.shiftKey) {
            if (!this.selectionAnchor) {
                this.selectionAnchor = item;
                this.toggleItemSelection(item, true);
            } else {
                this.handleRangeSelection(item, this.selectionAnchor);
            }
            this.lastSelectedItem = item;
        } else if (event.ctrlKey || event.metaKey) {
            this.toggleItemSelection(item, !this.selectedItems.has(item));
            this.lastSelectedItem = item;
            this.selectionAnchor = item;
        } else {
            this.clearSelection();
            this.toggleItemSelection(item, true);
            this.lastSelectedItem = item;
            this.selectionAnchor = item;
        }

        this.config.onSelectionChange(this.getSelectedItems());
    }

    notifyItemsUpdate() {
        const currentSelectionIds = Array.from(this.selectedItems).map(item => this.config.getItemId(item));
        
        const currentAnchorItemId = this.selectionAnchor ? this.config.getItemId(this.selectionAnchor) : null;

        this.clearSelection();
        const container = document.querySelector(this.config.containerSelector);
        if (!container) return;

        const items = Array.from(container.querySelectorAll(this.config.itemSelector));

        currentSelectionIds.forEach(id => {
            const item = items.find(item => this.config.getItemId(item) === id);
            if (item) {
                this.toggleItemSelection(item, true);
            }
        });

        if (currentAnchorItemId) {
            this.selectionAnchor = items.find(item => this.config.getItemId(item) === currentAnchorItemId);
        }
    }

    handleDragStart(event, item) {
        if (!this.config.isItemSelectable(item)) return;
        if (event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey) return;

        this.isDragging = true;
        this.dragStartElement = item;

        if (!this.selectedItems.has(item)) {
            this.clearSelection();
            this.selectionAnchor = item;
            this.toggleItemSelection(item, true);
        }

        event.preventDefault();
    }

    handleDragMove(event) {
        if (!this.isDragging || !this.dragStartElement) return;

        const container = document.querySelector(this.config.containerSelector);
        const rect = container.getBoundingClientRect();
        const mouseY = event.clientY;

        const items = Array.from(container.querySelectorAll(this.config.itemSelector))
            .filter(item => this.config.isItemSelectable(item));

        let targetItem = null;
        for (const item of items) {
            const itemRect = item.getBoundingClientRect();
            if (mouseY >= itemRect.top && mouseY <= itemRect.bottom) {
                targetItem = item;
                break;
            }
        }

        if (targetItem) {
            this.handleRangeSelection(targetItem, this.dragStartElement);
            this.lastSelectedItem = targetItem;
        }

        const scrollThreshold = 60;
        const maxScrollSpeed = 15;
        const scrollContainer = container.closest('.overflow-auto');

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

    handleDragEnd() {
        this.isDragging = false;
        this.dragStartElement = null;
        this.currentScrollSpeed = 0;
        if (this.scrollAnimationFrame) {
            cancelAnimationFrame(this.scrollAnimationFrame);
            this.scrollAnimationFrame = null;
        }
        this.config.onSelectionChange(this.getSelectedItems());
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

    handleRangeSelection(item, anchorItem) {
        const container = document.querySelector(this.config.containerSelector);
        const items = Array.from(container.querySelectorAll(this.config.itemSelector))
            .filter(item => this.config.isItemSelectable(item));

        const currentIndex = items.indexOf(item);
        const anchorIndex = items.indexOf(anchorItem);

        if (currentIndex === -1 || anchorIndex === -1) return;

        this.clearSelection();

        const start = Math.min(currentIndex, anchorIndex);
        const end = Math.max(currentIndex, anchorIndex);

        items.slice(start, end + 1).forEach(item => this.toggleItemSelection(item, true));
    }

    clearSelection() {
        this.selectedItems.forEach(item => this.toggleItemSelection(item, false));
        this.selectedItems.clear();
        this.lastSelectedItem = null;
        this.config.onSelectionChange(this.getSelectedItems());
    }

    getSelectedItems() {
        return Array.from(this.selectedItems);
    }

    toggleItemSelection(item, add) {
        item.classList.toggle(this.config.selectedClass, add);
        item.classList.toggle(this.config.defaultHoverClass, !add);
        if (add) {
            this.selectedItems.add(item);
        } else {
            this.selectedItems.delete(item);
        }
        this.updateItemHover(item);
    }

    updateItemHover(item) {
        const isSelected = this.selectedItems.has(item);
        const isHovered = item.dataset.hovered === 'true';
        item.classList.toggle(this.config.selectedHoverClass, isSelected && isHovered);
    }
}

// Context menu manager
class ContextMenuManager {
    constructor(config) {
        this.menuElement = null;
        this.config = {
            menuClass: 'context-menu',
            menuItemClass: 'px-4 py-2 text-white hover:bg-gray-600 cursor-pointer',
            getMenuItems: () => [],
            ...config
        };
    }

    hide() {
        if (this.menuElement) {
            this.menuElement.remove();
            this.menuElement = null;
        }
    }

    show(x, y, context) {
        this.hide();
        
        const items = this.config.getMenuItems(context);
        if (!items.length) return;

        this.menuElement = document.createElement('div');
        this.menuElement.classList.add(this.config.menuClass);
        this.menuElement.style.position = 'fixed';
        this.menuElement.style.left = `${x}px`;
        this.menuElement.style.top = `${y}px`;
        
        const ul = document.createElement('ul');
        ul.className = 'bg-gray-700 border border-gray-600 rounded-lg py-2';
        
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = this.config.menuItemClass;
            li.textContent = item.label;
            li.addEventListener('click', () => {
                item.action();
                this.hide();
            });
            ul.appendChild(li);
        });

        this.menuElement.appendChild(ul);
        document.body.appendChild(this.menuElement);
    }
}

class UIManager {
    constructor(config) {
        this.config = {
            containerSelector: '',
            isDraggingEnabled: true,
            isContextMenuEnabled: true,
            isSelectionEnabled: true,
            getContextMenuItems: () => [],
            onSelectionChange: () => {},
            ...config
        };
        
        this.isDragging = false;
        this.selectionManager = this.config.isSelectionEnabled ? new SelectionManager({
            containerSelector: this.config.containerSelector,
            itemSelector: this.config.itemSelector || 'tr',
            getItemId: this.config.getItemId,
            isItemSelectable: this.config.isItemSelectable,
            onSelectionChange: (items) => {
                this.isDragging = false;
                this.config.onSelectionChange(items);
            }
        }) : null;

        this.contextMenu = this.config.isContextMenuEnabled ? new ContextMenuManager({
            getMenuItems: this.config.getContextMenuItems
        }) : null;
    }

    initialize() {
        if (this.selectionManager) {
            this.selectionManager.initialize();
        }

        this.initializeDragHandling();
        this.initializeContextMenu();
        this.initializePreventDefaults();
    }

    initializeDragHandling() {
        if (!this.config.isDraggingEnabled) return;

        const container = document.querySelector(this.config.containerSelector);
        if (!container) return;

        container.addEventListener('mousedown', (e) => {
            const row = e.target.closest(this.config.itemSelector || 'tr');
            if (row?.dataset?.[this.config.itemDataAttribute || 'path']) {
                this.isDragging = true;
                this.selectionManager?.handleDragStart(e, row);
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.selectionManager?.isDragging) {
                this.selectionManager.handleDragMove(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging || this.selectionManager?.isDragging) {
                this.isDragging = false;
                this.selectionManager?.handleDragEnd();
            }
        });

        container.addEventListener('dragstart', (e) => {
            if (this.selectionManager?.isDragging) {
                e.preventDefault();
            }
        });
    }

    initializeContextMenu() {
        if (!this.config.isContextMenuEnabled || !this.contextMenu) return;

        const container = document.querySelector(this.config.containerSelector);
        if (!container) return;

        container.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            const row = event.target.closest(this.config.itemSelector || 'tr');
            if (!row || !row.dataset?.[this.config.itemDataAttribute || 'path']) return;

            if (!this.selectionManager?.selectedItems.has(row)) {
                this.selectionManager?.clearSelection();
                this.selectionManager?.toggleItemSelection(row, true);
                this.config.onSelectionChange(this.selectionManager?.getSelectedItems() || []);
            }

            this.contextMenu.show(event.clientX, event.clientY);
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('.context-menu')) {
                this.contextMenu.hide();
            }
        });
    }

    initializePreventDefaults() {
        const container = document.querySelector(this.config.containerSelector);
        if (!container) return;

        container.addEventListener('mousedown', (event) => {
            event.preventDefault();
        });

        container.addEventListener('selectstart', (event) => {
            event.preventDefault();
        });
    }

    getSelectedItems() {
        return this.selectionManager?.getSelectedItems() || [];
    }

    clearSelection() {
        this.selectionManager?.clearSelection();
    }
}

class BaseFileManager extends UIManager {
    constructor() {
        super({
            containerSelector: '#fileList',
            itemDataAttribute: 'path',
            getItemId: (element) => element.dataset.path,
            isItemSelectable: (element) => !element.classList.contains(...CLASSES.noAccess),
            getContextMenuItems: (context) => {
                const selectedItems = context?.selectedItems || this.getSelectedItems();
                if (!selectedItems.length) return [];

                const items = [];
                const hasDirectories = selectedItems.some(item => item.dataset.isDir === 'true');
                const singleItem = selectedItems.length === 1;

                if (!hasDirectories) {
                    items.push({
                        label: 'Download',
                        action: () => this.handleDownload(selectedItems)
                    });
                }

                if (singleItem) {
                    items.push({
                        label: 'Rename',
                        action: () => {
                            document.getElementById('renameInput').focus();
                        }
                    });
                }

                items.push({
                    label: 'Delete',
                    action: () => this.handleDelete(selectedItems)
                });

                return items;
            },
            onSelectionChange: () => this.updateFileOperationsUI()
        });
    }
}

class BaseTaskManager extends UIManager {
    constructor() {
        super({
            containerSelector: '#taskList',
            itemDataAttribute: 'pid',
            getItemId: (element) => element.dataset.pid,
            isItemSelectable: (element) => true,
            getContextMenuItems: () => [{
                label: 'End Task',
                action: () => {
                    this.getSelectedItems().forEach(item => {
                        this.killProcess(parseInt(item.dataset.pid));
                    });
                }
            }],
            onSelectionChange: (selectedItems) => {
                const endTaskContainer = document.getElementById('endTaskContainer');
                if (!this.isDragging) {
                    endTaskContainer.classList.toggle('hidden', selectedItems.length === 0);
                }
            }
        });
    }
}

export { apiCall, formatFileSize, formatDate, SVG_TEMPLATES, CLASSES, BaseFileManager, BaseTaskManager };