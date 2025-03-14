@echo off
set ZIP_NAME=a.zip

cd /d "%~dp0"

7z a %ZIP_NAME% app.py server.py extensions.py config core routes events static templates -xr!__pycache__ -xr!.ruff_cache

echo.
echo Archive %ZIP_NAME% has been created successfully!
pause
