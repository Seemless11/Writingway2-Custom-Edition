#!/usr/bin/env python3
"""
Writingway 2 Updater Server
Listens on 127.0.0.1:8001 and handles update downloads from GitHub.

Endpoints:
  POST /update/download  - Download latest release zip to .update/latest.zip
  GET  /update/status    - Check if an update is staged and ready
  POST /update/clear     - Clear staged update files
"""

import os
import sys
import json
import urllib.request
import urllib.error
import zipfile
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Configuration
HOST = '127.0.0.1'
PORT = 8001
# Must match src/update-checker.js (repoOwner/repoName) so the version dialog
# always describes the same repository the updater downloads from.
REPO_OWNER = 'Seemless11'
REPO_NAME = 'Writingway2-Custom-Edition'
BRANCH = 'main'

# The app page (port 8000) calls this server from the browser; 8000 and 8001
# are different origins, so the app origin is explicitly allowed and nothing
# else. Every other website is rejected.
APP_ORIGINS = {'http://127.0.0.1:8000', 'http://localhost:8000'}
ALLOWED_HOSTS = {f'127.0.0.1:{PORT}', f'localhost:{PORT}', '127.0.0.1', 'localhost'}
MAX_UPDATE_ZIP_BYTES = 1024 * 1024 * 1024        # 1 GB staged archive cap
MAX_UPDATE_ENTRY_BYTES = 512 * 1024 * 1024       # per-file cap inside the zip

# Paths (relative to the project root)
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
UPDATE_DIR = PROJECT_ROOT / '.update'
LATEST_ZIP = UPDATE_DIR / 'latest.zip'
READY_JSON = UPDATE_DIR / 'ready.json'


def host_allowed(headers) -> bool:
    """Block DNS-rebinding: the Host header must be local."""
    host = (headers.get('Host') or '').strip().lower()
    if not host:
        return True
    return host in ALLOWED_HOSTS


def origin_allowed(headers) -> bool:
    """Allow same-app origins and header-less non-browser clients."""
    sec_fetch_site = (headers.get('Sec-Fetch-Site') or '').strip().lower()
    if sec_fetch_site and sec_fetch_site not in {'same-origin', 'none'}:
        return False
    origin = (headers.get('Origin') or '').strip()
    if not origin:
        return True
    return origin in APP_ORIGINS


def send_cors_headers(handler):
    """Attach CORS headers only for the app origin (never '*')."""
    origin = (handler.headers.get('Origin') or '').strip()
    if origin in APP_ORIGINS:
        handler.send_header('Access-Control-Allow-Origin', origin)
        handler.send_header('Vary', 'Origin')
        handler.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        handler.send_header('Access-Control-Allow-Headers', 'Content-Type')


def validate_update_zip(path):
    """
    Verify the staged archive before it is marked ready: intact zip, no
    path-traversal entries, sane sizes. Returns (ok, message).
    """
    try:
        with zipfile.ZipFile(path, 'r') as zf:
            bad = zf.testzip()
            if bad is not None:
                return False, f'Corrupt entry in update archive: {bad}'
            total = 0
            for info in zf.infolist():
                normalized = info.filename.replace('\\', '/')
                parts = Path(normalized).parts
                if normalized.startswith('/') or '..' in parts or (len(normalized) > 1 and normalized[1] == ':'):
                    return False, f'Unsafe path in update archive: {info.filename}'
                if info.file_size > MAX_UPDATE_ENTRY_BYTES:
                    return False, f'Entry too large in update archive: {info.filename}'
                total += info.file_size
            if total > MAX_UPDATE_ZIP_BYTES:
                return False, 'Update archive is too large'
    except zipfile.BadZipFile:
        return False, 'Downloaded update is not a valid zip archive'
    return True, ''


def ensure_update_dir():
    """Create .update directory if it doesn't exist."""
    UPDATE_DIR.mkdir(exist_ok=True)


def get_download_url():
    """
    Get the download URL for the latest release.
    First tries GitHub Releases API for the latest release asset.
    Falls back to archive/refs/heads/main.zip if no releases.
    """
    releases_url = f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases/latest'

    try:
        req = urllib.request.Request(
            releases_url,
            headers={'User-Agent': 'Writingway2-Updater/1.0'}
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))

            # Look for a .zip asset in the release
            assets = data.get('assets', [])
            for asset in assets:
                if asset.get('name', '').endswith('.zip'):
                    return asset['browser_download_url'], 'release'

            # If no .zip asset, use the zipball URL
            if 'zipball_url' in data:
                return data['zipball_url'], 'release'

    except urllib.error.HTTPError as e:
        if e.code == 404:
            # No releases found, use archive fallback
            pass
        else:
            print(f'[Updater] GitHub API error: {e}')
    except Exception as e:
        print(f'[Updater] Error checking releases: {e}')

    # Fallback: archive of main branch
    fallback_url = f'https://github.com/{REPO_OWNER}/{REPO_NAME}/archive/refs/heads/{BRANCH}.zip'
    return fallback_url, 'archive'


