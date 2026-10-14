# How game traffic is captured in raw and raw JSON

This is the logging design behind `logs/raw_games.log` and `logs/raw_games.json`.
It is written so the same capture can be rebuilt on another language or platform.
The Python pieces that implement it today are `core/game_logging.py`,
`config/settings.py` (`LOGGING`), `core/views.py` (`games_callback`), and
`services/game_provider.py`.

These two files are the **wire record**: exactly what arrived, exactly what was
decrypted, and exactly what was sent back. They are separate from
`logs/games.log`, which is a short business summary (`launch_success`,
`settled`, `rejected`, …), and separate from the `game_callback_logs` database
table, which is a per-tenant audit that can be truncated or lost with that
database. The files live on disk next to the API process and do not depend on
MySQL.

---

## What each file is for

| File | Shape | When a line is written | Use it to |
|------|--------|------------------------|-----------|
| `logs/raw_games.log` | One greppable text line per wire piece | Immediately, at the moment that piece is seen | See a body even if later steps crash. `grep` a serial, member, or IP. |
| `logs/raw_games.json` | One JSON object per line (NDJSON) | Once, when the request is finished | Read request, decrypted payload, plain ack, and HTTP response as a single object. |

A callback therefore appears as **several lines** in `raw_games.log` and **one
object** in `raw_games.json`. The text file is the durable trace. The JSON
file is the joined record.

Both files rotate at 50 MB and keep 10 backups (`raw_games.log.1` …
`raw_games.log.10`). Encoding is UTF-8. The handler reopens the path if the
file was deleted or replaced, so a manual delete does not silently send later
lines into an unlinked file.

---

## Why the two loggers do not share a parent

Three loggers, three destinations, none of them forwarding to another:

| Logger name | Handler | File |
|-------------|---------|------|
| `games` | text formatter `%(asctime)s %(levelname)s %(message)s` | `games.log`, and WARNING+ also `games_error.log` |
| `games.raw` | same text formatter | `raw_games.log` |
| `games.raw.json` | message only (`%(message)s`) | `raw_games.json` |

`propagate` is off on all three. If `games.raw` were a child of `games` and
propagated, every raw body would also be copied into `games.log`. If
`games.raw.json` propagated into `games.raw`, every JSON line would also be
copied into `raw_games.log`. On another platform, give each sink its own
writer. Do not attach the raw writer as a child of the summary writer.

The JSON formatter prints the message alone because the timestamp is already
a field inside the object. Adding a prefix would break “one JSON value per
line”.

---

## The rule that makes the text file trustworthy

Write the raw bytes **before** parse, decrypt, or validation. A callback that
fails those steps is the one you most need on disk.

The body is appended **last**, untouched, after a `body=` or `payload=` label.
Only `\r` and `\n` are escaped to `\r` and `\n`. That keeps one record on one
line, so a payload that contains a newline cannot forge a second log line.
Do not JSON-escape or truncate this copy. Do not drop the line because JSON
parse failed.

Text line shape:

```text
2026-10-13 05:24:11,123 INFO callback_body tenant=acme ip=203.0.113.10 path=/api/v1/games/callback content_type=application/json body={"agency_uid":"AG1","timestamp":1710000000000,"payload":"<base64 ciphertext>"}
```

Field rules for the prefix (everything before the raw blob):

- `event tenant=<id>` comes first. Missing tenant is `-`.
- Later fields are `key=value`. Empty and null fields are omitted.
- Decimals are written with two places (`10.00`).
- A value that contains whitespace is wrapped in double quotes and its
  internal whitespace is collapsed to single spaces. The raw blob is **not**
  passed through this quoting; it stays verbatim after its label.

---

## Callback capture, in order

```text
aggregator  --POST body-->  API
                              1. read raw body bytes
                              2. write callback_body  + open JSON record
                              3. parse JSON (failure still has step 2 on disk)
                              4. decrypt
                              5. write callback_payload + attach payload
                              6. settle wallet (business log goes to games.log, not here)
                              7. write callback_ack (plain credit, before encrypt)
                              8. encrypt ack, write HTTP JSON
                              9. write callback_response + flush the JSON line
```

### 1. Request body, before anything else

The view reads `request.body` as text (`utf-8`, invalid bytes replaced) and
calls the raw logger with the client IP, path, and content type. That call
does two things:

1. Appends a `callback_body` line to `raw_games.log` right away.
2. Opens one in-flight JSON record for this request:

