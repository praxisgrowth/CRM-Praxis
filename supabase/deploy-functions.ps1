# =============================================================
# deploy-functions.ps1
# Faz o deploy das Edge Functions no Supabase.
#
# COMO USAR:
#   1. Obtenha seu Access Token em:
#      https://supabase.com/dashboard/account/tokens
#   2. Cole o token abaixo (substitua "sbp_SEU_TOKEN_AQUI")
#   3. Execute no PowerShell:
#      .\supabase\deploy-functions.ps1
# =============================================================

$env:SUPABASE_ACCESS_TOKEN = Read-Host "Cole seu Supabase Access Token (supabase.com/dashboard/account/tokens)"
$PROJECT_REF = "xmfdrtrwpymgkvaeeyyq"

Write-Host "🚀 Iniciando deploy das Edge Functions..." -ForegroundColor Cyan

# Deploy invite-user
Write-Host "`n📦 Deploying: invite-user" -ForegroundColor Yellow
npx supabase functions deploy invite-user --project-ref $PROJECT_REF
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ invite-user deployed com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro no deploy de invite-user" -ForegroundColor Red
    exit 1
}

# Deploy create-client-access
Write-Host "`n📦 Deploying: create-client-access" -ForegroundColor Yellow
npx supabase functions deploy create-client-access --project-ref $PROJECT_REF
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ create-client-access deployed com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro no deploy de create-client-access" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 Deploy concluído! Ambas as funções estão ativas." -ForegroundColor Cyan
