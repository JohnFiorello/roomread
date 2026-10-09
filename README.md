# MISSPICK

**Solve fast. Call the miss.**

MISSPICK is a live 2–8 player multiplayer brain game built for fast, social rounds. Everyone gets the same timed four-choice puzzle. Get the right answer early and you unlock a second move: **Call a Miss** by predicting which wrong answer another player will choose.

## Scoring

- Right answer: **+1**
- Fastest right answer: **+2 bonus**
- Correct Call a Miss prediction: **+1 per player caught**, up to +2 per round
- If someone correctly predicts your wrong answer: **−1**, with scores never below zero
- Everyone confirms **Ready** before the next round

Eight rounds mix wordplay, logic, patterns and a limited amount of math, ending with a faster Lightning Round.

## Visual direction

The finished interface uses a neon late-80s/early-90s arcade-trivia aesthetic: bold colored answer pads, CRT scanlines, cabinet-style frames, and dynamic player score panels across the top. It deliberately avoids health bars or combat HUDs—the influence is arcade energy, not a literal fighting game.

## Tech

- Static HTML/CSS/JavaScript
- PeerJS/WebRTC live multiplayer
- Host-authoritative room state
- 2–8 players
- Room codes + invite links
- Mobile-first responsive UI
- Automated two-browser end-to-end multiplayer test
- No login, install, database, or backend account

## Play

https://johnfiorello.github.io/roomread/

Built for the Handshake AI Skills Studio × OpenAI Multiplayer Game Challenge.
