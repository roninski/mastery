import math

ANCHORS = [
    (0, 1),
    (20, 11),
    (100, 26),
    (1000, 51),
    (5000, 86),
    (10000, 100),
]

TIER_NAMES = [
    (1,   "Novice"),
    (11,  "Amateur"),
    (26,  "Competent"),
    (51,  "Expert"),
    (86,  "Elite"),
    (100, "Master"),
]


def _find_segment(hours: float):
    for i in range(len(ANCHORS) - 1):
        h0, l0 = ANCHORS[i]
        h1, l1 = ANCHORS[i + 1]
        if hours < h1:
            return h0, l0, h1, l1
    return None


def _find_segment_for_level(level: float):
    for i in range(len(ANCHORS) - 1):
        h0, l0 = ANCHORS[i]
        h1, l1 = ANCHORS[i + 1]
        if l0 <= level <= l1:
            return h0, l0, h1, l1
    return None


def _interp_t(hours: float, h0: float, h1: float) -> float:
    if h0 == 0:
        return math.log(hours + 1) / math.log(h1 + 1)
    return math.log(hours / h0) / math.log(h1 / h0)


def hours_to_level_exact(hours: float) -> float:
    if hours <= 0:
        return 1.0
    if hours >= 10000:
        return 100.0
    seg = _find_segment(hours)
    if seg is None:
        return 100.0
    h0, l0, h1, l1 = seg
    t = _interp_t(hours, h0, h1)
    return l0 + (l1 - l0) * t


def hours_to_level(hours: float) -> int:
    return min(100, max(1, int(hours_to_level_exact(hours))))


def hours_to_progress(hours: float) -> float:
    if hours <= 0:
        return 0.0
    level_exact = hours_to_level_exact(hours)
    if level_exact >= 100.0:
        return 1.0
    return level_exact - math.floor(level_exact)


def level_to_hours(level: float) -> float:
    level = max(1.0, min(100.0, float(level)))
    if level <= 1.0:
        return 0.0
    if level >= 100.0:
        return 10000.0
    seg = _find_segment_for_level(level)
    if seg is None:
        return 0.0
    h0, l0, h1, l1 = seg
    t = (level - l0) / (l1 - l0)
    if h0 == 0:
        return math.exp(t * math.log(h1 + 1)) - 1
    return h0 * ((h1 / h0) ** t)


def get_tier_name(level: int) -> str:
    name = "Novice"
    for threshold, label in TIER_NAMES:
        if level >= threshold:
            name = label
    return name


def get_skill_info(hours: float) -> dict:
    if hours >= 10000:
        return {
            "level": 100,
            "progress_pct": 1.0,
            "tier_name": "Master",
            "hours_to_next_level": 0.0,
        }
    level = hours_to_level(hours)
    progress = hours_to_progress(hours)
    tier = get_tier_name(level)
    hours_to_next = max(0.0, level_to_hours(level + 1) - hours) if level < 100 else 0.0
    return {
        "level": level,
        "progress_pct": round(progress, 4),
        "tier_name": tier,
        "hours_to_next_level": round(hours_to_next, 2),
    }
