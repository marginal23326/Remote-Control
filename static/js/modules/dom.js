// static/js/modules/dom.js
import { SVG_TEMPLATES } from './utils.js';

const connectionOverlay = document.getElementById('connectionOverlay');
const connectionMessage = document.getElementById('connectionMessage');
const allInteractiveElements = document.querySelectorAll('button, input, select, textarea, a[href], [onclick], [tabindex]');

function disableInteractiveElements() {
    allInteractiveElements.forEach(element => {
        element.disabled = true;
    });
}

function enableInteractiveElements() {
    allInteractiveElements.forEach(element => {
        element.disabled = false;
    });
}

function showConnectionOverlay(message) {
    connectionMessage.textContent = message;
    connectionOverlay.classList.remove('hidden');
    disableInteractiveElements();
}

function hideConnectionOverlay() {
    connectionOverlay.classList.add('hidden');
    enableInteractiveElements();
}

class LoadingButton {
    constructor(buttonElement, loadingText = 'Loading...') {
        this.button = buttonElement;
        this.originalHtml = this.button.innerHTML;
        this.loadingText = loadingText;
    }

    startLoading() {
        this.button.disabled = true;
        this.button.innerHTML = `${SVG_TEMPLATES.spinner(4)} ${this.loadingText}`;
        return this;
    }

    stopLoading() {
        this.button.disabled = false;
        this.button.innerHTML = this.originalHtml;
        return this;
    }

    async withLoading(asyncFn) {
        this.startLoading();
        try {
            await asyncFn();
        } finally {
            this.stopLoading();
        }
    }
}

export { 
    disableInteractiveElements,
    enableInteractiveElements,
    showConnectionOverlay, 
    hideConnectionOverlay,
    LoadingButton
}; 
