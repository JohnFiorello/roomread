# MISSPICK (working title)

**Solve it first. Then call the miss.**

A live multiplayer brain game for 2–8 people. Everyone gets the same timed four-choice puzzle. If you solve it early, you can **predict one wrong answer somebody else will pick**. Correct predictions give you points and cost the person who made that mistake a point.

## Scoring

- Right answer **+1 point**.
- Fastest right answer **+2 bonus points**.
- A correct **Call a Miss** prediction: **+1 per person** (maximum +2 per round).
- If someone correctly predicts your wrong answer: **−1 point**, scores never below zero.
- Everyone clicks **I’m ready** after each reveal before the next round begins.

Eight rounds, including a fast Lightning Round. A curated eight-round deck contains at most two number-heavy questions; the rest emphasizes wordplay, patterns, and compact logic.

## Implementation

Static HTML/CSS/JavaScript, PeerJS/WebRTC, room codes, no account or install. One browser is host; 2–8 devices stay synchronized. The GitHub repository remains `roomread` while the name is still a working title. The published URL stays:
https://johnfiorello.github.io/roomread/

## Playtest guidance

Check that the new prediction language, ready gate, and timing are intuitive to people who haven't seen the rules. The [test plan](TEST_PLAN.md) covers the important sync and scoring edge cases.
