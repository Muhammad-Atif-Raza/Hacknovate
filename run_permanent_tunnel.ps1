# Permanent Cloudflare Tunnel Runner
$TOKEN = "eyJhIjoiM2Y4ZWZmMDJlYzUyZTMzZDM2MjQ1YWVjMjg4MjNmNmQiLCJ0IjoiNmY1MWQ4MTMtMzE0YS00MDY5LWFhZjItM2M5YjA0YTlhZjBhIiwicyI6Ik1ERmlNMlU1TjJZdE5qY3haaTAwWlRReExXSXhNbUl0TkRGbFptVmxaV1U0WmpRNSJ9"
$CLOUDFLARED = "C:\Users\agrim\AppData\Local\Programs\cloudflared.exe"

Write-Host "Starting Permanent Cloudflare Tunnel [6f51d813-314a-4069-aaf2-3c9b04a9af0a]..." -ForegroundColor Cyan
& $CLOUDFLARED tunnel --edge-ip-version 4 run --token $TOKEN
