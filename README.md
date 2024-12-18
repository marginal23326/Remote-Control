# Remote Control Web Application 🖥️

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/marginal23326/Remote-Control/blob/master/LICENSE)
[![Python version](https://img.shields.io/badge/python-3.13+-blue)](https://www.python.org/downloads/)

A real-time remote control web application built with Flask and Socket.IO that enables seamless control of Windows machines through your web browser. Perfect for remote administration, support, and management across your local network.

## ✨ Key Features

### 🎥 Real-time Screen Streaming
- High-performance desktop streaming with configurable quality, resolution, and FPS
- Powered by DXCam for best screen capture performance on Windows

### 🔊 Advanced Audio Control
- **Server → Client**: Stream system audio or microphone input
- **Client → Server**: Transmit microphone audio with real-time processing
- Configurable audio sample rate settings

### 🖱️ Precise Input Control
- Full mouse control (move, click, scroll) with a synchronized cursor overlay for accurate visual feedback.
- Full keyboard input support (send text, shortcuts, and custom key combinations).

### 📁 File Management
- Browse files and folders.
- Upload files (with drag-and-drop support).
- Download files.
- Delete files and folders.
- Create new folders.
- Rename files and folders.

### 💻 Power User Features
- **Interactive Shell**: Real-time command execution with live output
- **System Information:** Display detailed system information of the remote machine (CPU, memory, disk, network, etc.).
- **Security**: Role-based authentication with session management
- **Responsive Design**: Tailwind CSS-powered interface that works on any device

## 🌳 Project Structure

```
Remote-Control/
├── app.py                   # Main application setup
├── server.py                # Main entry point
├── extensions.py            # Socketio initialization
├── config/
│   ├── auth_config.py       # Authentication settings
│   └── server_config.py     # Server configuration
├── core/
│   ├── remote_control.py    # Main remote control logic
│   ├── stream_manager.py    # Screen streaming management
│   ├── audio_manager.py     # Audio streaming handling
│   └── mouse_controller.py  # Mouse input processing
├── routes/
│   ├── auth_routes.py       # Authentication endpoints
│   ├── stream_routes.py     # Streaming endpoints
│   ├── system_routes.py     # System information
│   ├── input_routes.py      # Input handling
│   └── file_routes.py       # File operations
├── services/
│   ├── system_service.py    # System information
│   └── file_service.py      # File operations
├── events/
│   ├── connection_events.py # Connection management
│   ├── audio_events.py      # Audio streaming
│   ├── auth_events.py       # Auth socket
│   └── input_events.py      # Input processing
├── utils/
│   └── helpers.py
├── static/
│   ├── js/
│   │   ├── modules/
│   │   │   ├── audio.js            # AudioManager class
│   │   │   ├── connection.js       # Socket.IO connection management
│   │   │   ├── dom.js              # DOM manipulation utilities
│   │   │   ├── file.js             # File management functions
│   │   │   ├── input.js            # Keyboard and mouse input handling
│   │   │   ├── stream.js           # Stream setup, control, and UI updates
│   │   │   ├── system.js           # System information display
│   │   │   └── utils.js            # General utility functions (like apiCall)
│   │   ├── main.js                	# Main initialization and event handling
│   │   └── audio-worklet-processor.js
│   └── css/
│       ├── tailswind.css
│       └── styles.css
└── templates/               # HTML templates
```

## 🚀 Quick Start Guide

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/marginal23326/Remote-Control.git
cd Remote-Control

# Install dependencies
pip install -r requirements.txt
```

### 3. Launch the Application

```bash
python server.py <port>
```
_(Replace `<port>` with your desired port number, e.g., 5000)_

### 4. Access the Interface

Open your browser and navigate to:
```
http://[server-ip]:5000
```

Example:
```
http://192.168.1.100:5000
```

## 🔧 Configuration

### Authentication
*  Make sure to update `config/auth_config.py` with your desired username and password.
```python
USER_CONFIG = {
	'username': 'admin',
	'password_hash': generate_password_hash('password')
}
```

## 📦 Building an Executable (Optional)

1. **Install PyInstaller:**

    ```bash
    pip install pyinstaller
    ```

2. **Run the build script:**

    ```bash
    build_exe.bat
    ```
The compiled executable will be available in the `dist` directory.

## ⚠️ Important Notes

- **Security**: This application is designed for trusted networks. Be **_very_** **cautious** about exposing it directly to the Internet; only use it on your trusted **local network**.
- **Windows 10/11 Only**: Server-side functionality requires Windows due to system-specific dependencies.
- **Permissions**: Administrator privilege is required for access certain restricted folders in the file browser; everything else don't require it.
- **Default Credentials**: Change the default username (`admin`) and password (`password`) before deployment.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
