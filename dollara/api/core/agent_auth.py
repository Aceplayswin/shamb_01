"""Authentication for the fourth actor type: agents.

Mirrors :mod:`core.affiliate_auth` in shape and for the same reason:
``require_auth(['agent'])`` would pass its role check (that check is a plain
membership test), but its account-exists guard is hardcoded to ``role == 'user'``,
so a closed or suspended agent would keep working until their token expired.
Agents get their own decorator rather than an edit to the one every player and
admin endpoint depends on.

Only a JWT guard lives here — there is no signed server-to-server contract for
agents the way there is for affiliates. Agents act through the panel, never
through their own backend.
"""

from __future__ import annotations

import logging

from django.http import JsonResponse

from core.agent_models import Agent

logger = logging.getLogger('agent')


def require_agent(allow_locked: bool = False):
    """Guard a panel endpoint. Sets ``request.agent`` on success.

    ``allow_locked`` opens an endpoint to an account whose *betting* is locked.
    That is the common case, not an edge one: a bet-locked agent is still meant
    to read their own reports and settle up — locking bets is how an operator
    freezes new liability without cutting off the books.
    """

    def decorator(view_func):
        def wrapped(request, *args, **kwargs):
            if not request.auth:
                return JsonResponse({'error': 'Unauthorized'}, status=401)
            if request.auth.role != 'agent':
                return JsonResponse({'error': 'Forbidden'}, status=403)

            agent = Agent.objects.filter(id=request.auth.sub).first()
            if not agent:
                return JsonResponse(
                    {'error': 'Agent account not found. Please log in again.'},
                    status=401,
                )
            if agent.status == Agent.Status.CLOSED or not agent.is_active:
                return JsonResponse(
                    {'error': 'This account has been closed.'}, status=403
                )
            if agent.status == Agent.Status.SUSPENDED:
                return JsonResponse(
                    {'error': 'This account has been suspended.'}, status=403
                )
            if agent.user_locked:
                return JsonResponse(
                    {'error': 'This account is locked. Contact your upline.'},
                    status=403,
                )
            if agent.bet_locked and not allow_locked:
                return JsonResponse(
                    {'error': 'Betting is locked on this account.'}, status=403
                )

            request.agent = agent
            return view_func(request, *args, **kwargs)

        wrapped.__name__ = getattr(view_func, '__name__', 'wrapped')
        wrapped.__doc__ = view_func.__doc__
        return wrapped

    return decorator
