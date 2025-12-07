# Script para enviar TODAS as alterações para o GitHub
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ENVIANDO PARA GITHUB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n[1/4] Adicionando todos os arquivos..." -ForegroundColor Yellow
git add -A

Write-Host "`n[2/4] Verificando status..." -ForegroundColor Yellow
git status --short

Write-Host "`n[3/4] Criando commit..." -ForegroundColor Yellow
git commit -m "Fix: Migrar de eventlet para gevent (compatibilidade Python 3.13)"

Write-Host "`n[4/4] Enviando para GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  CONCLUÍDO! " -ForegroundColor Green
Write-Host "  Verifique: https://github.com/andjpython/Xadrez_Pro" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