```json
{
  "ts": "2026-10-13 05:24:11,123",
  "event": "callback",
  "tenant": "acme",
  "ip": "203.0.113.10",
  "path": "/api/v1/games/callback",
  "content_type": "application/json",
  "request": { "agency_uid": "AG1", "payload": "<base64 ciphertext>" }
}
```

`ts` is local time with milliseconds, captured when the record opens
(`YYYY-MM-DD HH:MM:SS,mmm`). It is not taken from the aggregator payload.

If the body is not JSON, `request` stays the original string. A form post
whose JSON parse fails is still logged; the view then treats
`payload=<form field or raw text>` as the envelope. The raw line already
exists either way.

### 2. Decrypted payload, only after a key works

Every configured AES key is tried. A wrong key’s garbage is **not** logged.
The first key that yields valid JSON is the one recorded:

- A `callback_payload` line is appended to `raw_games.log`. The label is
  `payload=` and the value is the decrypted text, not the ciphertext.
- That parsed object is stored on the open record as `payload`.
- A few search fields are **copied to the top** of the same object, next to
  the full payload, so a log shipper can index them without walking `payload`:

  `serial_number`, `member_account`, `game_uid`, `game_round`,
  `bet_amount`, `win_amount`, `currency_code`, `timestamp`

  If `payload.data.transaction.operation` exists, `operation` is copied too.

Empty and null values are not copied.

If decrypt throws, there is no payload line. The `callback_body` line is
already on disk, and the error HTTP reply (step 4) still flushes the JSON
record with `request` and `response` only.

### 3. Plain acknowledgement, before it is encrypted

The ack the player balance is turned into is logged in the clear, then
encrypted into the HTTP body:

```json
{"credit_amount":"90.00","timestamp":"2026-10-13 05:24:11"}
```

- Text file: a `callback_ack` line, label `payload=`, compact JSON
  (no spaces).
- JSON record: the same object stored as `ack`.

This is the value you compare to the wallet. The ciphertext in the HTTP
response is not readable without the key.

### 4. Exact HTTP response, then flush

The view builds the JSON response, then logs `response.content` — the bytes
that will actually be sent — plus the numeric `code`:

- Text file: a `callback_response` line with `code=` and `body=`.
- JSON record: `response` (parsed) and `code`.
- The record is serialized with compact separators and written as **one line**
  to `raw_games.json`. The in-flight slot is cleared.

Error replies use the same function (`code` 1, `msg` set, empty `payload`),
so a rejected callback still closes its JSON line.

Finished callback object (one line in `raw_games.json`):

```json
{"ts":"2026-10-13 05:24:11,123","event":"callback","tenant":"acme","ip":"203.0.113.10","path":"/api/v1/games/callback","content_type":"application/json","request":{"agency_uid":"AG1","timestamp":1710000000000,"payload":"<base64>"},"payload":{"serial_number":"12345","member_account":"p1001","game_uid":"abc","game_round":"R9","bet_amount":"10.00","win_amount":"0.00","currency_code":"USD","timestamp":"2026-10-13 05:24:11"},"serial_number":"12345","member_account":"p1001","game_uid":"abc","game_round":"R9","bet_amount":"10.00","win_amount":"0.00","currency_code":"USD","timestamp":"2026-10-13 05:24:11","ack":{"credit_amount":"90.00","timestamp":"2026-10-13 05:24:11"},"response":{"code":0,"msg":"","payload":"<encrypted ack>"},"code":0}
```

---

## Launch capture, in order

Launch is the outbound call to the aggregator, not the inbound callback.

```text
API  --POST encrypted envelope-->  aggregator
                                      HTTP status + body come back
1. write launch_response immediately (403 pages and HTML included)
2. open JSON record { event: "launch", user, game_uid, url, status, response }
3. if the inner payload is a ciphertext string, decrypt it,
   write launch_payload, attach payload to the open record
4. finally: always flush the JSON line, including when the call throws
```

Step 1 runs **before** the status check and **before** `resp.json()`. A 403
HTML page, a timeout body, or a non-JSON reply is on disk. The URL logged is
the launch URL (no AES key).

`finally` is required. If you only flush on the success path, a failed launch
leaves the JSON record open and the next request on that worker can swallow
it or be swallowed by it.

A launch line in `raw_games.log`:

```text
2026-10-13 05:20:01,010 INFO launch_response tenant=acme user=1001 game_uid=abc url=https://aggregator.example/game/v1 status=200 body={"code":0,"msg":"","payload":"<base64 or object>"}
```

Launch JSON line (`raw_games.json`), after a decrypted inner payload:

