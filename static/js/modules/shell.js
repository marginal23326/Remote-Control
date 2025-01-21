import { SVG_TEMPLATES } from './utils.js';

export class InteractiveShell {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.sessionId = null;
        this.socket = io();
        this.isStarted = false;

        this.currentFontSize = 14;
        this.minFontSize = 8;
        this.maxFontSize = 32;

        this.terminal = new Terminal({
            cursorStyle: 'bar',
            cursorInactiveStyle: 'none',
            cursorBlink: true,
            theme: {
                background: '#1a1b26',
                foreground: '#a9b1d6',
                cursor: '#c0caf5'
            },
            fontSize: this.currentFontSize,
            fontFamily: 'Consolas, monospace',
            scrollback: 10000,
            convertEol: true,
            disableStdin: true
        });

        this.fitAddon = new window.FitAddon.FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        this.terminal.loadAddon(new window.WebLinksAddon.WebLinksAddon());
        this.terminal.loadAddon(new window.SearchAddon.SearchAddon());

        this.isSelectionMode = false;
        this.longPressTimeout = null;
        this.longPressDuration = 500; // ms

        this.initializeTerminal();
        this.setupEventHandlers();
    }

    toggleTextMode() {
        const overlay = document.getElementById('shellTextOverlay');
        const content = document.getElementById('shellTextContent');

        if (overlay && content) {
            overlay.classList.remove('hidden');
            content.textContent = this.getAllTerminalContent();
        }
    }

    closeTextMode() {
        const overlay = document.getElementById('shellTextOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    getAllTerminalContent() {
        let content = '';
        for (let i = 0; i < this.terminal.buffer.active.length; i++) {
            const line = this.terminal.buffer.active.getLine(i);
            if (line) {
                content += line.translateToString() + '\n';
            }
        }
        return content;
    }

    initializeTerminal() {
        const terminalElement = document.getElementById('terminalContainer');

        // Open terminal
        this.terminal.open(terminalElement);

        // Apply styles to prevent text wrapping
        const xtermViewport = terminalElement.querySelector('.xterm-viewport');
        if (xtermViewport) {
            xtermViewport.style.overflowY = 'auto';
        }

        const xtermScreen = terminalElement.querySelector('.xterm-screen');
        if (xtermScreen) {
            xtermScreen.style.width = '100%';
            xtermScreen.style.height = '100%';
        }

        // Initial fit with a small delay to ensure proper rendering
        setTimeout(() => {
            this.fitAddon.fit();
            this.updateTerminalSize();
        }, 100);

        terminalElement.addEventListener('contextmenu', async (e) => {
            if (!this.isStarted) return;
            e.preventDefault();

            if (this.terminal.hasSelection()) {
                await this.copySelectedText(true);
            } else {
                await this.pasteText();
            }
        });

        // Add resize observer
        const resizeObserver = new ResizeObserver(() => {
            if (this.isStarted) {
                this.fitAddon.fit();
                this.updateTerminalSize();
            }
        });
        resizeObserver.observe(terminalElement);

        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.isStarted) {
                this.fitAddon.fit();
                this.updateTerminalSize();
            }
        });

        // Improve text selection handling
        terminalElement.addEventListener('mousedown', (e) => {
            if (!this.isStarted) return;
            const xtermSelection = terminalElement.querySelector('.xterm-selection');
            if (xtermSelection) {
                xtermSelection.style.pointerEvents = 'auto';
                xtermSelection.style.userSelect = 'text';
            }
        });

        // Add wheel event listener for font size control
        terminalElement.addEventListener('wheel', (e) => {
            if (!this.isStarted) return;
            if (e.ctrlKey) {
                e.preventDefault();
                this.adjustFontSize(e.deltaY < 0 ? 1 : -1);
            }
        });

        // Style adjustments
        const xtermElement = terminalElement.querySelector('.xterm');
        if (xtermElement) {
            xtermElement.style.padding = '8px';
            xtermElement.style.height = '100%';
            xtermElement.style.width = '100%';
            xtermElement.style.position = 'relative';
        }
    }

    adjustFontSize(delta) {
        if (!this.isStarted) return;

        const newSize = Math.max(this.minFontSize,
            Math.min(this.maxFontSize,
            this.currentFontSize + delta));

        if (newSize !== this.currentFontSize) {
            this.currentFontSize = newSize;
            this.terminal.options.fontSize = newSize;
            this.fitAddon.fit();
            this.updateTerminalSize();
        }
    }

    setupEventHandlers() {
        const startButton = document.getElementById('startShellBtn');
        const restartButton = document.getElementById('restartShellBtn');
        const terminalContainer = document.getElementById('terminalContainer');
        const textModeBtn = document.getElementById('shellTextModeBtn');
        const closeTextBtn = document.getElementById('shellCloseTextBtn');

        if (textModeBtn) {
            textModeBtn.addEventListener('click', () => this.toggleTextMode());
        }

        if (closeTextBtn) {
            closeTextBtn.innerHTML = SVG_TEMPLATES.cross();
            closeTextBtn.addEventListener('click', () => this.closeTextMode());
        }

        startButton.addEventListener('click', async () => {
            if (!this.isStarted) {
                this.isStarted = true;
                startButton.classList.add('hidden');
                restartButton.classList.remove('hidden');
                terminalContainer.style.opacity = '1';
                this.terminal.options.disableStdin = false;
                await this.createShellSession();
                this.fitAddon.fit();
            }
        });

        restartButton.addEventListener('click', () => this.restartShell());

        this.terminal.onData(data => {
            if (this.sessionId && this.isStarted) {
                this.socket.emit('shell_input', {
                    session_id: this.sessionId,
                    command: data
                });
            }
        });

        this.socket.on('shell_output', data => {
            if (data.output && this.isStarted) {
                this.terminal.write(data.output);
            }
        });

        this.terminal.attachCustomKeyEventHandler((event) => {
            if (event.type !== 'keydown') return true;

            if (event.ctrlKey && event.key === 'c') {
                if (this.terminal.hasSelection()) {
                    setTimeout(() => this.terminal.clearSelection(), 0);
                    return false;
                }
            }

            if (event.ctrlKey && event.key === 'v') {
                return false;
            }

            return true;
        });

        document.addEventListener('keydown', (e) => {
            if (!this.isStarted) return;
            if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
                e.preventDefault();
                this.adjustFontSize(1);
            } else if (e.ctrlKey && e.key === '-') {
                e.preventDefault();
                this.adjustFontSize(-1);
            }
        });

        // Start output polling only when shell is active
        setInterval(() => {
            if (this.sessionId && this.isStarted) {
                this.socket.emit('shell_poll', { session_id: this.sessionId });
            }
        }, 100);
    }

    async copySelectedText(isRightClick = false) {
        if (this.terminal.hasSelection()) {
            if (isRightClick) {
                const text = this.terminal.getSelection();
                await navigator.clipboard.writeText(text);
            }
            this.terminal.clearSelection();
        }
    }

    async pasteText() {
        const text = await navigator.clipboard.readText();
        if (text && this.sessionId && this.isStarted) {
            this.socket.emit('shell_input', {
                session_id: this.sessionId,
                command: text
            });
        }
    }

    async restartShell() {
        if (!this.isStarted) return;

        this.terminal.clear();
        this.terminal.writeln('\r\n\x1b[33mRestarting shell session...\x1b[0m');
        await this.createShellSession();
    }

    async createShellSession() {
        const { cols, rows } = this.terminal;
        const response = await fetch('/api/shell/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cols, rows })
        });

        const data = await response.json();
        if (data.status === 'success') {
            this.sessionId = data.session_id;
            this.terminal.writeln('Interactive shell session started.');
            this.updateTerminalSize();
        } else {
            this.terminal.writeln('\r\n\x1b[31mFailed to start shell session.\x1b[0m');
        }
    }

    updateTerminalSize() {
        if (this.sessionId && this.isStarted) {
            const { cols, rows } = this.terminal;
            this.socket.emit('shell_resize', {
                session_id: this.sessionId,
                cols,
                rows
            });
        }
    }
}