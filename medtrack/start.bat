@echo off
chcp 65001 >nul
REM ================================================
REM  MedTrack - запуск на Windows (двойной клик)
REM ================================================

cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Python не найден!
    echo.
    echo Скачайте и установите Python с сайта:
    echo     https://www.python.org/downloads/
    echo ВАЖНО: при установке отметьте галочку "Add Python to PATH"
    pause
    exit /b 1
)

echo Устанавливаю зависимости (нужно только один раз)...
python -m pip install --quiet -r requirements.txt

echo.
echo Запускаю MedTrack...
echo Откройте в браузере:  http://localhost:5000
echo (это окно нужно держать открытым, пока пользуетесь приложением)
echo.
start "" http://localhost:5000
python app.py
pause
