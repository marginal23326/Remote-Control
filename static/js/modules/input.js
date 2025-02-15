// static/js/modules/input.js
import { apiCall } from './utils.js';
import { streamUI, streamActive, calculateStreamDimensions, isFullscreen } from './stream.js';

function initializeInputHandlers(socket) {
    // Keyboard shortcuts
    document.querySelectorAll('[data-key]').forEach(button => {
        button.addEventListener('click', async () => {
            await apiCall('/api/keyboard/shortcut', 'POST', {
                shortcut: button.dataset.key
            });
        });
    });

    // Text input handling
    const textInput = document.getElementById('textInput');
    const sendTextButton = textInput?.nextElementSibling;

    if (sendTextButton && textInput) {
        async function sendText() {
            const text = textInput.value;
            if (text) {
                await apiCall('/api/keyboard/type', 'POST', { text });
                textInput.value = '';
            }
        }

        // Send text on button click
        sendTextButton.addEventListener('click', sendText);

        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                sendText();
            }
        });
    }

    // Custom shortcut handling
    const customKeyInput = document.getElementById('customKey');
    const sendCustomButton = document.getElementById('sendCustomShortcut');

    // Modifier keys
    const modifierButtons = document.querySelectorAll('.modifier-btn');
    let activeModifiers = [];

    modifierButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modifier = button.dataset.modifier;
            button.classList.toggle('active');

            // Toggle the inner dot visibility
            const dot = button.querySelector('.w-2.h-2');
            if (dot) {
                dot.style.opacity = button.classList.contains('active') ? '1' : '0';
            }

            // Update activeModifiers array
            if (button.classList.contains('active')) {
                if (!activeModifiers.includes(modifier)) {
                    activeModifiers.push(modifier);
                }
            } else {
                activeModifiers = activeModifiers.filter(m => m !== modifier);
            }
        });
    });

    // Send Custom Shortcut
    if (sendCustomButton && customKeyInput) {
        sendCustomButton.addEventListener('click', async () => {
            // Send an empty string if the input is empty
            const key = customKeyInput.value.toLowerCase().trim() || ''; 
            if (key.length > 0 || activeModifiers.length > 0) {
                await apiCall('/api/keyboard/shortcut', 'POST', {
                    shortcut: key,
                    modifiers: activeModifiers
                });
            }
            // Clear the custom key input after sending
            customKeyInput.value = '';
        });
    }

    // Accordion functionality
    const accordions = document.querySelectorAll('.group');
    accordions.forEach(accordion => {
        const button = accordion.querySelector('button');
        
        button?.addEventListener('click', () => {
            const isCurrentlyActive = accordion.classList.contains('active');
            
            // Close all accordions
            accordions.forEach(other => {
                other.classList.remove('active');
            });

            // Toggle current accordion
            if (!isCurrentlyActive) {
                accordion.classList.add('active');
            }
        });
    });

    // Mouse event handlers
    let touchStarted = false;
    let isCtrlPressed = false;
    let initialTouchY = null;
    let isScrolling = false;
    let isDragging = false;

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Control') {
            isCtrlPressed = true;
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.key === 'Control') {
            isCtrlPressed = false;
        }
    });

    // Handle case where user switches windows while holding Ctrl
    window.addEventListener('blur-sm', () => {
        isCtrlPressed = false;
        isDragging = false;
    });

    // Prevent dragging
    streamUI.view.addEventListener('dragstart', (event) => {
        event.preventDefault();
    });

    // Handle mouse wheel events
    streamUI.view.addEventListener('wheel', (event) => {
        event.preventDefault();
        sendMouseEvent('scroll', event, { dx: 0, dy: -Math.sign(event.deltaY) });
    });

    // Touch event handlers
    streamUI.view.addEventListener('touchstart', (event) => {
        event.preventDefault();

        if (event.touches.length === 2) {
            if (touchStarted) {
                touchStarted = false;
                const touch = event.touches[0];
                sendMouseEvent('click', touch, { button: 'left', pressed: false });
            }
            isScrolling = true;
            initialTouchY = event.touches[1].clientY;
            return;
        }

        if (event.touches.length === 1 && !isScrolling) {
            touchStarted = true;
            const touch = event.touches[0];
            sendMouseEvent('click', touch, { button: 'left', pressed: true });
        }
    });

    streamUI.view.addEventListener('touchmove', (event) => {
        event.preventDefault();

        if (event.touches.length === 2 && isScrolling && initialTouchY !== null) {
            const currentTouchY = event.touches[1].clientY;
            const deltaY = initialTouchY - currentTouchY;

            if (Math.abs(deltaY) > 5) {
                sendMouseEvent('scroll', event.touches[0], { dx: 0, dy: -Math.sign(deltaY) });
                initialTouchY = currentTouchY;
            }
            return;
        }

        if (event.touches.length === 1 && touchStarted && !isScrolling) {
            const touch = event.touches[0];
            sendMouseEvent('move', touch);
        }
    });

    streamUI.view.addEventListener('touchend', (event) => {
        event.preventDefault();

        if (event.touches.length === 0) {
            isScrolling = false;
            initialTouchY = null;
        }

        if (touchStarted && event.touches.length === 0) {
            touchStarted = false;
            const lastTouch = event.changedTouches[0];
            sendMouseEvent('click', lastTouch, { button: 'left', pressed: false });
        }
    });

    streamUI.view.addEventListener('touchcancel', (event) => {
        event.preventDefault();
        isScrolling = false;
        initialTouchY = null;

        if (touchStarted) {
            touchStarted = false;
            const lastTouch = event.changedTouches[0];
            sendMouseEvent('click', lastTouch, { button: 'left', pressed: false });
        }
    });

    // Mouse event handlers
    streamUI.view.addEventListener('mousemove', (event) => {
        event.preventDefault();
        // Send move events if we're dragging or if Ctrl is pressed
        if (isDragging || isCtrlPressed) {
            sendMouseEvent('move', event);
        }
    });

    streamUI.view.addEventListener('mousedown', (event) => {
        event.preventDefault();
        const button = event.button === 0 ? 'left' : event.button === 2 ? 'right' : 'middle';
        sendMouseEvent('click', event, { button, pressed: true });

        // Set dragging state on left click
        if (button === 'left') {
            isDragging = true;
        }
    });

    streamUI.view.addEventListener('mouseup', (event) => {
        event.preventDefault();
        const button = event.button === 0 ? 'left' : event.button === 2 ? 'right' : 'middle';
        sendMouseEvent('click', event, { button, pressed: false });

        // Clear dragging state
        if (button === 'left') {
            isDragging = false;
        }
    });

    streamUI.view.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    function sendMouseEvent(type, event, options = {}) {
        if (!streamActive) return;
        
        // Process move events during drag or when Ctrl is pressed
        if (type === 'move' && !isCtrlPressed && !isDragging && !touchStarted) {
            return;
        }
        
        const clientX = event.touches ? event.clientX : event.clientX;
        const clientY = event.touches ? event.clientY : event.clientY;
        
        const dimensions = calculateStreamDimensions();
        const relativeX = clientX - dimensions.container.left - dimensions.offsetX;
        const relativeY = clientY - dimensions.container.top - dimensions.offsetY;
        
        const x = Math.max(0, Math.min(streamUI.nativeWidth, relativeX * dimensions.scaleX));
        const y = Math.max(0, Math.min(streamUI.nativeHeight, relativeY * dimensions.scaleY));
        
        const data = { type, x, y, ...options };
        socket.emit('mouse_event', data);
    }
}

export { initializeInputHandlers };