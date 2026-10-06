# ROOMREAD

ROOMREAD is a browser-based live multiplayer social game for 2–8 players. Each round separates **what you personally choose** from **what you think the room will choose**.

## Why it fits the Handshake Multiplayer Game Challenge

- 2–8 players can join from separate phones/laptops.
- No account, login, or install is required.
- Players join with a six-character room code or invite link.
- Clear in-product rules and scoring.
- Real-time synchronized state using PeerJS/WebRTC.
- Mobile-friendly responsive interface.
- Five fast rounds, leaderboard, rematch, group “Room Sync” score.

## Rules

1. Vote your truth: choose what you personally want.
2. Read the room: predict which answer will receive the most votes.
3. Reveal:
   - +3 points if your prediction is one of the winning answers.
   - +1 Independent Read bonus if your prediction is correct **and** your own vote was not a winning answer.
4. After 5 rounds, highest score wins.

## Run locally

Serve the repository over HTTP:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deployment

This repository is designed for static hosting. The host device must remain on the game page during play because the host browser is the authoritative game server.
