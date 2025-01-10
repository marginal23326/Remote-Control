# Remote Control Web Application 🖥️

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/marginal23326/Remote-Control/blob/main/LICENSE)
[![Python version](https://img.shields.io/badge/python-3.13+-blue)](https://www.python.org/downloads/)

A real-time remote control web application built with Flask and Socket.IO that enables seamless control of Windows machines through your web browser. Perfect for remote administration, support, and management across your local network.

## ✨ Key Features

### 🎥 Real-time Screen Streaming

-   High-performance desktop streaming with configurable quality, resolution, and FPS
-   Powered by DXCam for the best screen capture performance on Windows

### 🔊 Advanced Audio Control

-   **Server → Client**: Stream system audio or microphone input
-   **Client → Server**: Transmit microphone audio with real-time processing
-   Configurable audio sample rate settings

### 🖱️ Precise Input Control

-   Full mouse control (move, click, scroll) with a synchronized cursor overlay for accurate visual feedback.
-   Full keyboard input support (send text, shortcuts, and custom key combinations).

### 📁 File Management

-   Browse files and folders.
-   Upload files (with drag-and-drop support).
-   Download files.
-   Delete files and folders.
-   Create new folders.
-   Rename files and folders.

### 📊 Task Manager

-   View a list of running processes.
-   Expand/collapse process groups.
-   Sort processes by name, PID, CPU usage, and memory usage.
-   Terminate processes remotely.
-   Displays total CPU usage and memory usage.

### 💻 Additional Features

-   **Interactive Shell**: Real-time command execution with live output
-   **System Information**: Display detailed system information of the remote machine (CPU, memory, disk, network, etc.).
-   **Security**: Role-based authentication with session management
-   **Responsive Design**: Tailwind CSS-powered interface that works on any device

## 🌳 Project Structure

```
Remote-Control/
├── config/
│   ├── auth_config.py         # Authentication configuration
│   └── server_config.py       # Server configuration
├── core/
│   ├── audio_manager.py       # AudioManager class
│   ├── input_manager.py       # InputManager class
│   ├── keyboard_controller.py # Windows-specific keyboard control
│   ├── mouse_controller.py    # Windows-specific mouse control
│   ├── shell_manager.py       # ShellManager class
│   ├── stream_manager.py      # StreamManager class
│   └── task_manager.py        # TaskManager class
├── events/
│   ├── __init__.py
│   ├── audio_events.py        # Audio-related socket events
│   ├── auth_events.py         # Auth socket events
│   ├── connection_events.py   # Socket connection events
│   ├── input_events.py        # Mouse/keyboard socket events
│   ├── shell_events.py        # Shell socket events
│   └── task_events.py         # Task manager events
├── routes/
│   ├── auth_routes.py         # Login/logout routes
│   ├── file_routes.py         # File management routes
│   ├── input_routes.py        # Keyboard/mouse input routes
│   ├── shell_routes.py        # Shell routes
│   ├── stream_routes.py       # Streaming related routes
│   ├── system_routes.py       # System info
│   └── task_routes.py         # Task manager routes
├── services/
│   ├── file_service.py        # File operations functions
│   └── system_service.py      # System information functions
├── static/
│   ├── css/
│   │   ├── styles.css
│   │   └── tailwind.css
│   └── js/
│       ├── modules/
│       │   ├── audio.js            # AudioManager class
│       │   ├── audio-worklet-processor.js
│       │   ├── connection.js       # Socket.IO connection management
│       │   ├── dom.js              # DOM manipulation utilities
│       │   ├── file.js             # File management functions
│       │   ├── input.js            # Keyboard and mouse input handling
│       │   ├── nav.js              # Navigation function
│       │   ├── shell.js            # InteractiveShell class
│       │   ├── stream.js           # Stream setup, control, and UI updates
│       │   ├── system.js           # System information display
│       │   ├── task.js             # Task manager functions
│       │   └── utils.js            # General utility functions (like apiCall)
│       └── main.js               # Main initialization and event handling
├── templates/
│   ├── index.html
│   └── login.html
├── app.py                           # Main application setup
├── extensions.py                    # SocketIO initialization
└── server.py                        # Main entry point
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

### 2. First-time Setup

When you run the application for the first time, you will be prompted in the console to set up a username and password. These credentials will be used for authentication.

### 3. Launch the Application

```bash
python server.py <port>
```

_(Replace `<port>` with your desired port number, e.g., 5000)_

### 4. Access the Interface

Open your browser and navigate to:

```
http://<server-ip>:<port>
```

Example:

```
http://192.168.1.100:5000
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

-   **Security**: This application is designed for trusted networks. Be **_very_** **cautious** about exposing it directly to the Internet; only use it on your trusted **local network**.
-   **Windows 10/11 Only**: Server-side functionality requires Windows due to system-specific dependencies.
-   **Permissions**: Administrator privilege is required to access certain restricted folders in the file browser; everything else doesn't require it.

## 📄 License

This project is licensed under the MIT License—see the [LICENSE](LICENSE) file for details.
