@echo off
REM Fired by Windows Task Scheduler every 2 hours. Generates one on-theme draft
REM for the current slot and queues it for review (the bot posts the card).
cd /d "%~dp0"
if not exist "logs" mkdir "logs"
echo [%date% %time%] running tick >> "logs\run.log"
call npm run run >> "logs\run.log" 2>&1
