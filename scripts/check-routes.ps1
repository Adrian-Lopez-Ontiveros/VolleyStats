$urls = @(
  "/",
  "/login",
  "/registro",
  "/offline",
  "/manifest.webmanifest",
  "/partidos",
  "/entrenador",
  "/sw.js",
  "/icons/icon-192.png"
)

foreach ($path in $urls) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri ("http://localhost:3000" + $path) -MaximumRedirection 0 -ErrorAction Stop
    Write-Output ("{0} {1}" -f $path, [int]$response.StatusCode)
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status) {
      Write-Output ("{0} {1}" -f $path, $status)
    } else {
      Write-Output ("{0} ERR {1}" -f $path, $_.Exception.Message)
    }
  }
}
