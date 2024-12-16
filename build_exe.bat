@echo off
pyinstaller --name server --onefile -w --add-data "templates;templates" --add-data "static;static" --hidden-import core --hidden-import routes --hidden-import services --hidden-import events --hidden-import utils --hidden-import config --hidden-import extensions server.py
pause