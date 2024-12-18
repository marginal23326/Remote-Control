// static/js/modules/stream.js
import { apiCall } from './utils.js';

const streamUI = {
    container: document.getElementById('streamContainer'),
    status: document.getElementById('streamStatus'),
    view: document.getElementById('streamView'),
    fpsCounter: document.getElementById('currentFPS'),
    activeWindowText: document.getElementById('activeWindow'),
    cursorOverlay: document.getElementById('cursorOverlay'),
    nativeWidth: null,
    nativeHeight: null,

    show() {
        this.container.style.height = 'auto';
        this.status.classList.remove('hidden');
        this.status.classList.add('inline-flex');
    },

    hide() {
        this.container.style.height = '0';
        this.status.classList.remove('inline-flex');
        this.status.classList.add('hidden');
    },

    updateStream(data) {
        this.view.src = `data:image/jpeg;base64,${data.image}`;
        this.fpsCounter.textContent = data.fps;
        this.activeWindowText.textContent = data.active_window ? `Active Window: ${data.active_window}` : '';
    },

    clear() {
        this.view.src = '';
        this.fpsCounter.textContent = '0';
        this.cursorOverlay.style.display = 'none';
    }
};

let streamActive = false;
let eventSource = null;
let nativeWidth, nativeHeight;
let isFullscreen = false;

