@echo off
cd /d "%~dp0"
"C:\Program Files\nodejs\npx.cmd" localtunnel --port 3001 > tunnel-output.txt 2>&1
