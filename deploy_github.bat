@echo off
chcp 65001 > nul
echo ========================================================
echo  AI MatchPulse - GitHub Pages Otomatik Dağıtım Scripti
echo ========================================================
echo.

set DEFAULT_REPO=https://github.com/uzgunbasur/ai-mac-analiz.git

if not exist .git (
    echo [1/4] Git deposu başlatılıyor...
    git init
    git branch -M main
    echo.
    echo Hedef Depo URL'si: %DEFAULT_REPO%
    echo (Başka bir repo adresi kullanmak isterseniz aşağıya yazabilirsiniz, aksi halde doğrudan Enter'a basın)
    set /p REPO_URL="Depo URL (Enter = Varsayılan): "
    if "%REPO_URL%"=="" set REPO_URL=%DEFAULT_REPO%
    git remote add origin %REPO_URL%
) else (
    echo [1/4] Git deposu mevcut, remote kontrol ediliyor...
    git remote get-url origin >nul 2>&1
    if errorlevel 1 (
        set /p REPO_URL="Depo URL (Enter = Varsayılan): "
        if "%REPO_URL%"=="" set REPO_URL=%DEFAULT_REPO%
        git remote add origin %REPO_URL%
    )
)

echo.
echo [2/4] Tüm dosyalar (index.html, css/, js/, .nojekyll) sahneye ekleniyor...
git add -A

echo [3/4] Değişiklikler commit yapılıyor...
git commit -m "feat: AI MatchPulse Standalone v1.0 - Match prediction, multi-AI comparison and live score sync"

echo.
echo [4/4] GitHub'a push ediliyor...
git push -u origin main --force

echo.
echo ========================================================
echo  İşlem Tamamlandı! 🚀
echo  GitHub reponuzun Settings -> Pages bölümünden
echo  Branch olarak 'main' seçerek sitenizi hemen canlıya alabilirsiniz.
echo ========================================================
pause
