#!/usr/bin/env python3
"""Generate realistic sample data for Protocol Tracker.

Writes markdown files into data/:
  - 4 protocols (one archived mid-way, to demonstrate historical bands)
  - 4 life events
  - ~60 days of daily logs with plausible correlations:
      * meditation -> better mood/sleep the NEXT day
      * vitamin D -> slightly better health
      * evening walks -> lower pain next day
      * keto diet (until archived) -> slightly lower pain
      * flu week -> health/energy crash, pain spike
      * cabin trip -> mood boost
      * deadline week -> worse sleep, stressed mood
Run from the nextjs_space directory:  python3 scripts/gen_sample_data.py
"""
import os
import random
from datetime import date, timedelta

random.seed(42)

ROOT = os.path.join(os.path.dirname(__file__), "..", "data")
TODAY = date.today()
START = TODAY - timedelta(days=59)

PROTOCOLS = [
    # slug, name, created, archived
    ("morning-meditation", "Morning Meditation", START.isoformat(), None),
    ("vitamin-d", "Vitamin D", START.isoformat(), None),
    ("evening-walk", "Evening Walk", (START + timedelta(days=28)).isoformat(), None),
    ("keto-diet", "Keto Diet", START.isoformat(), (START + timedelta(days=45)).isoformat()),
]

EVENTS = [
    ("strength-program", START + timedelta(days=14), "Started strength program"),
    ("flu-week", START + timedelta(days=28), "Flu week"),
    ("cabin-trip", START + timedelta(days=46), "Cabin weekend"),
    ("deadline-week", START + timedelta(days=50), "Work deadline crunch"),
]

FLU_START = START + timedelta(days=28)
FLU_END = START + timedelta(days=34)
TRIP_START = START + timedelta(days=46)
TRIP_END = START + timedelta(days=48)
CRUNCH_START = START + timedelta(days=50)
CRUNCH_END = START + timedelta(days=55)
KETO_END = START + timedelta(days=45)


def clamp(v):
    return max(1, min(10, int(round(v))))


def mood_word(x, y):
    band = lambda v: 2 if v >= 7 else (1 if v >= 4 else 0)
    if y >= 7:
        table = [["Uneasy", "Stressed", "Enraged"], ["Focused", "Energized", "Surprised"], ["Hopeful", "Optimistic", "Ecstatic"]]
    else:
        table = [["Desolate", "Drained", "Miserable"], ["Apathetic", "Tired", "Lonely"], ["Serene", "Tranquil", "Restful"]]
    return table[band(x)][band(y)]


os.makedirs(os.path.join(ROOT, "protocols"), exist_ok=True)
os.makedirs(os.path.join(ROOT, "logs"), exist_ok=True)
os.makedirs(os.path.join(ROOT, "events"), exist_ok=True)


def write_md(path, fm):
    lines = ["---"]
    for k, v in fm.items():
        if v is None:
            continue
        if isinstance(v, dict):
            lines.append(f"{k}:")
            for kk, vv in v.items():
                lines.append(f"  {kk}: {'null' if vv is None else str(vv).lower() if isinstance(vv, bool) else vv}")
        else:
            lines.append(f"{k}: {v}")
    lines.append("---")
    lines.append("")
    with open(path, "w") as f:
        f.write("\n".join(lines))


# Protocols
for slug, name, created, archived in PROTOCOLS:
    write_md(os.path.join(ROOT, "protocols", f"{slug}.md"), {
        "name": name, "created": created, "archived": archived,
    })

# Events
for slug, d, title in EVENTS:
    write_md(os.path.join(ROOT, "events", f"{d.isoformat()}-{slug}.md"), {"date": d.isoformat(), "title": title})

# Logs: simulate day by day, remembering yesterday's protocol states
prev = {}
for i in range(60):
    d = START + timedelta(days=i)
    ds = d.isoformat()
    weekday = d.weekday()  # 0=Mon

    med = None
    if random.random() < 0.04:
        med = None  # occasionally unlogged
    else:
        med = random.random() < (0.8 if weekday < 5 else 0.55)

    vitd = random.random() < 0.85 if random.random() > 0.04 else None
    walk_created = d >= START + timedelta(days=28)
    walk = (random.random() < (0.7 if weekday < 5 else 0.6)) if walk_created and random.random() > 0.05 else (None if walk_created else None)
    keto = (random.random() < 0.7) if d <= KETO_END else None

    protocols = {"morning-meditation": med, "vitamin-d": vitd}
    if walk_created:
        protocols["evening-walk"] = walk
    if keto is not None:
        protocols["keto-diet"] = keto

    # Metrics
    sleep = random.gauss(6.5, 1.0)
    health = random.gauss(7.0, 0.9)
    pain = random.gauss(2.8, 0.9)
    mood_x = random.gauss(6.6, 1.1)  # pleasantness
    mood_y = random.gauss(6.1, 1.2)  # energy

    # Meditation effect: better sleep same night, better mood next day
    if med is True:
        sleep += 0.8
        mood_y += 0.3
    if prev.get("morning-meditation") is True:
        mood_x += 0.7
        mood_y += 0.4
    # Vitamin D: mild health effect
    if vitd is True:
        health += 0.4
    # Evening walk: less pain next day
    if prev.get("evening-walk") is True:
        pain -= 0.8
    # Keto: less pain same day
    if keto is True:
        pain -= 0.5
    # Flu week
    if FLU_START <= d <= FLU_END:
        health -= 3.0
        pain += 3.2
        mood_y -= 2.4
        sleep += 0.7
        mood_x -= 0.8
    # Cabin trip
    if TRIP_START <= d <= TRIP_END:
        mood_x += 1.6
        mood_y += 0.4
        pain -= 0.5
    # Deadline crunch
    if CRUNCH_START <= d <= CRUNCH_END:
        sleep -= 1.3
        mood_x -= 1.1
        mood_y += 0.6
        pain += 0.6

    log = {
        "date": ds,
        "moodX": clamp(mood_x),
        "moodY": clamp(mood_y),
        "sleep": clamp(sleep),
        "health": clamp(health),
        "pain": clamp(pain),
        "protocols": protocols,
    }
    write_md(os.path.join(ROOT, "logs", f"{ds}.md"), log)
    prev = protocols

print(f"Sample data written to {os.path.abspath(ROOT)}")
print("Protocols:", len(PROTOCOLS), "| Events:", len(EVENTS), "| Logs: 60 days")
