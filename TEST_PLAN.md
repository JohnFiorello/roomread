
# ODD MOTIVES Multiplayer Test Plan

## Required two-device path

1. Device A opens the public URL and creates a room.
2. Device B opens the public URL on a different device/network and joins using the six-character room code.
3. Confirm both devices show the same lobby and player names.
4. Start the game and confirm each device receives a private motive.
5. Each player submits a PULL or PUSH signal. Confirm neither player sees the other signal until both lock in.
6. Confirm the game advances to the move phase and both devices see the same public signals.
7. Each player secretly selects a final zone. Confirm the reveal waits for everyone.
8. Confirm both devices show the same final positions, motives, scoring, and leaderboard.
9. Play all five rounds and confirm final rankings and room statistics match.
10. Select Play Again and confirm scores and motives reset while the room stays intact.

## Edge checks

- Invalid room code shows a clear error.
- A ninth player is rejected.
- Guest refresh/rejoin works while host remains open.
- Host leaving ends the room cleanly for guests.
- Invite link pre-fills the room code.
- Buttons are usable on narrow mobile screens.
- Game remains understandable without verbal explanation.
