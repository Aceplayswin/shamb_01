-- =============================================================================
-- One-off data fix: settle user 31's Luck Sports bet slip as LOST
-- =============================================================================
-- The provider settled bet slip
--   74825734-e@340_203301877@e@87374e2a-83e4-4996-86ad-d43c77c3c423
-- on 2026-09-28 09:02:57 UTC (callback serial 167999a8-081c-3466-ba19-2a07683a9ac1,
-- operation exchange_payout, trade_profit -98.07) with all three selections
-- "lost". That callback carried bet 0 / win 0 and was logged as a heartbeat,
-- so the three stakes stayed Pending:
--
--   game_rounds.serial_number               provider bet   stake
--   2aac1fd1-93cc-3d1a-9256-51d634e25600    c22064232      70.00
--   553358b2-5eee-3fda-9314-be556a689c03    c22064261       7.07
--   ede467a6-5eb6-3322-ba6a-36fbff775c7a    c22064305      21.00
--
-- A loss moves no money: the stakes were debited when the bets were placed,
-- so wallets and transactions are NOT touched. This only marks the three
-- rounds settled (win stays 0.00, so they read "lost") and recounts their
-- session's pending counter and status the way the app does.
--
-- Safe to re-run: the round update only matches stakes that are still pending.
-- Usage: mysql -u <user> -p <database> < 2026-09-28_user31_luck_sports_slip_lost.sql
-- =============================================================================

-- 1. Preview: expect 3 rows, settle_status 'pending', win_amount 0.00, one session.
SELECT gr.id, gr.serial_number, gr.bet_amount, gr.win_amount, gr.settle_status,
       gr.game_round, gs.session_uid, gs.pending_rounds, gs.status AS session_status
FROM game_rounds gr
LEFT JOIN game_sessions gs ON gs.id = gr.session_id
WHERE gr.user_id = 31
  AND gr.serial_number IN ('2aac1fd1-93cc-3d1a-9256-51d634e25600',
                           '553358b2-5eee-3fda-9314-be556a689c03',
                           'ede467a6-5eb6-3322-ba6a-36fbff775c7a');

-- The session the stakes belong to. If they span more than one session this
-- fails with "Subquery returns more than 1 row" and the script stops here,
-- before anything is changed.
SET @sid = (
    SELECT DISTINCT session_id
    FROM game_rounds
    WHERE user_id = 31
      AND serial_number IN ('2aac1fd1-93cc-3d1a-9256-51d634e25600',
                            '553358b2-5eee-3fda-9314-be556a689c03',
                            'ede467a6-5eb6-3322-ba6a-36fbff775c7a')
);

START TRANSACTION;

-- 2. Settle the three stakes as lost (win_amount stays 0). Expect 3 on the first run.
UPDATE game_rounds
SET settle_status = 'settled',
    settled_at    = UTC_TIMESTAMP()
WHERE user_id = 31
  AND game_uid = '92b24e4c25107367a80e0fe1a97c24e4'
  AND serial_number IN ('2aac1fd1-93cc-3d1a-9256-51d634e25600',
                        '553358b2-5eee-3fda-9314-be556a689c03',
                        'ede467a6-5eb6-3322-ba6a-36fbff775c7a')
  AND settle_status = 'pending'
  AND win_amount = 0;

SELECT ROW_COUNT() AS rounds_settled;

-- 3. Recount the session's open stakes and set its status as the app does:
--    'wait' while anything is pending, then 'profit' if profit_loss >= 0, else 'loss'.
SET @pending = (
    SELECT COUNT(*)
    FROM game_rounds
    WHERE session_id = @sid AND settle_status = 'pending'
);

UPDATE game_sessions
SET pending_rounds = @pending,
    status = CASE
        WHEN rounds_count = 0 OR @pending > 0 THEN 'wait'
        WHEN profit_loss >= 0 THEN 'profit'
        ELSE 'loss'
    END,
    updated_at = UTC_TIMESTAMP()
WHERE id = @sid;

-- 4. Verify: rounds 'settled' with win_amount 0.00; the session has
--    pending_rounds 0 and status 'loss' (profit_loss -98.07 if these are its only bets).
SELECT serial_number, bet_amount, win_amount, settle_status, settled_at
FROM game_rounds
WHERE user_id = 31
  AND serial_number IN ('2aac1fd1-93cc-3d1a-9256-51d634e25600',
                        '553358b2-5eee-3fda-9314-be556a689c03',
                        'ede467a6-5eb6-3322-ba6a-36fbff775c7a');

SELECT session_uid, rounds_count, pending_rounds, total_bet, total_win, profit_loss, status
FROM game_sessions
WHERE id = @sid;

COMMIT;
