#!/usr/bin/env python3
"""Minimal OSS export checks: no production URLs, private keys or missing placeholders."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SKIP = {'.git', 'node_modules', '.venv'}
TEXT_TYPES = {'.html', '.css', '.js', '.json', '.md', '.txt', '.svg', '.webmanifest', '.py', '.yml', '.yaml'}
FORBIDDEN = [
    (re.compile(r'https?://[a-z0-9-]{15,}\.supabase\.co', re.I), 'hard-coded Supabase endpoint'),
    (re.compile(r'\bsb_publishable_[a-zA-Z0-9_-]{25,}\b'), 'hard-coded Supabase publishable key'),
    (re.compile(r'\bsb_secret_[a-zA-Z0-9_-]{12,}\b'), 'Supabase secret key'),
    (re.compile(r'\bsk-[a-zA-Z0-9_-]{25,}\b'), 'secret API key'),
    (re.compile(r'\beyJ[a-zA-Z0-9_-]{90,}\b'), 'JWT-looking token'),
    (re.compile(r'https?://(?:clientes|operaciones)\.elejem\.com', re.I), 'production operations host'),
]
issues = []
for path in ROOT.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in TEXT_TYPES or any(p in SKIP for p in path.parts):
        continue
    if path.name == 'check_snapshot.py':
        continue  # the scanner itself documents forbidden patterns
    content = path.read_text(encoding='utf-8', errors='replace')
    for regex, label in FORBIDDEN:
        if regex.search(content):
            issues.append(f'{path.relative_to(ROOT)}: {label}')
if not (ROOT / 'LICENSE').is_file():
    issues.append('LICENSE missing')
if not (ROOT / 'clientes' / 'config.example.js').is_file():
    issues.append('example configuration missing')
if (ROOT / 'clientes' / 'config.js').exists():
    issues.append('tenant-specific config.js must not be committed')
if issues:
    print('Repository check failed:\n' + '\n'.join(' - ' + s for s in issues))
    sys.exit(1)
print('OSS snapshot checks passed (static scan only, not a full security audit).')
