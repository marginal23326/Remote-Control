from app import create_app
import sys
from utils.helpers import get_local_ip
from extensions import socketio

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python server.py <port>")
        sys.exit(1)

    port = int(sys.argv[1])
    local_ip = get_local_ip()

    app = create_app()

    print("\n=== Enhanced Remote Control Web Server ===")
    print("\nServer started on:")
    print(f"  Local IP: {local_ip}")
    print(f"  Port: {port}")
    print("\nAccess the control panel from your browser:")
    print(f"  http://{local_ip}:{port}")
    print("\nPress Ctrl+C to stop the server\n")

    socketio.run(app, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)