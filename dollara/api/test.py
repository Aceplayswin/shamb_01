import json, time, os, base64
from pathlib import Path
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
for line in Path('.env').read_text().splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        os.environ.setdefault(k.strip(), v.strip())
AGENCY = os.environ['GAME_AGENCY_UID']
AES_KEY = os.environ['GAME_AES_SECRET_KEY'].encode()
PREFIX = os.environ['GAME_PLAYER_PREFIX']
SERVER_URL = os.environ.get('GAME_SERVER_URL', '').rstrip('/')
LAUNCH_PATH = os.environ.get('GAME_LAUNCH_PATH', '/game/v1')
if not LAUNCH_PATH.startswith('/'):
    LAUNCH_PATH = '/' + LAUNCH_PATH
HOME_URL = os.environ.get('GAME_HOME_URL', 'http://localhost:3000')
CALLBACK_BASE = os.environ.get('GAME_CALLBACK_BASE_URL', 'http://localhost:5000').rstrip('/')
CALLBACK_PATH = os.environ.get('GAME_CALLBACK_PATH', '/api/v1/games/callback')
if not CALLBACK_PATH.startswith('/'):
    CALLBACK_PATH = '/' + CALLBACK_PATH
CALLBACK_URL = CALLBACK_BASE + CALLBACK_PATH
def encrypt(obj):
    raw = json.dumps(obj, separators=(',', ':')).encode()
    pad = 16 - len(raw) % 16
    raw += bytes([pad]) * pad
    c = Cipher(algorithms.AES(AES_KEY), modes.ECB())
    enc = c.encryptor()
    return base64.b64encode(enc.update(raw) + enc.finalize()).decode()
ts = int(time.time() * 1000)
inner = {
    'agency_uid': AGENCY, 'timestamp': ts,
    'member_account': PREFIX + '1111111',
    # Only this field changes per game. Default: SABA Sports (known-good in Winco).
    'game_uid': os.environ.get('TEST_GAME_UID', '08ced9dd788aed11ff3c7f387ae0f063'),
    'credit_amount': '1000.00', 'currency_code': 'INR', 'language': 'en',
    'home_url': HOME_URL, 'platform': 'web',
    'callback_url': CALLBACK_URL,
}
body = {'agency_uid': AGENCY, 'timestamp': ts, 'payload': encrypt(inner)}
Path('huidu-launch-body.json').write_text(json.dumps(body))
print('Wrote huidu-launch-body.json')
print('POST this to:', SERVER_URL + LAUNCH_PATH)
print('home_url    =', HOME_URL)
print('callback_url=', CALLBACK_URL)