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
    'game_uid': '4ee8e0051a035b463b47c3c473ce317d',
    'credit_amount': '1000.00', 'currency_code': 'INR', 'language': 'en',
    'home_url': 'https://winco.cc', 'platform': 'web',
    'callback_url': 'https://api.winco.cc/game/',
}
body = {'agency_uid': AGENCY, 'timestamp': ts, 'payload': encrypt(inner)}
Path('huidu-launch-body.json').write_text(json.dumps(body))
print('Wrote huidu-launch-body.json')