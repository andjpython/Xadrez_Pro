# Script para remover pastas antigas do histórico Git
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LIMPANDO PASTAS ANTIGAS DO GIT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Verificar se as pastas antigas existem no Git
Write-Host "`nVerificando pastas no repositório..." -ForegroundColor Yellow
git ls-tree -r main --name-only | Select-String -Pattern "^(Pecas|estático|Modelos)/" | Sort-Object -Unique

# Se existirem, removê-las
Write-Host "`n[1/3] Removendo pasta 'Pecas' antiga..." -ForegroundColor Yellow
git rm -r "Pecas" 2>&1

Write-Host "`n[2/3] Removendo pasta 'estático' antiga..." -ForegroundColor Yellow  
git rm -r "estático" 2>&1

Write-Host "`n[3/3] Removendo pasta 'Modelos' antiga..." -ForegroundColor Yellow
git rm -r "Modelos" 2>&1

Write-Host "`nStatus:" -ForegroundColor Yellow
git status

Write-Host "`nCriando commit de limpeza..." -ForegroundColor Yellow
git commit -m "Clean: Remover pastas antigas (Pecas, estático, Modelos)"

Write-Host "`nEnviando para GitHub..." -ForegroundColor Yellow
git push origin main --force

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  LIMPEZA CONCLUIDA!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