def download_update():
    """
    Download the latest update zip to .update/latest.zip.
    Returns (success, message) tuple.
    """
    ensure_update_dir()

    try:
        download_url, source = get_download_url()
        if not download_url.startswith('https://'):
            return False, 'Refusing non-HTTPS download URL'
        print(f'[Updater] Downloading from {source}: {download_url}')

        req = urllib.request.Request(
            download_url,
            headers={'User-Agent': 'Writingway2-Updater/1.0'}
        )

        # Download with progress indication
        with urllib.request.urlopen(req, timeout=120) as response:
            total_size = response.headers.get('Content-Length')
            if total_size:
                total_size = int(total_size)
                print(f'[Updater] Download size: {total_size / 1024 / 1024:.1f} MB')

            # Read and write in chunks
            chunk_size = 64 * 1024  # 64KB chunks
            downloaded = 0

            with open(LATEST_ZIP, 'wb') as f:
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size:
                        percent = (downloaded / total_size) * 100
                        print(f'[Updater] Progress: {percent:.1f}%', end='\r')

            print(f'\n[Updater] Download complete: {downloaded / 1024 / 1024:.1f} MB')

        # Verify the zip file exists and has content
        if not LATEST_ZIP.exists() or LATEST_ZIP.stat().st_size < 1000:
            return False, 'Download failed: File too small or empty'

        # Validate the archive before staging it for apply-on-restart
        ok, message = validate_update_zip(LATEST_ZIP)
        if not ok:
            try:
                LATEST_ZIP.unlink()
            except OSError:
                pass
            return False, message

        # Write ready.json to signal update is staged
        with open(READY_JSON, 'w') as f:
            json.dump({
                'downloaded_at': str(Path(LATEST_ZIP).stat().st_mtime),
                'source': source,
                'url': download_url
            }, f, indent=2)

        print('[Updater] Update staged successfully')
        return True, 'Downloaded. Restart to apply.'

    except urllib.error.URLError as e:
        error_msg = f'Network error: {e.reason}'
        print(f'[Updater] {error_msg}')
        return False, error_msg
    except Exception as e:
        error_msg = f'Download failed: {str(e)}'
        print(f'[Updater] {error_msg}')
        return False, error_msg


def check_status():
    """Check if an update is staged and ready."""
    return READY_JSON.exists() and LATEST_ZIP.exists()


def clear_update():
    """Clear staged update files."""
    try:
        if READY_JSON.exists():
            READY_JSON.unlink()
        if LATEST_ZIP.exists():
            LATEST_ZIP.unlink()
        # Also clean extract folder if present
        extract_dir = UPDATE_DIR / 'extract'
        if extract_dir.exists():
            import shutil
            shutil.rmtree(extract_dir)
        return True, 'Update files cleared'
    except Exception as e:
        return False, f'Failed to clear: {str(e)}'


class UpdateHandler(BaseHTTPRequestHandler):
    """HTTP request handler for the updater service."""

    def _send_json(self, data, status=200):
        """Send a JSON response (CORS only for the app origin)."""
        response = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(response))
        send_cors_headers(self)
        self.end_headers()
        self.wfile.write(response)

    def do_OPTIONS(self):
        """Handle CORS preflight requests (app origin only)."""
        if not host_allowed(self.headers) or not origin_allowed(self.headers):
            self.send_response(403)
            self.end_headers()
            return
        self.send_response(200)
        send_cors_headers(self)
        self.end_headers()

    def do_GET(self):
        """Handle GET requests."""
        if not host_allowed(self.headers):
            self._send_json({'error': 'Forbidden'}, 403)
            return
        if self.path == '/update/status':
            ready = check_status()
            self._send_json({'ready': ready})
        elif self.path == '/health':
            self._send_json({'ok': True, 'service': 'writingway-updater'})
        else:
            self._send_json({'error': 'Not found'}, 404)

    def do_POST(self):
        """Handle POST requests."""
        if not host_allowed(self.headers) or not origin_allowed(self.headers):
            self._send_json({'error': 'Cross-site request blocked'}, 403)
            return
        if self.path == '/update/download':
            success, message = download_update()
            if success:
                self._send_json({'ok': True, 'message': message})
            else:
                self._send_json({'ok': False, 'error': message}, 500)

        elif self.path == '/update/clear':
            success, message = clear_update()
            if success:
                self._send_json({'ok': True, 'message': message})
            else:
                self._send_json({'ok': False, 'error': message}, 500)

        else:
            self._send_json({'error': 'Not found'}, 404)

    def log_message(self, format, *args):
        """Custom log format."""
        print(f'[Updater] {self.address_string()} - {format % args}')


def main():
    """Start the updater server."""
    print(f'[Updater] Writingway 2 Updater Service')
    print(f'[Updater] Project root: {PROJECT_ROOT}')
    print(f'[Updater] Update staging: {UPDATE_DIR}')
    print(f'[Updater] Starting server on http://{HOST}:{PORT}')

    # Check if an update is already staged
    if check_status():
        print(f'[Updater] Note: Update is already staged in {UPDATE_DIR}')

    try:
        server = HTTPServer((HOST, PORT), UpdateHandler)
        print(f'[Updater] Server is ready. Listening...')
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n[Updater] Shutting down...')
        server.shutdown()
    except OSError as e:
        if e.errno == 10048 or 'Address already in use' in str(e):
            print(f'[Updater] Port {PORT} is already in use. Another updater may be running.')
            sys.exit(1)
        raise


if __name__ == '__main__':
    main()
