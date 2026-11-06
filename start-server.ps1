$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
npm run build
if ($LASTEXITCODE -ne 0) { throw "The build failed. Run npm install first if you haven't." }
node .\server.js
