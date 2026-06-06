"""In-process AI: fraud scoring (PyTorch), welcome calls, chatbot."""

from __future__ import annotations

import torch
import torch.nn as nn

PYTORCH_VERSION = torch.__version__


class FraudNet(nn.Module):
    """Simple MLP for transaction fraud scoring."""

    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(8, 32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


_fraud_model = FraudNet()
_fraud_model.eval()

with torch.no_grad():
    for p in _fraud_model.parameters():
        nn.init.xavier_uniform_(p if p.dim() > 1 else p.unsqueeze(0))


def pytorch_version() -> str:
    return PYTORCH_VERSION


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
    features = torch.tensor(
        [
            [
                min(amount / 100000, 1.0),
                min(deposit_count / 50, 1.0),
                min(withdrawal_count / 20, 1.0),
                min(account_age_days / 365, 1.0),
                min(same_ip_accounts / 5, 1.0),
                float(vpn_detected),
                float(not wagering_complete),
                0.5,
            ]
        ],
        dtype=torch.float32,
    )

    with torch.no_grad():
        raw = _fraud_model(features).item()

    score = int(raw * 100)
    factors: list[str] = []
    if vpn_detected:
        factors.append('VPN/proxy detected')
    if same_ip_accounts > 2:
        factors.append(f'Shared IP with {same_ip_accounts} accounts')
    if amount > 50000:
        factors.append('High transaction amount')
    if not wagering_complete:
        factors.append('Wagering incomplete')

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
