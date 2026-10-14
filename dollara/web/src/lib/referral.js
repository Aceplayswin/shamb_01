const REF_KEY = 'mw_affiliate_ref';
const SUB_KEY = 'mw_affiliate_sub';
const CLK_KEY = 'mw_affiliate_clk';

function read(key) {
  if (typeof window === 'undefined') return '';
  try {
    return (localStorage.getItem(key) || '').trim();
  } catch {
    return '';
  }
}

function write(key, value) {
  if (value) localStorage.setItem(key, value);
  else localStorage.removeItem(key);
}

/** Stash ?ref=&sub=&clk= from a tracking redirect. A later visit replaces them. */
export function captureReferralFromLocation() {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = (params.get('ref') || params.get('referral') || '').trim();
    if (!ref) return;
    write(REF_KEY, ref.toUpperCase());
    write(SUB_KEY, (params.get('sub') || '').trim());
    const clk = (params.get('clk') || '').trim();
    write(CLK_KEY, /^\d+$/.test(clk) ? clk : '');
  } catch {
    // Private mode / blocked storage must not break the page.
  }
}

export function getStoredReferralCode() {
  return read(REF_KEY);
}

/**
 * Body fields for POST /api/v1/auth/register.
 *
 * A code the player typed is the player-to-player referral. The values a
 * tracking link left in the URL go to affiliate attribution (`affiliateRef`,
 * `affiliateSub`, `affiliateClickId`), which is what ties the signup to the
 * link. When nothing was typed, the stored code is also sent as `referralCode`
 * so a hand-shared `?referral=` still pays the player bonus.
 */
/** Affiliate fields a tracking link left behind. Sent on register and deposit. */
export function affiliateAttribution() {
  const fields = {};
  const stored = getStoredReferralCode();
  if (stored) fields.affiliateRef = stored;
  const sub = read(SUB_KEY);
  if (sub) fields.affiliateSub = sub;
  const clickId = Number(read(CLK_KEY));
  if (Number.isInteger(clickId) && clickId > 0) fields.affiliateClickId = clickId;
  return fields;
}

export function registerAttribution(typedCode) {
  const typed = (typedCode || '').trim();
  const stored = getStoredReferralCode();
  const fields = { ...affiliateAttribution() };
  const referralCode = typed || stored;
  if (referralCode) fields.referralCode = referralCode;
  return fields;
}
