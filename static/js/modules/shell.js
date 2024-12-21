// static/js/modules/shell.js
class InteractiveShell {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.sessionId = null;
        this.commandHistory = [];
        this.historyIndex = -1;
        this.currentCommand = '';
        this.socket = io();
        this.outputPollInterval = null;
        this.currentPrompt = 'C:\\>';

        // Special client-side commands
        this.clientCommands = {
            'cls': this.clearScreen.bind(this),
            'clear': this.clearScreen.bind(this)
        };

        this.initializeUI();
        this.setupEventHandlers();
        this.createShellSession();
    }

    initializeUI() {
        this.terminal = document.createElement('div');
        this.terminal.className = 'terminal bg-gray-900/50 rounded-lg p-4 font-mono text-sm text-green-400 h-96 overflow-y-auto';
        
        this.outputArea = document.createElement('div');
        this.outputArea.className = 'output-area whitespace-pre-wrap';
        
        this.inputLine = document.createElement('div');
        this.inputLine.className = 'input-line flex items-center mt-2';
        
        this.prompt = document.createElement('span');
        this.prompt.className = 'prompt mr-2';
        this.prompt.textContent = this.currentPrompt;
        
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'shell-input flex-1 bg-transparent outline-none text-green-400';
        this.input.autofocus = true;
        
        this.inputLine.appendChild(this.prompt);
        this.inputLine.appendChild(this.input);
        this.terminal.appendChild(this.outputArea);
        this.terminal.appendChild(this.inputLine);
        this.container.appendChild(this.terminal);
    }

    setupEventHandlers() {
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleCommand();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory('up');
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory('down');
            } else if (e.key === 'l' && e.ctrlKey) {
                e.preventDefault();
                this.clearScreen();
            }
        });

        // Focus input when clicking anywhere in the terminal
        this.terminal.addEventListener('click', () => {
            this.input.focus();
        });

        this.socket.on('shell_output', (data) => {
            if (data.output) {
                const lines = data.output.split('\n');
                let outputBuffer = '';

                for (const line of lines) {
                    if (line.startsWith('__UPDATE_PROMPT__')) {
                        this.updatePrompt(line.replace('__UPDATE_PROMPT__', ''));
                    } else if (line.trim()) {
                        outputBuffer += line + '\n';
                    }
                }

                if (outputBuffer) {
                    this.appendOutput(outputBuffer);
                }
            }
        });

        this.socket.on('shell_error', (data) => {
            this.appendOutput(`Error: ${data.message}\n`, 'text-red-500');
        });
    }

    updatePrompt(newPrompt) {
        this.currentPrompt = newPrompt;
        this.prompt.textContent = newPrompt;
    }

    async createShellSession() {
        try {
            const response = await fetch('/api/shell/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            
            if (data.status === 'success') {
                this.sessionId = data.session_id;
                this.appendOutput('Interactive shell session started.\n');
                this.startOutputPolling();
            } else {
                this.appendOutput('Failed to start shell session.\n', 'text-red-500');
            }
        } catch (error) {
            this.appendOutput(`Error: ${error.message}\n`, 'text-red-500');
        }
    }

    startOutputPolling() {
        this.outputPollInterval = setInterval(() => {
            if (this.sessionId) {
                this.socket.emit('shell_poll', { session_id: this.sessionId });
            }
        }, 100);
    }

    handleCommand() {
        const command = this.input.value.trim();
    
        // Always show the current line in output, even if empty
        this.appendOutput(`${this.currentPrompt}${this.input.value}\n`);
    
        if (command) {
            // Add to history
            this.commandHistory.push(command);
            this.historyIndex = this.commandHistory.length;
    
            // Check for client-side commands first
            const baseCommand = command.toLowerCase().split(' ')[0];
            if (this.clientCommands && this.clientCommands[baseCommand]) {
                this.clientCommands[baseCommand](command);
            } else {
                // Send command to server
                this.socket.emit('shell_input', {
                    session_id: this.sessionId,
                    command: command
                });
            }
        } else {
            // For empty commands, just emit a carriage return to maintain proper spacing
            this.socket.emit('shell_input', {
                session_id: this.sessionId,
                command: '\n'
            });
        }
    
        // Clear input
        this.input.value = '';
        this.currentCommand = '';
    }

    clearScreen() {
        this.outputArea.innerHTML = '';
    }

    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;

        if (direction === 'up') {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input.value = this.commandHistory[this.historyIndex];
            }
        } else if (direction === 'down') {
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                this.input.value = this.commandHistory[this.historyIndex];
            } else {
                this.historyIndex = this.commandHistory.length;
                this.input.value = this.currentCommand;
            }
        }
    }

    appendOutput(text, className = '') {
        const output = document.createElement('div');
        output.className = className;
        output.textContent = text;
        this.outputArea.appendChild(output);
        this.terminal.scrollTop = this.terminal.scrollHeight;
    }
}

export { InteractiveShell };