function initializeStream(sessionId, socket) {
    document.getElementById('startStream').addEventListener('click', () => {
        if (!streamActive) {
            streamActive = true;
            streamUI.show();

            eventSource = new EventSource(`/api/stream?sid=${sessionId}`);
            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                streamUI.updateStream(data);
            };

            // Listen for mouse position updates from the server
            socket.on('mouse_position', (data) => {
                const dimensions = calculateStreamDimensions();

                // Calculate cursor position in client coordinates
                const adjustedX = (data.x / dimensions.scaleX) + dimensions.offsetX;
                const adjustedY = (data.y / dimensions.scaleY) + dimensions.offsetY;

                streamUI.cursorOverlay.style.display = 'block';
                streamUI.cursorOverlay.style.left = `${adjustedX}px`;
                streamUI.cursorOverlay.style.top = `${adjustedY}px`;

                // Hide cursor when outside stream bounds
                if (
                    adjustedX < dimensions.offsetX ||
                    adjustedX > dimensions.offsetX + dimensions.streamWidth ||
                    adjustedY < dimensions.offsetY ||
                    adjustedY > dimensions.offsetY + dimensions.streamHeight
                ) {
                    streamUI.cursorOverlay.style.display = 'none';
                }
            });
        }
    });

    document.getElementById('stopStream').addEventListener('click', async () => {
        if (streamActive) {
            streamActive = false;
            streamUI.hide();

            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
            await apiCall('/api/stream/stop');
            streamUI.clear();

            // Stop listening for mouse position updates
            socket.off('mouse_position');
        }
    });

    document.getElementById('screenshot').addEventListener('click', async () => {
        streamUI.show();

        const response = await apiCall('/api/screenshot');
        if (response.status === 'success') {
            streamUI.view.src = `data:image/jpeg;base64,${response.image}`;
        }
    });

    document.getElementById('streamQuality').addEventListener('input', updateStreamSettings);
    document.getElementById('streamResolution').addEventListener('input', updateStreamSettings);
    document.getElementById('streamFPS').addEventListener('input', updateStreamSettings);
    document.getElementById('autoFpsButton').addEventListener('click', setAutoFPS);

    // Fullscreen handling
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    function handleFullscreen() {
        if (!isFullscreen) {
            if (streamUI.container.requestFullscreen) {
                streamUI.container.requestFullscreen();
            } else if (streamUI.container.mozRequestFullScreen) {
                streamUI.container.mozRequestFullScreen();
            } else if (streamUI.container.webkitRequestFullscreen) {
                streamUI.container.webkitRequestFullscreen();
            } else if (streamUI.container.msRequestFullscreen) {
                streamUI.container.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    function adjustStreamSize() {
        if (isFullscreen) {
            streamUI.container.classList.add('fullscreen');
            streamUI.container.style.display = 'none';
            streamUI.container.offsetHeight;
            streamUI.container.style.display = 'flex';
        } else {
            streamUI.container.classList.remove('fullscreen');
            streamUI.view.style.width = '';
            streamUI.view.style.height = '';
        }
    }

    function onFullscreenChange() {
        isFullscreen = !isFullscreen;
        if (isFullscreen) {
            streamUI.view.classList.add('fullscreen');
        } else {
            streamUI.view.classList.remove('fullscreen');
        }
        adjustStreamSize();
    }

    fullscreenBtn.addEventListener('click', handleFullscreen);

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);
    window.addEventListener('load', adjustStreamSize);
    window.addEventListener('resize', adjustStreamSize);
}

function calculateStreamDimensions() {
    const rect = streamUI.view.getBoundingClientRect();
    const container = streamUI.container.getBoundingClientRect();

    let streamWidth = rect.width;
    let streamHeight = rect.height;

    if (isFullscreen) {
        const containerAspect = container.width / container.height;
        const streamAspect = nativeWidth / nativeHeight;

        if (containerAspect > streamAspect) {
            streamWidth = container.height * streamAspect;
            streamHeight = container.height;
        } else {
            streamWidth = container.width;
            streamHeight = container.width / streamAspect;
        }
    }

    const offsetX = (container.width - streamWidth) / 2;
    const offsetY = (container.height - streamHeight) / 2;

    return {
        container,
        streamWidth,
        streamHeight,
        offsetX,
        offsetY,
        scaleX: nativeWidth / streamWidth,
        scaleY: nativeHeight / streamHeight
    };
}

function updateSettingsDisplay(settings) {
    nativeWidth = settings.native_width;
    nativeHeight = settings.native_height;
    streamUI.nativeWidth = settings.native_width;
    streamUI.nativeHeight = settings.native_height;

    const resolutionPercentage = settings.resolution_percentage;
    const resolutionText = resolutionPercentage == 100 ?
        "100% (Native)" :
        `${resolutionPercentage}% (${Math.round(nativeWidth * resolutionPercentage / 100)} x ${Math.round(nativeHeight * resolutionPercentage / 100)})`;
    document.getElementById('resolutionValue').textContent = resolutionText;

    const fpsValue = document.getElementById('fpsValue');
    fpsValue.textContent = settings.target_fps === null ?
        '(Unlimited FPS)' :
        `(Target: ${settings.target_fps} FPS)`;
}

async function updateStreamSettings() {
    const quality = document.getElementById('streamQuality').value;
    document.getElementById('qualityValue').textContent = quality + '%';

    const resolutionPercentage = document.getElementById('streamResolution').value;
    const resolutionText = resolutionPercentage == 100 ?
        "100% (Native)" :
        `${resolutionPercentage}% (${Math.round(nativeWidth * resolutionPercentage / 100)} x ${Math.round(nativeHeight * resolutionPercentage / 100)})`;
    document.getElementById('resolutionValue').textContent = resolutionText;

    let fps = document.getElementById('streamFPS').value;
    if (fps === '') {
        fps = null;
    } else {
        if (fps < 1) {
            fps = 1;
        } else if (fps > 120) {
            fps = 120;
        }
    }

    document.getElementById('streamFPS').value = fps;

    const response = await apiCall('/api/stream/settings', 'POST', {
        quality: parseInt(quality),
        resolution_percentage: parseInt(resolutionPercentage),
        target_fps: fps ? parseInt(fps) : null
    });

    updateSettingsDisplay(response);
}

function setAutoFPS() {
    document.getElementById('streamFPS').value = 60;
    document.getElementById('fpsValue').textContent = "60 FPS";
    updateStreamSettings();
}

export {
    initializeStream,
    streamUI,
    updateSettingsDisplay,
    updateStreamSettings,
    setAutoFPS,
    streamActive,
    isFullscreen,
    calculateStreamDimensions
};