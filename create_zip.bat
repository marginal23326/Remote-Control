@echo off
set ZIP_NAME=a.zip

cd /d "%~dp0"

7z a %ZIP_NAME% ^
    app.py ^
    server.py ^
    extensions.py ^
    config ^
    core ^
    routes ^
    events ^
    templates ^
    static\css ^
    static\js ^
    static\node_modules\socket.io-client\dist ^
    static\node_modules\@xterm\xterm\css ^
    static\node_modules\@xterm\xterm\lib ^
    static\node_modules\@xterm\addon-fit\lib ^
    static\node_modules\@xterm\addon-web-links\lib ^
    -xr!__pycache__ ^
    -xr!.ruff_cache

echo.
echo Archive %ZIP_NAME% has been created successfully!
pause
