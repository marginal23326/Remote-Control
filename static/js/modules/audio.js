// static/js/modules/audio.js
class AudioManager {
    constructor(socket) {
        this.socket = socket;
        this.audioContext = null;
        this.currentStream = null;
        this.workletNode = null;
        this.audioQueue = [];
        this.isProcessingAudio = false;
        this.currentSettings = {
            server: { rate: 48000, chunk: 4096 },
            client: { rate: 48000, chunk: 512 }
        };
        this.streamActive = {
            server: false,
            client: false
        };

        this.handleServerAudioData = this.handleServerAudioData.bind(this);
        this.initializeEventListeners();
    }
    
    validateSampleRate(rate) {
        const MIN_RATE = 3000;
        const MAX_RATE = 768000;
        if (rate < MIN_RATE || rate > MAX_RATE) {
            alert(`Sample rate must be between ${MIN_RATE} and ${MAX_RATE}`);
            return false;
        }
        return true;
    }
    
    async ensureAudioContext(sampleRate) {
        if (!this.validateSampleRate(sampleRate)) {
            return false;
        }
        
        if (this.audioContext) {
            if (this.audioContext.sampleRate !== sampleRate) {
                await this.audioContext.close();
                this.audioContext = null;
            }
        }
        
        if (!this.audioContext) {
            this.audioContext = new AudioContext({ sampleRate });
        }
        
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        return true;
    }

    async initializeAudioWorklet() {
        try {
            // Remove any existing worklet before adding new one
            if (this.workletNode) {
                this.cleanupWorklet();
            }
            await this.audioContext.audioWorklet.addModule('/static/audio-worklet-processor.js');
        } catch (e) {
            console.error('Failed to add audio worklet module:', e);
            throw e;
        }
    }

    async getMicrophoneStream(settings) {
        try {
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
                this.currentStream = null;
            }
            
            return await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: settings.rate,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
        } catch (error) {
            console.error('Error accessing microphone:', error);
            return null;
        }
    }

    async updateSettings(settings) {
        const type = settings.type;
        const needsReset = JSON.stringify(this.currentSettings[type]) !== JSON.stringify(settings);
        
        if (needsReset) {
            // Stop current stream before applying new settings
            await this.stopAudioStream(type, true);
            this.currentSettings[type] = { ...settings };
        }

        await fetch('/api/stream/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_settings: settings })
        });
        
        return needsReset;
    }

    async startAudioStream(type, settings = {}) {
        try {
            // Check if stream is already active and settings haven't changed
            if (this.streamActive[type] && !await this.updateSettings({ ...settings, type })) {
                console.log(`${type} audio stream is already active`);
                return;
            }

            // Stop any existing stream first
            await this.stopAudioStream(type, true);

            await this.ensureAudioContext(settings.rate || this.currentSettings[type].rate);

            if (type === 'client') {
                this.currentStream = await this.getMicrophoneStream(settings);
                if (!this.currentStream) {
                    throw new Error('Failed to access microphone');
                }

                await this.initializeAudioWorklet();
                this.setupWorkletNode(settings.chunk || this.currentSettings.client.chunk);

                const source = this.audioContext.createMediaStreamSource(this.currentStream);
                source.connect(this.workletNode);
            }

            // Remove any existing server_audio_data listeners before adding new one
            if (type === 'server') {
                this.socket.off('server_audio_data', this.handleServerAudioData);
                this.socket.on('server_audio_data', this.handleServerAudioData);
            }

            this.socket.emit(`start_${type}_audio`, settings);
            this.streamActive[type] = true;

        } catch (error) {
            console.error(`Error starting ${type} audio:`, error);
            await this.stopAudioStream(type);
            throw error;
        }
    }

    setupWorkletNode(bufferSize) {
        this.workletNode = new AudioWorkletNode(this.audioContext, 'client-audio-processor', {
            processorOptions: { bufferSize }
        });

        this.workletNode.port.onmessage = (event) => {
            if (event.data.type === 'pcmData') {
                this.audioQueue.push(event.data.pcmData);
                if (!this.isProcessingAudio) {
                    this.processAudioQueue();
                }
            }
        };
    }

    async processAudioQueue() {
        if (this.audioQueue.length === 0) {
            this.isProcessingAudio = false;
            return;
        }

        this.isProcessingAudio = true;
        const audioData = this.audioQueue.shift();

        this.socket.emit('client_audio_data', audioData, () => {
            this.processAudioQueue();
        });
    }

    handleServerAudioData(data) {
        const uint8Array = new Uint8Array(data);
        if (uint8Array.length === 0) return;

        const bufferLength = uint8Array.length - (uint8Array.length % 2);
        const int16Array = new Int16Array(uint8Array.buffer, 0, bufferLength / 2);

        const audioBuffer = this.audioContext.createBuffer(1, int16Array.length, this.audioContext.sampleRate);
        const audioData = audioBuffer.getChannelData(0);

        for (let i = 0; i < int16Array.length; i++) {
            audioData[i] = int16Array[i] / 32768.0;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        source.start();
        source.onended = () => source.disconnect();
    }

    async stopAudioStream(type, isResetting = false) {
        if (!this.streamActive[type] && !isResetting) {
            return;
        }

        this.socket.emit(`stop_${type}_audio`);
        
        if (type === 'client') {
            this.cleanupWorklet();
        } else if (type === 'server') {
            this.socket.off('server_audio_data', this.handleServerAudioData);
        }

        // Only close AudioContext if we're not resetting
        if (!isResetting && this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }

        this.streamActive[type] = false;
    }

    cleanupWorklet() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        if (this.workletNode) {
            this.workletNode.disconnect();
            this.workletNode.port.close();
            this.workletNode = null;
        }
        this.audioQueue = [];
        this.isProcessingAudio = false;
    }

    cleanup() {
        this.cleanupWorklet();
    }

    initializeEventListeners() {
        // Server Audio Controls
        document.getElementById('startServerAudio').addEventListener('click', async () => {
            const settings = {
                source: document.getElementById('audioSourceSelect').value,
                rate: parseInt(document.getElementById('serverAudioRate').value),
                chunk: parseInt(document.getElementById('serverAudioChunk').value)
            };
            await this.startAudioStream('server', settings);
        });

        document.getElementById('stopServerAudio').addEventListener('click', () => {
            this.stopAudioStream('server');
        });

        // Client Audio Controls
        document.getElementById('startClientAudio').addEventListener('click', async () => {
            const settings = {
                rate: parseInt(document.getElementById('clientAudioRate').value),
                chunk: parseInt(document.getElementById('clientAudioChunk').value)
            };
            await this.startAudioStream('client', settings);
        });

        document.getElementById('stopClientAudio').addEventListener('click', () => {
            this.stopAudioStream('client');
        });
    }
}

export { AudioManager }; 
