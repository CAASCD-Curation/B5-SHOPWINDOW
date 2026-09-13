@echo off
chcp 65001 >nul
echo ============================================
echo   SHOP WINDOW 橱窗 - 本地启动
echo   浏览器将自动打开 http://localhost:8000
echo   关闭本窗口即停止网站
echo ============================================
cd /d "%~dp0dist"
start "" http://localhost:8000
python -m http.server 8000
pause
