# Quick test script to check if backend is running
Write-Host "Testing backend connection..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET -UseBasicParsing
    Write-Host "✅ Backend is running!" -ForegroundColor Green
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "❌ Backend is NOT running or not accessible" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "Make sure you've started the backend with: cd backend && npm start"
}
