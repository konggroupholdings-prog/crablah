@echo off
cd /d "%~dp0"
echo CrabLah shop:  http://127.0.0.1:4175/
echo Order desk:    http://127.0.0.1:4175/desk.html
echo Password:      data\admin.json
python serve.py
pause
