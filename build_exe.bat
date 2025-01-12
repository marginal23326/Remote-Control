@echo off
pyinstaller --name server --onefile -w ^
    --add-data "templates;templates" ^
    --add-data "static;static" ^
    --add-data ".\config\user_config.json;." ^
    --hidden-import core ^
    --hidden-import routes ^
    --hidden-import services ^
    --hidden-import events ^
    --hidden-import config ^
    --hidden-import extensions ^
    --hidden-import engineio.async_drivers.threading ^
    server.py

set /p delete_build="Do you want to delete the 'build' folder? (y/n): "
if /i "%delete_build%"=="y" (
    rmdir /s /q build
    echo 'build' folder deleted.
) else (
    echo 'build' folder not deleted.
)
set /p delete_spec="Do you want to delete the 'server.spec' file? (y/n): "
if /i "%delete_spec%"=="y" (
    del /q server.spec
    echo 'server.spec' file deleted.
) else (
    echo 'server.spec' file not deleted.
)
pause