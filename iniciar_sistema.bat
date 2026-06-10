@echo off
title Duelo na Sala - Servidor
echo ==========================================================
echo      INICIANDO O SERVIDOR DO DUELO NA SALA (ONLINE)
echo ==========================================================
echo.
echo * O servidor sera exposto na rede local automaticamente.
echo * Os celulares dos alunos poderao se conectar na mesma rede Wi-Fi.
echo * O navegador abrira o sistema em instantes...
echo.
echo ==========================================================
echo.

:: Inicia o servidor Vite expondo-o na rede local (--host) e abrindo o navegador automaticamente
npm run dev -- --host
