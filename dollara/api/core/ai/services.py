"""In-process AI: fraud scoring (heuristics), welcome calls, chatbot."""

from __future__ import annotations


def fraud_score(
    *,
    user_id: str,
    amount: float,
    transaction_id: str | None = None,
    deposit_count: int = 0,
    withdrawal_count: int = 0,
    account_age_days: int = 30,
    same_ip_accounts: int = 0,
    vpn_detected: bool = False,
    wagering_complete: bool = True,
) -> dict:
    score = 0
    factors: list[str] = []

    if vpn_detected:
        score += 25
        factors.append('VPN/proxy detected')
    if same_ip_accounts > 2:
        score += min(same_ip_accounts * 8, 30)
        factors.append(f'Shared IP with {same_ip_accounts} accounts')
    if amount > 50000:
        score += 20
        factors.append('High transaction amount')
    elif amount > 20000:
        score += 10
    if not wagering_complete:
        score += 20
        factors.append('Wagering incomplete')
    if account_age_days < 7:
        score += 15
        factors.append('New account')
    elif account_age_days < 30:
        score += 5
    if deposit_count == 0 and amount > 0:
        score += 10
        factors.append('First deposit / no prior deposits')
    if withdrawal_count > deposit_count * 2 and withdrawal_count > 3:
        score += 15
        factors.append('High withdrawal frequency')

    score = min(score, 100)
    risk = 'low' if score < 40 else 'medium' if score < 70 else 'high'
    rec = 'approve' if score < 40 else 'review' if score < 80 else 'reject'

    return {
        'score': score,
        'risk_level': risk,
        'factors': factors,
        'recommendation': rec,
        'user_id': user_id,
        'transaction_id': transaction_id,
    }


def welcome_call(
    *,
    user_id: str,
    name: str,
    voice_executive_id: str = 'AI_EXEC_001',
    brand: str = 'our platform',
) -> dict:
    display = name or 'Player'
    transcript = (
        f"Hello {display}, how are you? I'm calling on behalf of {brand}. "
        f"Are you free for a couple of minutes? Which games do you usually play? "
        f"Great news! Free money has been added to your wallet. "
        f"You can play and even withdraw it, {display}! "
        f"Perfect! You've received my WhatsApp and Telegram contact. "
        f"Thank you, {display}. Enjoy playing!"
    )
    return {
        'status': 'completed',
        'duration_seconds': 85,
        'transcript': transcript,
        'deposit_intent': False,
        'deposit_amount': None,
        'user_id': user_id,
        'voice_executive_id': voice_executive_id,
    }


def chat_respond(*, message: str, language: str = 'en', brand: str = 'our platform') -> dict:
    lower = message.lower()
    if 'deposit' in lower:
        reply = 'To deposit, go to Wallet > Deposit. UPI is instant. Min ₹100.'
    elif 'withdraw' in lower:
        reply = 'Withdrawals process in 2-24 hours after KYC verification.'
    elif 'bonus' in lower:
        reply = 'Your welcome bonus of ₹100 is in your bonus wallet. Wagering is 35x.'
    else:
        reply = f"I'm your {brand} assistant. How can I help you today?"
    return {'reply': reply, 'language': language}
