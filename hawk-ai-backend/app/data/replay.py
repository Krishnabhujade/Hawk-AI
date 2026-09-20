"""Replay clock: plays back one past trading day as if it were today.

REPLAY_CLOCK=live   → the replay moves minute by minute with the real clock. The 375-minute
                      session (09:15–15:30) loops all day, so prices move even at night.
                      At 09:15 real time the replay is at 09:15, at 15:29 it is at 15:29.
REPLAY_CLOCK=14:00  → the market is frozen at that time (handy for demos and tests).
"""

from datetime import date, datetime, time, timedelta, timezone

from .cache import SESSION_MINUTES, SESSION_OPEN_MIN

IST = timedelta(hours=5, minutes=30)


def now_ist() -> datetime:
    return (datetime.now(timezone.utc) + IST).replace(tzinfo=None)


class ReplayClock:
    def __init__(self, day: date, mode: str = "live"):
        self.day = day
        self.mode = mode.strip().lower()
        self.fixed_minute: int | None = None
        if self.mode != "live":
            self.fixed_minute = self._parse_fixed(self.mode)

    @staticmethod
    def _parse_fixed(mode: str) -> int:
        """'14:00' -> session minute. Raises a readable error for anything else.

        Without this, REPLAY_CLOCK=1400 failed with "not enough values to
        unpack" from inside startup, which gives no hint about the setting.
        """
        hh, _, mm = mode.partition(":")
        if not hh.isdigit() or not mm.isdigit():
            raise ValueError(f"REPLAY_CLOCK must be 'live' or 'HH:MM' (24-hour), not {mode!r}.")
        hours, minutes = int(hh), int(mm)
        if not (0 <= hours < 24 and 0 <= minutes < 60):
            raise ValueError(f"REPLAY_CLOCK {mode!r} is not a real time of day.")
        # Times outside 09:15-15:29 clamp to the nearest end of the session.
        return min(max(hours * 60 + minutes - SESSION_OPEN_MIN, 0), SESSION_MINUTES - 1)

    @property
    def live(self) -> bool:
        return self.fixed_minute is None

    def position(self) -> tuple[int, float]:
        """(session minute 0–374, fraction of that minute elapsed)."""
        if self.fixed_minute is not None:
            return self.fixed_minute, 0.0
        now = now_ist()
        k = (now.hour * 60 + now.minute - SESSION_OPEN_MIN) % SESSION_MINUTES
        return k, (now.second + now.microsecond / 1e6) / 60

    def now(self) -> datetime:
        """Current replay market time (India time on the replay day)."""
        k, frac = self.position()
        return datetime.combine(self.day, time(9, 15)) + timedelta(minutes=k + frac)

    def minute_start(self) -> datetime:
        k, _ = self.position()
        return datetime.combine(self.day, time(9, 15)) + timedelta(minutes=k)

    def elapsed_minutes(self, since_utc: datetime) -> int:
        """Market minutes that have passed since a real moment (0 when the clock is frozen)."""
        if not self.live:
            return 0
        return max(0, int((datetime.now(timezone.utc) - since_utc).total_seconds() // 60))
