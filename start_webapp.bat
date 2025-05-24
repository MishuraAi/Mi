@echo off
cd /d "C:\Mi\webapp"
echo Starting web server from %CD%
echo Open http://localhost:8080 in your browser
python -m http.server 8080
pause 