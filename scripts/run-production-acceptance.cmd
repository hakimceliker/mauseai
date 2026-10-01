@echo off
setlocal

rem Safe Windows wrapper: does not change PowerShell ExecutionPolicy and never stores secrets.
if "%SMOKE_BASE_URL%"=="" set "SMOKE_BASE_URL=https://mauseai.vercel.app"

call npm.cmd run acceptance:production
exit /b %ERRORLEVEL%
