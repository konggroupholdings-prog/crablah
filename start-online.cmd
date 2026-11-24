@echo off
cd /d "%~dp0"
echo CrabLah shop on its own Cloudflare link (not kongml.net).
echo Keep this window open. Order desk: add /desk.html to the URL.
echo Password is in data\admin.json — change it.
start "CrabLah shop" cmd /c "python serve.py"
timeout /t 2 /nobreak >nul
cloudflared tunnel --config "%~dp0cloudflared-shop.yml" --url http://127.0.0.1:4175
pause
