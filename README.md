# Remote Control Web Application

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/marginal23326/Remote-Control/blob/main/LICENSE)
[![Python version](https://img.shields.io/badge/python-3.13.1-blue)](https://www.python.org/downloads/)

This project is a real-time remote control web application built using Flask and Socket.IO. It allows you to control a Windows machine over your local network through a modern web browser.

## Features

*   **Real-time Screen Streaming:**  Stream the remote desktop with adjustable quality, resolution, and target FPS. Uses DXCam for optimized screen capture on Windows.
*   **Bi-directional Audio:**
    *   **Server-to-Client:** Stream system audio or microphone input from the server to the client.
    *   **Client-to-Server:** Stream audio from the client's microphone to the server.
*   **Remote Input Control:**
    *   Full mouse control (move, click, scroll) with a synchronized cursor overlay for accurate visual feedback.
    *   Keyboard input (send text, shortcuts, and custom key combinations).
*   **File Management:**
    *   Browse files and folders.
    *   Upload files (with drag-and-drop support).
    *   Download files.
    *   Delete files and folders.
    *   Create new folders.
    *   Rename files and folders.
*   **Shell Access:** Execute commands on the server and view the output in real-time.
*   **System Information:** Display detailed system information of the remote machine (CPU, memory, disk, network, etc.).
*   **Secure Authentication:** Uses Flask-Login to protect the application with username/password authentication.
*   **Modern and Responsive UI:** Built with Tailwind CSS, providing a clean, user-friendly interface that adapts to different screen sizes.

## Project Structure

The project is organized in the following ways:

```
├── server.py
├── app.py
├── extensions.py
├── config/
│   ├── auth_config.py
│   └── server_config.py
├── core/
│   ├── audio_manager.py
│   ├── mouse_controller.py
│   ├── remote_control.py
│   └── stream_manager.py
├── events/
│   ├── audio_events.py
│   ├── connection_events.py
│   └── input_events.py
├── routes/
│   ├── auth_routes.py
│   ├── file_routes.py
│   ├── input_routes.py
│   ├── stream_routes.py
│   └── system_routes.py
├── services/
│   ├── file_service.py
│   └── system_service.py
├── static/
│   ├── audio-worklet-processor.js
│   ├── input.css
│   └── css/
│       └── tailwind.css
├── templates/
│   ├── index.html
│   └── login.html
└── utils/
    └── helpers.py
```

## Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/marginal23326/remote-Control.git
    cd Remote-Control
    ```

2. **Install Python dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

3. **Install Node.js dependencies (for Tailwind CSS):**

    ```bash
    npm install
    ```

4. **Configure Authentication:**

    *   Update `config/auth_config.py` with your desired username and password.

5. **Compile Tailwind CSS:**
    ```bash
    npx tailwindcss -i ./static/input.css -o ./static/css/tailwind.css --watch
    ```
    (The `--watch` flag will automatically recompile CSS on changes during development)

## Usage

1. **Start the Flask development server:**

    ```bash
    python server.py <port>
    ```
    (Replace `<port>` with your desired port number, e.g., 5000)

2. **Access the application in your web browser:**

    ```
    http://<server-ip>:<port>
    ```

    (Replace `<server-ip>` with the server's IP address and `<port>` with the port you specified.)
   Example: http://192.168.1.100:5000 (Replace 192.168.1.100 with your server's IP and 5000 with your desired port)

## Building an Executable (Optional)

You can use the provided `build_exe.bat` script (which uses PyInstaller) to create a standalone executable for the server. This allows you to run the server without needing to install Python and all the dependencies on the target machine.

1. **Install PyInstaller:**

    ```bash
    pip install pyinstaller
    ```

2. **Run the build script:**

    ```bash
    build_exe.bat
    ```

    This will typically create an executable file inside the `dist` folder. You can safely delete the 'build' folder and the 'server.spec' file.

## Important Notes

*   **Security:** This application is intended for use on trusted networks. Be very cautious about exposing it directly to the internet without additional security measures
*   **Windows Only:** The server-side code is currently designed for Windows due to its reliance on Windows-specific libraries (DXCam, `win32gui`, etc.).
*   **Permissions:** Ensure the user account running the server has the necessary permissions (Administrator privilege) to access certain folders.
*   **Error Handling:** While the application includes error handling, there might be edge cases or unexpected situations that could cause issues.
*   **Username and Password:** Update the default username("admin") and password ("password") in `config/auth_config.py` with your desired one.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
