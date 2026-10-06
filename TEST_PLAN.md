# MISSPICK Multiplayer Test Plan

1. Host creates room. Guest joins from separate browser/network.
2. Start game: same question and synchronized countdown.
3. Host answers correctly and early. Verify **CALL A MISS** appears only on host's screen.
4. Host selects a wrong answer as their prediction. Guest chooses that wrong answer.
5. Confirm reveal shows correct answer, both choices, successful prediction, and +1/−1 effects.
6. On reveal, host clicks **I'm ready for next round**. Confirm both players STAY on reveal.
7. Guest clicks **I'm ready for next round**. Confirm both move to next round together.
8. Verify ready indicators and counters are synchronized (0/2, 1/2, then transition).
9. Repeat through eight rounds, with a faster final Lightning timer.
10. Both confirm ready after last round; final leaderboard appears on both devices.
11. Scores never negative, prediction bonuses capped at +2 per round.
12. Rematch resets scores and selected questions.

Also test expired prediction window, invalid code, late answers, ninth player, rejoin while host remains connected, and phone layout. The normal lobby starts when host clicks Start.
