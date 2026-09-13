@echo off
chcp 65001 >nul
title Window Archive Preview
set "PATH=D:\大三\Kimi\resources\resources\runtime;%PATH%"
cd /d "%~dp0"
start "" http://localhost:7100/
npm run dev -- --port 7100
pause
