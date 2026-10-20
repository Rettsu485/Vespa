#!/usr/bin/env bash
# MedTrack - запуск на macOS/Linux
set -e
cd "$(dirname "$0")"

echo "Устанавливаю зависимости (нужно только один раз)..."
python3 -m pip install -q -r requirements.txt || pip3 install -q -r requirements.txt

echo ""
echo "Запускаю MedTrack..."
echo "Откройте в браузере: http://localhost:5000"
echo "(окно терминала держите открытым, пока пользуетесь приложением)"
echo ""
(command -v xdg-open >/dev/null && xdg-open http://localhost:5000) || (command -v open >/dev/null && open http://localhost:5000) || true
python3 app.py
