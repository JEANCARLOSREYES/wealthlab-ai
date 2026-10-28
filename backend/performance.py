"""Returns based on explicit portfolio checkpoints, never on deposits as profit."""

import math
from .models import State


def performance(s: State):
    points = sorted(s.checkpoints, key=lambda p: p.date)
    base = {
        "points": [p.model_dump(mode="json") for p in points],
        "twr": None,
        "mwr": None,
        "reason": "Add at least two dated checkpoints.",
        "days": 0,
    }
    if len(points) < 2:
        return base
    days = (points[-1].date - points[0].date).days
    base["days"] = days
    # Checkpoint value is AFTER a flow at that exact end-of-day. First value
    # already includes that day's flow, so the opening flow must not be counted twice.
    linked = 1.0
    for prev, end in zip(points, points[1:]):
        linked *= (end.value - end.flow) / prev.value
    base["twr"] = (linked - 1) * 100
    dates = [points[0].date] + [p.date for p in points[1:]] + [points[-1].date]
    amounts = [-points[0].value] + [-p.flow for p in points[1:]] + [points[-1].value]
    years = [(d - dates[0]).days / 365.0 for d in dates]

    def npv_log(log_rate):
        return sum(
            v * math.exp(max(-600, min(600, -t * log_rate)))
            for v, t in zip(amounts, years)
        )

    # Scan on log(1+r) to detect multiple roots rather than silently choosing one.
    roots = []
    prior = -9.21034
    fprior = npv_log(prior)
    for i in range(1, 801):
        current = -9.21034 + i * 18.42068 / 800
        fcurrent = npv_log(current)
        if fprior == 0:
            roots.append(prior)
        elif (fprior < 0) != (fcurrent < 0):
            lo = prior
            hi = current
            flo = fprior
            for _ in range(70):
                mid = (lo + hi) / 2
                fm = npv_log(mid)
                if (fm < 0) == (flo < 0):
                    lo = mid
                    flo = fm
                else:
                    hi = mid
            roots.append((lo + hi) / 2)
        prior = current
        fprior = fcurrent
    roots = sorted({round(r, 9) for r in roots})
    if len(roots) == 1:
        base["mwr"] = (math.exp(roots[0]) - 1) * 100
        base["reason"] = (
            "XIRR uses actual dates and 365-day years. TWR links checkpoint periods with flows at the end of each period."
        )
    elif len(roots) > 1:
        base["reason"] = (
            "Multiple XIRR roots: an unambiguous money-weighted rate is unavailable."
        )
    else:
        base["reason"] = (
            "No XIRR root found within the supported range (−99.99% to about 999,900% annually)."
        )
    return base
