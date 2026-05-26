COUNTRY_CONFIG = {
    'IN': {
        'countryCode': 'IN',
        'currency': 'INR',
        'language': 'hi',
        'paymentMethods': ['upi', 'imps', 'bank_transfer', 'crypto'],
    },
    'BD': {
        'countryCode': 'BD',
        'currency': 'BDT',
        'language': 'bn',
        'paymentMethods': ['bank_transfer', 'bkash', 'nagad', 'crypto'],
    },
    'MM': {
        'countryCode': 'MM',
        'currency': 'MMK',
        'language': 'my',
        'paymentMethods': ['bank_transfer', 'wave_money', 'crypto'],
    },
}


def detect_geo_from_ip(ip: str) -> dict:
    is_local = ip in ('127.0.0.1', '::1') or ip.startswith('192.168.')
    country_code = 'IN' if is_local else 'IN'
    base = COUNTRY_CONFIG.get(country_code, {
        'countryCode': 'US',
        'currency': 'USD',
        'language': 'en',
        'paymentMethods': ['crypto', 'card'],
    })
    return {**base, 'isVpn': False}
