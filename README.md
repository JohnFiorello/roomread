# QUICKTRAP (working title)

**Solve fast. Set traps. Steal the lead.**

QUICKTRAP is a live 2–8 player browser game built around one easy-to-explain loop:

> Everybody solves the same short puzzle. If you solve it correctly and early enough, secretly trap one wrong answer. Anyone who chooses it gets burned at the reveal.

## Scoring

- Correct answer: **+1**
- Fastest correct answer: **+2**
- Successful trap: **+1 per opponent caught**, capped at +2 per round
- Step on any trap: **−1**, with scores never below zero
- Eight rounds total; the last round is a faster Lightning Round

## Design goals

- Understand what to do in seconds
- Simultaneous play on every device
- Short rounds and immediate feedback
- Skill-first puzzles rather than obscure trivia
- Social payoff at the reveal
- Enough player interaction to create grudges and rematches without eliminating anyone

## Tech

- Static HTML/CSS/JavaScript
- PeerJS/WebRTC multiplayer
- One browser acts as host
- 2–8 players
- Room codes and invite links
- Mobile-first responsive interface
- No login, install, backend account, or database

## Status

Playable prototype for the Handshake AI Skills Studio × OpenAI Multiplayer Game Challenge. The repository name is still \`roomread\` temporarily so the existing GitHub Pages URL keeps working during playtesting. The repository can be renamed once the final game name is locked.