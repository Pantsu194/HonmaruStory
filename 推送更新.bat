@echo off
chcp 65001 >nul
cd /d F:\HonmaruStory\HonmaruStory
echo ============================================================
echo  Push Honmaru Story update to GitHub  (v2 audio fix)
echo ============================================================
echo.
echo [1/3] Current local commit:
git log --oneline -1
echo.
echo [2/3] Remote commit before push:
git ls-remote origin main
echo.
echo [3/3] Pushing... (if it asks for credentials, username Pantsu194,
echo        password = your Personal Access Token)
git push origin main
echo.
echo ------------------------------------------------------------
echo If you see "main -> main" above, the push succeeded.
echo Vercel will redeploy in 1-2 minutes.
echo Verify: https://www.honmarustory.top/VERSION.txt
echo ------------------------------------------------------------
echo.
pause