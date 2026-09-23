const STORAGE_KEY = 'mw_affiliate_ref';

export function captureReferralFromLocation() {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = (params.get('ref') || params.get('referral') || '').trim();
    if (ref) localStorage.setItem(STORAGE_KEY, ref.toUpperCase());
  } catch {
    // Private mode / blocked storage must not break the page.
  }
}

export function getStoredReferralCode() {
  if (typeof window === 'undefined') return '';
  try {
    return (localStorage.getItem(STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}
