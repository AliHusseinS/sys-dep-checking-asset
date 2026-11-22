#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
auto_deploy.py — النشر التلقائي الشامل لمنظومة فحص الرصانة
يرفع التعديلات تلقائياً إلى:
  1. مستودع GitHub: https://github.com/AliHusseinS/sys-dep-checking-asset
  2. مشروع Google Apps Script المرتبط بـ Google Sheet:
     https://docs.google.com/spreadsheets/d/1O0DW0SLDjbf2TRlvxez6u5pkezi9fbctgH9QPLwC1qw/edit
"""

import sys
import os
import json
import urllib.request
import urllib.parse
import subprocess
from datetime import datetime

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPT_ID = "1MUio4yIzdp1nxhKpD8yRP0VpnOO9DQ-JxytbkmjNbqPRtAJtxFQyYEax"
SPREADSHEET_ID = "1O0DW0SLDjbf2TRlvxez6u5pkezi9fbctgH9QPLwC1qw"
GITHUB_REPO_URL = "https://github.com/AliHusseinS/sys-dep-checking-asset"

def get_oauth_token():
    clasprc_path = os.path.expanduser("~/.clasprc.json")
    if not os.path.exists(clasprc_path):
        raise FileNotFoundError(f"Missing {clasprc_path}")
    
    with open(clasprc_path, 'r', encoding='utf-8') as f:
        rc = json.load(f)
    
    client_id = rc['oauth2ClientSettings']['clientId']
    client_secret = rc['oauth2ClientSettings']['clientSecret']
    refresh_token = rc['token']['refresh_token']
    
    data = urllib.parse.urlencode({
        'client_id': client_id,
        'client_secret': client_secret,
        'refresh_token': refresh_token,
        'grant_type': 'refresh_token'
    }).encode('utf-8')
    
    req = urllib.request.Request(
        'https://oauth2.googleapis.com/token',
        data=data,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        return res['access_token']

def deploy_to_apps_script(token):
    print("\n[1/3] 📤 جاري رفع وتحديث كود Google Apps Script (Code.gs)...")
    gas_path = os.path.join(PROJECT_DIR, "Code.gs")
    with open(gas_path, 'r', encoding='utf-8') as f:
        gas_code = f.read()

    manifest_path = os.path.join(PROJECT_DIR, "appsscript.json")
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    payload = {
        "files": [
            {
                "name": "appsscript",
                "type": "JSON",
                "source": json.dumps(manifest, indent=2)
            },
            {
                "name": "Code",
                "type": "SERVER_JS",
                "source": gas_code
            }
        ]
    }
    
    # 1. Update script content
    req = urllib.request.Request(
        f"https://script.googleapis.com/v1/projects/{SCRIPT_ID}/content",
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        method="PUT"
    )
    with urllib.request.urlopen(req) as resp:
        print("      ✅ تم تحديث كود المشروع في Apps Script بنجاح.")

    # 2. Create version
    ver_payload = {
        "description": f"auto deploy {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    }
    req_ver = urllib.request.Request(
        f"https://script.googleapis.com/v1/projects/{SCRIPT_ID}/versions",
        data=json.dumps(ver_payload).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    with urllib.request.urlopen(req_ver) as resp:
        ver_res = json.loads(resp.read().decode('utf-8'))
        version_num = ver_res['versionNumber']
        print(f"      ✅ تم إنشاء الإصدار رقم: {version_num}")

    # 3. Create/update deployment
    dep_payload = {
        "versionNumber": version_num,
        "manifestFileName": "appsscript",
        "description": f"v{version_num}"
    }
    req_dep = urllib.request.Request(
        f"https://script.googleapis.com/v1/projects/{SCRIPT_ID}/deployments",
        data=json.dumps(dep_payload).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req_dep) as resp:
            dep_res = json.loads(resp.read().decode('utf-8'))
            dep_id = dep_res.get('deploymentId')
            print(f"      ✅ تم النشر بنجاح: {dep_id}")
            return f"https://script.google.com/macros/s/{dep_id}/exec"
    except Exception as e:
        print(f"      ⚠️ ملاحظة أثناء النشر: {e}")
        return None

def deploy_to_github(commit_msg):
    print("\n[2/3] 🚀 جاري الرفع إلى مستودع GitHub...")
    subprocess.run(["git", "add", "-A"], cwd=PROJECT_DIR, check=True)
    status = subprocess.run(["git", "status", "--porcelain"], cwd=PROJECT_DIR, capture_output=True, text=True).stdout.strip()
    if status:
        subprocess.run(["git", "commit", "-m", commit_msg], cwd=PROJECT_DIR, check=True)
        push_res = subprocess.run(["git", "push", "-u", "origin", "main"], cwd=PROJECT_DIR, capture_output=True, text=True)
        if push_res.returncode != 0:
            print("Git push error:", push_res.stderr)
            raise RuntimeError("Git push failed")
        print("      ✅ تم الرفع على GitHub (فرع main) بنجاح.")
        # Also sync to Load branch
        try:
            subprocess.run(["git", "push", "-u", "origin", "main:Load"], cwd=PROJECT_DIR, check=True)
            print("      ✅ تم الرفع أيضاً إلى فرع Load.")
        except Exception as e:
            print(f"      ℹ️ تخطي مزامنة Load: {e}")
    else:
        print("      ℹ️ لا توجد تعديلات جديدة لرفعها.")

def main():
    msg = sys.argv[1] if len(sys.argv) > 1 else f"auto deploy {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    print("=" * 60)
    print("  🚀 نظام النشر التلقائي - منظومة فحص رصانة البحوث العلمية")
    print("=" * 60)
    
    try:
        token = get_oauth_token()
        webapp_url = deploy_to_apps_script(token)
    except Exception as e:
        print(f"      ⚠️ تعذر النشر التلقائي لـ Apps Script: {e}")
        webapp_url = None

    deploy_to_github(msg)

    print("\n" + "=" * 60)
    print("  🎉 اكتمل النشر بالكامل!")
    print(f"  🌐 مستودع GitHub: {GITHUB_REPO_URL}")
    print(f"  📊 جدول بيانات Google Sheet: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit")
    if webapp_url:
        print(f"  ⚡ رابط تطبيق الويب (Apps Script): {webapp_url}")
    print("=" * 60)

if __name__ == '__main__':
    main()
