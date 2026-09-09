@echo off
echo ========================================
echo    Sistema de Gestao Financeira
echo ========================================
echo.

echo Iniciando Backend (porta 3001)...
start "Backend" cmd /c "cd backend && npm start"

timeout /t 3 /nobreak >nul

echo Iniciando Frontend (porta 3000)...
start "Frontend" cmd /c "cd frontend && npm start"

echo.
echo ========================================
echo  Sistema rodando!
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:3001
echo ========================================
echo.
echo Pressione CTRL+C nos terminais para parar
pause
