@echo off
echo === VendorBridge Git Push ===
git --version
git init
git remote remove origin 2>nul
git remote add origin https://github.com/Vis-star-sys/Odoo-X-KSV-Hackethon-2026.git
git add .
git commit -m "feat: VendorBridge ERP - Complete Procurement System for Hackathon 2026"
git branch -M main
git push -u origin main --force
echo === DONE ===
pause
