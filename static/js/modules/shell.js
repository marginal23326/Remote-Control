import { SVG_TEMPLATES } from './utils.js';

export class InteractiveShell {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.sessionId = null;
        this.socket = io();
        this.isStarted = false;

        this.terminal = new Terminal({
            cursorStyle: 'bar',
            cursorInactiveStyle: 'none',
            cursorBlink: true,
            windowsPty: {
                backend: 'conpty'
            },
            fontFamily: 'Consolas, monospace',
            scrollback: 10000
        });

        this.fitAddon = new window.FitAddon.FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        this.terminal.loadAddon(new window.WebLinksAddon.WebLinksAddon());

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

        // Initial fit
        setTimeout(() => {
            this.fitAddon.fit();
            this.updateTerminalSize();
        }, 100);

        // Resize handling
        const resizeObserver = new ResizeObserver(() => {
            if (this.isStarted) {
                this.fitAddon.fit();
                this.updateTerminalSize();
            }
        });
        resizeObserver.observe(terminalElement);

        window.addEventListener('resize', () => {
            if (this.isStarted) {
                this.fitAddon.fit();
                this.updateTerminalSize();
            }
        });

        // Font size adjustment with Ctrl+Wheel
        terminalElement.addEventListener('wheel', (e) => {
            if (this.isStarted && e.ctrlKey) {
                e.preventDefault();
                this.adjustFontSize(e.deltaY < 0 ? 1 : -1);
            }
        });

        // Style adjustments
        const xtermElement = terminalElement.querySelector('.xterm');
        if (xtermElement) {
            xtermElement.style.padding = '8px';
        }
    }

    adjustFontSize(delta) {
        if (!this.isStarted) return;

        const currentFontSize = this.terminal.options.fontSize;
        const minFontSize = 8;
        const maxFontSize = 32;
        const newSize = Math.max(minFontSize, Math.min(maxFontSize, currentFontSize + delta));

        if (newSize !== currentFontSize) {
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

            if (event.ctrlKey && ((event.key === 'c' && this.terminal.hasSelection()) || event.key === 'v')) {
                if (event.key === 'c') {
                    setTimeout(() => this.terminal.clearSelection(), 0);
                }
                return false;
            }

            return true;
        });

        terminalContainer.addEventListener('contextmenu', (e) => {
            if (!this.isStarted) return;
            e.preventDefault();
            
            if (this.terminal.hasSelection()) {
                navigator.clipboard.writeText(this.terminal.getSelection());
                this.terminal.clearSelection();
            } else {
                navigator.clipboard.readText().then(text => {
                    if (text && this.isStarted) {
                        this.terminal.paste(text);
                    }
                });
            }
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

        // Start output polling
        setInterval(() => {
            if (this.sessionId && this.isStarted) {
                this.socket.emit('shell_poll', { session_id: this.sessionId });
            }
        }, 100);
    }

    async restartShell() {
        if (!this.isStarted) return;

        this.terminal.clear();
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