// static/js/modules/connection.js
import { showConnectionOverlay, hideConnectionOverlay } from './dom.js';

function initializeSocketIO(authCallback) {
    const socket = io({ reconnection: false });
    let reconnectionAttempts = 0;
    const MAX_RECONNECTION_ATTEMPTS = 5;
    let reconnectionDelay = 1000;

    const attemptReconnection = () => {
        if (reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
            reconnectionAttempts++;
            showConnectionOverlay(`Reconnecting... Attempt ${reconnectionAttempts}`);
            setTimeout(() => {
                console.log('Attempting to reconnect...');
                socket.connect();
            }, reconnectionDelay);
            reconnectionDelay *= 2;
        } else {
            showConnectionOverlay('Connection failed after multiple attempts.');
        }
    };

    const onConnect = () => {
        console.log('Socket connected!');
        hideConnectionOverlay();
        reconnectionAttempts = 0;
        reconnectionDelay = 1000;

        // Request authentication status on every connect/reconnect
        socket.emit('check_auth');
    };

    socket.on('connect', onConnect);

    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason !== 'io client disconnect') {
            attemptReconnection();
        }
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        attemptReconnection();
    });

    socket.on('auth_status', (data) => {
        authCallback(data.authenticated);
    });

    return socket;
}

export { initializeSocketIO };