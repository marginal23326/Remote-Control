export class InteractiveShell {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.sessionId = null;
        this.socket = io();
        
        this.currentFontSize = 14;
        this.minFontSize = 8;
        this.maxFontSize = 32;

        this.terminal = new Terminal({
            cursorBlink: true,
            cursorStyle: 'bar',
            theme: {
                background: '#1a1b26',
                foreground: '#a9b1d6',
                cursor: '#c0caf5'
            },
            fontSize: this.currentFontSize,
            fontFamily: 'Consolas, monospace',
            scrollback: 10000
        });

        this.fitAddon = new window.FitAddon.FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        this.terminal.loadAddon(new window.WebLinksAddon.WebLinksAddon());
        this.terminal.loadAddon(new window.SearchAddon.SearchAddon());

        this.initializeTerminal();
        this.setupEventHandlers();
        this.createShellSession();
    }

    initializeTerminal() {
        const terminalElement = document.getElementById('terminalContainer');
        
        // Open terminal
        this.terminal.open(terminalElement);
        
        // Initial fit
        setTimeout(() => {
            this.fitAddon.fit();
            this.updateTerminalSize();
        }, 0);

        // Add resize observer
        const resizeObserver = new ResizeObserver(() => {
            this.fitAddon.fit();
            this.updateTerminalSize();
        });
        resizeObserver.observe(terminalElement);

        // Handle window resize
        window.addEventListener('resize', () => {
            this.fitAddon.fit();
            this.updateTerminalSize();
        });

        // Add wheel event listener for font size control
        terminalElement.addEventListener('wheel', (e) => {
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
        }
    }

    adjustFontSize(delta) {
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
        // Set up restart button
        const restartButton = document.getElementById('restartShellBtn');
        restartButton.addEventListener('click', () => this.restartShell());

        // Handle terminal input
        this.terminal.onData(data => {
            if (this.sessionId) {
                this.socket.emit('shell_input', {
                    session_id: this.sessionId,
                    command: data
                });
            }
        });

        // Handle shell output
        this.socket.on('shell_output', data => {
            if (data.output) {
                this.terminal.write(data.output);
            }
        });

        // Handle errors
        this.socket.on('shell_error', data => {
            this.terminal.writeln(`\r\n\x1b[31mError: ${data.message}\x1b[0m`);
        });

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl + Plus to increase font size
            if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
                e.preventDefault();
                this.adjustFontSize(1);
            }
            // Ctrl + Minus to decrease font size
            else if (e.ctrlKey && e.key === '-') {
                e.preventDefault();
                this.adjustFontSize(-1);
            }
        });

        // Start output polling
        setInterval(() => {
            if (this.sessionId) {
                this.socket.emit('shell_poll', { session_id: this.sessionId });
            }
        }, 100);
    }

    async restartShell() {
        this.terminal.clear();
        this.terminal.writeln('\r\n\x1b[33mRestarting shell session...\x1b[0m');
        await this.createShellSession();
    }

    async createShellSession() {
        try {
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
        } catch (error) {
            this.terminal.writeln(`\r\n\x1b[31mError: ${error.message}\x1b[0m`);
        }
    }

    updateTerminalSize() {
        if (this.sessionId) {
            const { cols, rows } = this.terminal;
            this.socket.emit('shell_resize', {
                session_id: this.sessionId,
                cols,
                rows
            });
        }
    }
}