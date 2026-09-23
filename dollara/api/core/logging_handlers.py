"""Log handlers hardened against the file disappearing out from under them.

A plain ``RotatingFileHandler`` keeps writing to whatever inode it opened at
startup. If that file gets deleted or replaced from outside the process — a
manual ``rm logs/games.log``, an external logrotate — the handler never
notices: writes keep succeeding (the process still holds the old, now-unlinked
inode open), so nothing ever raises or shows up in games_error.log, but
nothing new is ever visible at the configured path again either. Since each
Gunicorn/Uvicorn worker loads Django (and this handler) independently, this
can silently blank out the log for every worker at once until the process is
restarted.

``WatchedRotatingFileHandler`` checks the path's identity (device + inode)
before every write, the same way ``logging.handlers.WatchedFileHandler``
does, and reopens the path if it has changed — so a deleted/replaced file is
recreated on the very next log line instead of writes vanishing into an
orphaned file handle.
"""

from __future__ import annotations

import os
from logging.handlers import RotatingFileHandler


class WatchedRotatingFileHandler(RotatingFileHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._identity = self._stat_identity()

    def _stat_identity(self):
        try:
            st = os.stat(self.baseFilename)
            return st.st_dev, st.st_ino
        except OSError:
            return None

    def emit(self, record) -> None:
        if self.stream and self._stat_identity() != self._identity:
            self.stream.close()
            self.stream = None
        super().emit(record)
        self._identity = self._stat_identity()
