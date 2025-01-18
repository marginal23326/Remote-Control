@echo off
pyinstaller --name server --onefile -w --clean --log-level WARN ^
    --add-data "templates;templates" ^
    --add-data "static;static" ^
    --add-data ".\config\user_config.json;." ^
    --hidden-import engineio.async_drivers.threading ^
    --exclude-module matplotlib ^
    --exclude-module PIL ^
    --exclude-module numpy.f2py ^
    --exclude-module numpy.testing ^
    --exclude-module PyQt6 ^
    --exclude-module IPython ^
    --exclude-module tkinter ^
    --exclude-module xml ^
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