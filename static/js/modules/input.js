// static/js/modules/input.js
import { apiCall } from './utils.js';
import { streamUI, streamActive, calculateStreamDimensions, isFullscreen } from './stream.js';

function initializeInputHandlers(socket) {
    // Keyboard shortcuts
    document.querySelectorAll('.shortcut').forEach(button => {
        button.addEventListener('click', async () => {
            await apiCall('/api/keyboard/shortcut', 'POST', {
                shortcut: button.dataset.key
            });
        });
    });

    // Text input
    document.getElementById('sendText').addEventListener('click', async () => {
        const text = document.getElementById('textInput').value;
        if (text) {
            await apiCall('/api/keyboard/type', 'POST', { text });
            document.getElementById('textInput').value = '';
        }
    });

    // Shell commands
    document.getElementById('executeCommand').addEventListener('click', async () => {
        const command = document.getElementById('shellCommand').value;
        if (command) {
            const result = await apiCall('/api/shell', 'POST', { command });
            const output = document.getElementById('shellOutput');

            output.innerHTML = '';
            if (result.status === 'success') {
                if (result.stdout) {
                    output.innerHTML += `STDOUT:\n${result.stdout}\n`;
                }
                if (result.stderr) {
                    output.innerHTML += `STDERR:\n${result.stderr}\n`;
                }
                output.innerHTML += `Exit Code: ${result.code}`;
            } else {
                output.innerHTML = `Error: ${result.message}`;
            }

            output.scrollTop = output.scrollHeight;
            document.getElementById('shellCommand').value = '';
        }
    });

    // Other keyboard event handlers
    document.addEventListener('keydown', async (e) => {
        // Only handle keyboard shortcuts when text input is not focused
        if (document.activeElement.tagName !== 'TEXTAREA' &&
            document.activeElement.tagName !== 'INPUT') {

            const key = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
                e.preventDefault();
                await apiCall('/api/keyboard/shortcut', 'POST', {
                    shortcut: key.replace('arrow', '')
                });
            }
        }
    });

    // Handle Enter key in shell command input
    document.getElementById('shellCommand').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('executeCommand').click();
        }
    });

    // Handle Enter key in text input
    document.getElementById('textInput').addEventListener('keypress', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            document.getElementById('sendText').click();
        }
    });

    document.getElementById('sendCustomShortcut').addEventListener('click', async () => {
        const modifiers = Array.from(document.querySelectorAll('.modifier-key:checked'))
            .map(cb => cb.value);
        const key = document.getElementById('customKey').value.toLowerCase().trim();

        if (key) {
            await apiCall('/api/keyboard/shortcut', 'POST', {
                shortcut: key,
                modifiers: modifiers
            });
        }
    });

    document.querySelectorAll('.accordion > button').forEach(button => {
        button.addEventListener('click', () => {
            const content = button.nextElementSibling;
            const icon = button.querySelector('span + svg');
            
            content.classList.toggle('active');
            icon.style.transform = content.classList.contains('active') ? 'rotate(180deg)' : '';
            
            // Close other accordions
            document.querySelectorAll('.accordion-content').forEach(otherContent => {
                if (otherContent !== content) {
                    otherContent.classList.remove('active');
                    const otherIcon = otherContent.previousElementSibling.querySelector('span + svg');
                    if (otherIcon) {
                        otherIcon.style.transform = '';
                    }
                }
            });
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
    window.addEventListener('blur', () => {
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