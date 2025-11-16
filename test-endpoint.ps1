# Test script for GET /api/articles endpoint
$baseUrl = "http://localhost:3000/api/articles"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing GET /api/articles Endpoint" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Basic request (no parameters)
Write-Host "Test 1: Basic request (no parameters)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "  Articles returned: $($json.data.Count)"
    Write-Host "  Total: $($json.pagination.total)"
    Write-Host "  HasMore: $($json.pagination.hasMore)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Error: $responseBody" -ForegroundColor Red
    } else {
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 2: With limit parameter
Write-Host "Test 2: With limit=5" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl?limit=5" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "  Articles returned: $($json.data.Count)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Error: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

# Test 3: With sentiment filter
Write-Host "Test 3: Filter by sentiment=positive" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl?sentiment=positive&limit=5" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "  Articles returned: $($json.data.Count)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Error: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

# Test 4: Invalid limit (should return 400)
Write-Host "Test 4: Invalid limit=200 (should return 400)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl?limit=200" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor $(if ($response.StatusCode -eq 400) { "Green" } else { "Red" })
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $statusCode" -ForegroundColor $(if ($statusCode -eq 400) { "Green" } else { "Red" })
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody"
    }
}
Write-Host ""

# Test 5: Invalid sentiment (should return 400)
Write-Host "Test 5: Invalid sentiment=invalid (should return 400)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl?sentiment=invalid" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor $(if ($response.StatusCode -eq 400) { "Green" } else { "Red" })
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $statusCode" -ForegroundColor $(if ($statusCode -eq 400) { "Green" } else { "Red" })
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody"
    }
}
Write-Host ""

# Test 6: Personalization without auth (should return 401)
Write-Host "Test 6: Personalization without auth (should return 401)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl?applyPersonalization=true" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor $(if ($response.StatusCode -eq 401) { "Green" } else { "Red" })
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $statusCode" -ForegroundColor $(if ($statusCode -eq 401) { "Green" } else { "Red" })
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody"
    }
}
Write-Host ""

# Test 7: With pagination
Write-Host "Test 7: With pagination (offset=0, limit=10)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl?offset=0&limit=10" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "  Articles returned: $($json.data.Count)"
    Write-Host "  Offset: $($json.pagination.offset)"
    Write-Host "  Limit: $($json.pagination.limit)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $statusCode" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Error: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