```json
{"ts":"2026-10-13 05:20:01,010","event":"launch","tenant":"acme","user":1001,"game_uid":"abc","url":"https://aggregator.example/game/v1","status":200,"response":{"code":0,"msg":"","payload":"<base64>"},"payload":{"game_launch_url":"https://games.example/play/xyz"}}
```

Mock launches (local dev frame, no HTTP call) do not write these raw lines.
There is no aggregator body to capture.

---

## One in-flight record per request

The JSON file is not written field by field. The process keeps **one dict in
request-local storage** and fills it, then writes it once.

On this API that storage is a `contextvars.ContextVar`. Each async task or
thread has its own slot, so two callbacks in flight cannot merge into one
object. On another platform use the same idea:

| Platform | Where to keep the open record |
|----------|-------------------------------|
| Node.js | `AsyncLocalStorage` |
| Go | `context.Context` value, passed down the handler |
| PHP-FPM | a local variable in the request; PHP has no concurrent requests per process |
| Java / Kotlin | request attribute, or a `ThreadLocal` if the callback stays on one thread |
| .NET | `AsyncLocal<T>` or `HttpContext.Items` |

Rules that keep records from sticking together:

1. **Starting a new record flushes any record still open.** A previous failure
   must not keep collecting fields onto the next callback.
2. **The response writer always flushes**, success or error.
3. **Launch uses `finally`**, so an exception still flushes.
4. If a payload or response arrives and no record is open, start a one-off
   record and flush it immediately. Do not drop the piece.
5. Clear the slot **before** writing the line, so a throw inside the write
   cannot make the next request append to a half-finished dict. (This code
   sets the slot to empty, then writes.)

---

## How a string becomes a JSON value

Before a body is stored on the JSON record it is parsed when it looks like
JSON:

- Leading whitespace is ignored for the check only.
- If the first character is `{` or `[`, `JSON.parse` it.
- If parse fails, keep the original string.
- If the result is an object and its `data` field is a string that itself
  starts with `{` or `[`, parse that string once and replace `data`.

That second unwrap exists because some aggregators put a JSON blob inside a
`data` string. One level is enough; do not recurse. The text log keeps the
original string. Only the JSON file stores the parsed form.

`json.dumps` uses `ensure_ascii=false` (Unicode stays Unicode) and
`separators=(',', ':')` (no spaces). Non-JSON types are stringified rather
than dropping the line.

---

## What is intentionally not in these two files

`games.log` / `games_error.log` record decisions, not wire bodies:

`launch_attempt`, `launch_success`, `launch_failed`, `callback_received`,
`settled` (bet, win, net, balance, outcome), `heartbeat`, `duplicate`,
`rejected`, `decrypt_error`, `callback_error`, and the sportsbook settlement
events.

Use `raw_games.*` to see what the provider sent. Use `games.log` to see what
the wallet did with it. A settled round should be joinable by `serial_number`
across `raw_games.json` (top-level field) and `games.log` (`serial=`).

`game_callback_logs.raw_payload` is the same inbound body stored in MySQL,
capped at 65535 characters, and it has no launch traffic and no joined ack.
Do not treat the table as a substitute for the files.

---

## Checklist for another platform

1. Create two sinks that do not write into each other.
   - Text: `raw_games.log`, line = timestamp + level + fields + raw blob last.
   - JSON: `raw_games.json`, line = one object, no extra prefix.
2. On every inbound callback, before `JSON.parse`:
   - write `callback_body` now;
   - open a request-local record with `ts`, `event: "callback"`, tenant, ip,
     path, content type, and `request`.
3. After a successful decrypt only:
   - write `callback_payload` now;
   - set `payload` and copy the search fields onto the record.
4. When building the balance ack, before encrypting it:
   - write `callback_ack`;
   - set `ack`.
5. When the HTTP response bytes are final:
   - write `callback_response` with the status code the provider sees;
   - set `response` and `code`;
   - flush one NDJSON line and clear the slot.
6. On every outbound launch HTTP response, before checking status:
   - write `launch_response` with user, game id, URL, HTTP status, and body;
   - open a record with `event: "launch"`;
   - if you decrypt an inner payload, write `launch_payload` and set `payload`;
   - flush in `finally`.
7. Escape only CR and LF in the text blob. Do not truncate it.
8. Rotate by size. Reopen the file if its inode changes.
9. Keep business events (`settled`, `rejected`, …) in a third, smaller log.

Useful checks once it is running:

```bash
# every raw piece of one callback
grep 12345 logs/raw_games.log

# the joined record for that serial (top-level field, no spaces in the file)
grep '"serial_number":"12345"' logs/raw_games.json

# a launch that never returned JSON
grep launch_response logs/raw_games.log
```
