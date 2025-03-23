@echo off
pyinstaller --name server -w -F --clean --log-level WARN ^
    --add-data "templates;templates" ^
    --add-data "static/css;static/css" ^
    --add-data "static/js;static/js" ^
    --add-data "static/node_modules/@xterm/xterm/css;static/node_modules/@xterm/xterm/css" ^
    --add-data "static/node_modules/@xterm/xterm/lib;static/node_modules/@xterm/xterm/lib" ^
    --add-data "static/node_modules/@xterm/addon-fit/lib;static/node_modules/@xterm/addon-fit/lib" ^
    --add-data "static/node_modules/@xterm/addon-web-links/lib;static/node_modules/@xterm/addon-web-links/lib" ^
    --add-data "static/node_modules/socket.io-client/dist;static/node_modules/socket.io-client/dist" ^
    --add-data ".\config\user_config.json;." ^
    --hidden-import engineio.async_drivers.threading ^
    --exclude-module numpy.f2py ^
    --exclude-module numpy.testing ^
    --noupx ^
    server.py

set /p delete="Do you want to delete the 'build' folder and the 'server.spec' file? (y/n): "
if /i "%delete%"=="y" (
    rmdir /s /q build
    echo 'build' folder deleted.
    del /q server.spec
    echo 'server.spec' file deleted.
) else (
    echo 'build' folder and 'server.spec' file not deleted.
)
pause