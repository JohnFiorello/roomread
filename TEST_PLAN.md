# QUICKTRAP Test Plan

## Core two-device test

1. Device A creates a room.
2. Device B joins with the six-character room code.
3. Host starts.
4. Confirm both devices see the same puzzle and countdown.
5. Answer correctly early on one device.
6. Confirm that device immediately gets the trap phase while the other device does not see the answer or trap.
7. Place a trap on a wrong answer.
8. Have the other player choose that wrong answer.
9. Confirm the reveal shows the correct answer, fastest player, trap placement, trapped player, and both score changes.
10. Play through all eight rounds and confirm round 8 uses the shorter Lightning timer.
11. Confirm final leaderboard, fastest-wins count, and trap-hit count match on both devices.
12. Use Play Again and confirm a fresh puzzle deck and reset scores.

## Edge checks

- Wrong answer locks; no retry.
- Correct answer too late does not receive a trap opportunity.
- Trap cannot be placed on the correct answer.
- Trap window expires after about 3.2 seconds.
- A trapped player loses at most 1 point in a round.
- Scores never go below zero.
- A trapper earns at most 2 trap points in one round.
- Invalid room code fails clearly.
- Ninth player is rejected.
- Invite link pre-fills the room code.
- Host disconnect ends the room cleanly.
- Mobile buttons remain comfortably tappable.
- No client receives the correct-answer index before reveal.