// static/js/main.js
import { initializeSocketIO } from './modules/connection.js';
import { showConnectionOverlay, hideConnectionOverlay, LoadingButton } from './modules/dom.js';
import { AudioManager } from './modules/audio.js';
import { initializeStream, updateSettingsDisplay } from './modules/stream.js';
import { InteractiveShell } from './modules/shell.js';
import { initializeFileManagement } from './modules/file.js';
import { initializeInputHandlers } from './modules/input.js';
import { updateSystemInfo } from './modules/system.js';
import { apiCall } from './modules/utils.js';
import { initializeNavigation } from './modules/nav.js';
import { initializeTaskManager } from './modules/task.js';

function updateUIBasedOnAuthentication(isAuthenticated) {
    const sections = ['streamSection', 'audioSection', 'shellSection', 'keyboardSection', 'fileSection', 'systemSection', 'processSection', 'aiSection'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        section.classList.toggle('hidden', !isAuthenticated);
    });

    const logoutButton = document.getElementById('logoutButton');
    logoutButton.classList.toggle('hidden', !isAuthenticated);

    if (!isAuthenticated && window.location.pathname !== '/login') {
        window.location.href = '/login';
    }

    initializeNavigation(isAuthenticated);
}

function initializeAI(socket) {
    const aiPromptInput = document.getElementById('aiPromptInput');
    const sendAIPromptButton = document.getElementById('sendAIPrompt');
    const startAIButton = document.getElementById('startAI');
    const stopAIButton = document.getElementById('stopAI');
    const aiFeedback = document.getElementById('aiFeedback');

    // Listen for AI feedback from the server
    socket.on('ai_feedback', (data) => {
        const feedbackElement = document.createElement('p');
        feedbackElement.textContent = data.feedback;
        feedbackElement.classList.add(
            'bg-gray-800',
            'text-gray-200',
            'p-2',
            'rounded-md',
            'mb-2'
        );
        aiFeedback.appendChild(feedbackElement);
        aiFeedback.scrollTop = aiFeedback.scrollHeight;
    });

    if(sendAIPromptButton) {
        sendAIPromptButton.addEventListener('click', async () => {
            const prompt = aiPromptInput.value.trim();
            if (prompt) {
                const response = await apiCall('/api/ai/prompt', 'POST', { prompt });
                if (response.status === 'success') {
                    // aiPromptInput.value = ''; // Optionally clear the input
                } else {
                    console.error("Error sending AI prompt:", response.message);
                }
            }
        });
    }
    
    if(startAIButton) {
        startAIButton.addEventListener('click', async () => {
            const initialPrompt = document.getElementById('aiInitialPrompt').value.trim();
            const response = await apiCall('/api/ai/start', 'POST', {initial_prompt: initialPrompt});
            if (response.status === 'error') {
                console.error("Error starting AI:", response.message);
            }
        });
    }

    if(stopAIButton) {
        stopAIButton.addEventListener('click', async () => {
            const response = await apiCall('/api/ai/stop', 'POST');
            if (response.status === 'error') {
                console.error("Error stopping AI:", response.message);
            }
        });
    }

    // Prevent message from sending when pressing Enter
    aiPromptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
        }
    });
}

(async function () {
    const socket = initializeSocketIO(updateUIBasedOnAuthentication);

    const sessionId = Math.random().toString(36).substring(2);

    const audioManager = new AudioManager(socket);

    const shell = new InteractiveShell('shellSection');
        
    // Initialize different parts of the application
    initializeStream(sessionId, socket);
    initializeFileManagement();
    initializeInputHandlers(socket);
    initializeTaskManager(socket);
    initializeAI(socket);

    // Update system info on load
    updateSystemInfo();

    // Get initial stream settings
    const initialSettings = await apiCall('/api/stream/settings', 'GET');
    updateSettingsDisplay(initialSettings);

    // Handle logout
    document.getElementById('logoutButton').addEventListener('click', async (e) => {
        e.preventDefault();
        const response = await fetch('/logout');
        if (response.ok) {
            updateUIBasedOnAuthentication(false); // Update UI for logged-out state
        }
    });
})();