
# ODD MOTIVES

**Everybody gets the same map. Nobody gets the same goal.**

ODD MOTIVES is a live 2–8 player browser game about bluffing, coordination, and conflicting private objectives. Each round gives every player a secret motive, then asks them to send one public signal before everyone secretly chooses where to go. The reveal shows who grouped up, who slipped away, and whose hidden agenda actually worked.

## Core loop

1. **Get a secret motive** — be alone, form a pair, join the biggest crowd, shadow a specific player, dodge them, and more.
2. **Send a public signal** — PULL people toward one zone or PUSH them away. Signals reveal simultaneously, so nobody can wait and copy.
3. **Make your real move** — secretly choose one of four zones after seeing the room’s signals.
4. **Reveal the board** — score 3 points if your motive succeeds. Earn +1 Misdirect if you succeeded while your signal pointed people the wrong way.
5. Play five rounds. Highest score wins.

## Why it fits multiplayer phones

Private goals and hidden moves stay private on each player’s device, while synchronized signals and reveals create the shared game. There is no login, install, account, or shared network requirement.

## Tech

- Static HTML/CSS/JavaScript
- PeerJS/WebRTC for live peer-to-peer multiplayer
- One browser acts as the room host
- Room code and invite link joining
- Responsive mobile/desktop UI
- Rejoin support for guest devices while the host remains open

## Contest build

Built for the Handshake AI Skills Studio × OpenAI Multiplayer Game Challenge.
