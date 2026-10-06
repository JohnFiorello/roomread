(() => {
  'use strict';

  const MAX_PLAYERS = 8;
  const TOTAL_ROUNDS = 5;
  const PEER_PREFIX = 'roomread-';
  const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  const PROMPTS = [
    { q: 'Your group gets a surprise three-day trip. Where are you going?', a: ['Beach resort', 'Big city', 'Mountain cabin', 'Theme park'] },
    { q: 'One everyday annoyance disappears forever. Which one?', a: ['Traffic', 'Passwords', 'Spam calls', 'Waiting in lines'] },
    { q: 'You have to eat one cuisine for a month. What wins?', a: ['Mexican', 'Italian', 'Japanese', 'Breakfast food'] },
    { q: 'Movie night. What gets the room to say yes fastest?', a: ['Comedy', 'Action', 'Horror', 'Animation'] },
    { q: 'You find $500 you have to spend today. What sounds best?', a: ['Mini vacation', 'Great meal + friends', 'Upgrade your tech', 'Buy something ridiculous'] },
    { q: 'Pick one harmless superpower.', a: ['Pause time for 10 seconds', 'Never need sleep', 'Talk to animals', 'Teleport only to work/school'] },
    { q: 'Your group opens a tiny business together. What is it?', a: ['Coffee shop', 'Food truck', 'Arcade', 'Dog daycare'] },
    { q: 'You can instantly master one skill. Which gets picked?', a: ['Play any instrument', 'Speak every language', 'Cook like a chef', 'Fix anything'] },
    { q: 'Free tickets appear. Which event is most likely to win?', a: ['Concert', 'Pro sports', 'Comedy show', 'Theme park'] },
    { q: 'Which tiny luxury improves a normal day the most?', a: ['Perfect coffee', 'Zero traffic', 'Fresh sheets', 'A 2-hour nap'] },
    { q: 'A meeting has to have one perk. Pick the room favorite.', a: ['Free snacks', 'Ends 20 min early', 'No slides', 'Starts at noon'] },
    { q: 'You can keep only one app category on your phone.', a: ['Messaging', 'Maps', 'Music', 'Video'] },
    { q: 'A robot handles one chore forever. What do you assign it?', a: ['Laundry', 'Dishes', 'Cleaning floors', 'Grocery shopping'] },
    { q: 'You all get a bonus day off tomorrow. What is the move?', a: ['Sleep in', 'Day trip', 'Do absolutely nothing', 'Catch up on life'] },
    { q: 'Pick the best “unexpectedly fun” group activity.', a: ['Karaoke', 'Escape room', 'Bowling', 'Trivia night'] },
    { q: 'Which snack disappears first at a party?', a: ['Chips + dip', 'Pizza', 'Cookies', 'Cheese board'] },
    { q: 'You have to give up one for a year. Which goes?', a: ['Streaming', 'Coffee', 'Online shopping', 'Social media'] },
    { q: 'Your group can instantly improve one thing about work or school.', a: ['Fewer meetings', 'Shorter days', 'Better food', 'No email'] },
    { q: 'Choose the pet your group would most want to hang out with.', a: ['Golden retriever', 'Tiny goat', 'Capybara', 'Very chill cat'] },
    { q: 'The group has one hour and no plan. What sounds most fun?', a: ['Walk + coffee', 'Game night', 'Food crawl', 'Random road trip'] },
    { q: 'Pick a fictional “quality of life” upgrade.', a: ['Undo button', 'Fast travel', 'Save point', 'Mute button for the world'] },
    { q: 'What is the strongest sign a weekend is going well?', a: ['You forgot the time', 'Great food', 'Good weather', 'You laughed a lot'] },
    { q: 'Your group must win one very low-stakes championship.', a: ['Mini golf', 'Cornhole', 'Mario Kart', 'Pub trivia'] },
    { q: 'A mysterious button gives everyone one upgrade. Choose it.', a: ['More confidence', 'More energy', 'More free time', 'More luck'] }
  ];

  const state = {
    mode: 'home',
    peer: null,
    hostConn: null,
    conns: new Map(),
    room: '',
    meId: null,
    name: '',
    token: getToken(),
    hostGame: null,
    publicState: null,
    error: '',
    joining: false,
    modal: false,
    selected: null
  };

  const $app = document.getElementById('app');
  const $toast = document.getElementById('toast');

  function getToken() {
    let t = localStorage.getItem('roomread-token');
    if (!t) {
      t = cryptoRandom(18);
      localStorage.setItem('roomread-token', t);
    }
    return t;
  }

  function cryptoRandom(len = 8) {
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => (b % 36).toString(36)).join('').slice(0, len);
  }

  function roomCode() {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => ROOM_CHARS[b % ROOM_CHARS.length]).join('');
  }

  function esc(s='') {
    return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = value; ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (_) { return false; }
    }
  }

  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => $toast.classList.remove('show'), 1800);
  }

  function playChime(type='ok') {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.value = type === 'win' ? 660 : 520;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      o.start(); o.stop(ctx.currentTime + 0.2);
    } catch (_) {}
  }

  function setError(msg='') { state.error = msg; render(); }
  function formatRoom(v='') { return v.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6); }
  function showRules() { state.modal = true; render(); }
  function hideRules() { state.modal = false; render(); }

  function topbar(extra='') {
    return `<div class="topbar">
      <div class="brand"><span class="brand-mark">R</span><div>ROOMREAD<span class="brand-sub">read the room • trust your gut</span></div></div>
      <div style="display:flex;gap:8px;align-items:center">${extra}<button class="ghost-btn" data-action="rules">How to play</button></div>
    </div>`;
  }

  function rulesModal() {
    if (!state.modal) return '';
    return `<div class="modal-backdrop" data-action="close-rules">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="rules-title" onclick="event.stopPropagation()">
        <div class="modal-head"><h2 id="rules-title">How ROOMREAD works</h2><button class="icon-btn" aria-label="Close" data-action="close-rules">✕</button></div>
        <ol>
          <li><b>Vote your truth.</b> Pick the answer you personally want. Nobody sees it yet.</li>
          <li><b>Read the room.</b> Guess which answer will get the most votes from everyone.</li>
          <li><b>Reveal.</b> You earn <b>3 points</b> for predicting a winning answer. If your own vote was different and your prediction was still right, you earn a <b>+1 Independent Read bonus</b>.</li>
          <li>After <b>${TOTAL_ROUNDS} rounds</b>, the best room-reader wins. The group also gets a <b>Room Sync</b> score based on how often people agreed.</li>
        </ol>
        <p>No account. No install. One person hosts, everyone else joins with the room code from any phone or laptop.</p>
      </div>
    </div>`;
  }

  function homeView() {
    const prefill = new URLSearchParams(location.search).get('room') || '';
    return `<main class="page">
      ${topbar()}
      <section class="hero">
        <div class="hero-card">
          <div class="eyebrow">Live multiplayer • 2–8 players</div>
          <h1>Read the room.<br><span class="gradient-text">Trust your gut.</span></h1>
          <p class="lead">A five-minute social game about the gap between <b>what you want</b> and <b>what you think everyone else wants</b>.</p>
          <div class="hero-actions">
            <button class="primary-btn" data-action="host" ${state.joining ? 'disabled' : ''}>${state.joining ? 'Creating room…' : 'Create a room'}</button>
            <button class="secondary-btn" data-action="focus-join" ${state.joining ? 'disabled' : ''}>Join a room</button>
          </div>
          <div class="rule-strip">
            <div class="rule-chip"><b>1. Vote your truth</b><span>Choose what you actually want.</span></div>
            <div class="rule-chip"><b>2. Read the room</b><span>Predict what everyone else will choose.</span></div>
            <div class="rule-chip"><b>3. Score the read</b><span>Predict the winner. Bonus if you disagree.</span></div>
          </div>
        </div>
        <div class="side-stack">
          <div class="mini-card"><strong>⚡ 5 rounds</strong><p>Fast enough for a break, fun enough for a rematch.</p></div>
          <div class="mini-card"><strong>👥 Actually social</strong><p>Every round reveals where your group agrees—and where it absolutely does not.</p></div>
          <div class="mini-card"><strong>📱 Any device</strong><p>Phones and laptops stay synced live. No login or download required.</p></div>
        </div>
      </section>
      <section class="card join-panel" id="join-panel">
        <div class="field"><label for="name">Your name</label><input id="name" maxlength="18" autocomplete="nickname" placeholder="e.g. Alex" /></div>
        <div class="field"><label for="room">Room code</label><input id="room" class="code-input" maxlength="6" inputmode="text" placeholder="ABC123" value="${esc(prefill)}" /></div>
        <button class="secondary-btn" data-action="join" ${state.joining ? 'disabled' : ''}>${state.joining ? 'Connecting…' : 'Join room'}</button>
      </section>
      ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
      <div class="notice">ROOMREAD uses a direct peer-to-peer connection. Keep the host’s browser open while you play.</div>
      ${rulesModal()}
    </main>`;
  }

  function lobbyView(ps) {
    const isHost = state.mode === 'host';
    const players = ps.players || [];
    const canStart = isHost && players.length >= 2;
    const roomUrl = `${location.origin}${location.pathname}?room=${ps.room}`;
    return `<main class="page">
      ${topbar(`<span class="tag">${isHost ? 'Host' : 'Joined'}</span>`)}
      <div class="room-head"><div><div class="room-kicker">Room code</div><div class="room-code">${esc(ps.room)}</div></div><button class="ghost-btn" data-action="leave">Leave</button></div>
      <section class="lobby-grid">
        <div class="card">
          <h2>${players.length} player${players.length === 1 ? '' : 's'} in the room</h2>
          <div class="player-list">${players.map((p,i)=>`<div class="player-row"><div class="player-id"><div class="avatar">${esc(p.name.charAt(0).toUpperCase())}</div><div class="player-name">${esc(p.name)}</div></div>${p.isHost ? '<span class="tag">host</span>' : (!p.connected ? '<span class="tag" style="color:#ffd36e;background:rgba(255,211,110,.10)">offline</span>' : '')}</div>`).join('')}</div>
          <div class="copy-row"><button class="secondary-btn" data-action="copy-code">Copy code</button><button class="secondary-btn" data-action="copy-link" data-link="${esc(roomUrl)}">Copy invite link</button></div>
          ${isHost ? `<div style="margin-top:20px"><button class="primary-btn" data-action="start" ${canStart ? '' : 'disabled'}>${canStart ? 'Start game' : 'Waiting for 1 more player'}</button></div>` : `<p class="notice">The host will start when everyone is in.</p>`}
        </div>
        <div class="card"><h3>The whole game in 20 seconds</h3><div class="explain-list">
          <div class="explain-item"><div class="explain-num">1</div><div><b>Vote your truth</b><span>Pick what you actually want.</span></div></div>
          <div class="explain-item"><div class="explain-num">2</div><div><b>Read the room</b><span>Predict which answer gets the most votes.</span></div></div>
          <div class="explain-item"><div class="explain-num">3</div><div><b>Score the read</b><span>3 points for a correct prediction. +1 if you personally voted differently.</span></div></div>
          <div class="explain-item"><div class="explain-num">4</div><div><b>After ${TOTAL_ROUNDS} rounds</b><span>Top score wins. The room also gets a group “sync” score.</span></div></div>
        </div>
      </section>
      ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
      ${rulesModal()}
    </main>`;
  }

  function gameView(ps) {
    const g = ps.game;
    const me = ps.you || {};
    const round = g.round + 1;
    const prompt = g.prompt;
    const progress = Math.round((g.round / TOTAL_ROUNDS) * 100);
    const doneCount = g.phase === 'vote' ? g.status.voted : g.status.predicted;
    const total = ps.players.length;
    const phaseTitle = g.phase === 'vote' ? 'Vote your truth' : 'Read the room';
    const help = g.phase === 'vote'
      ? 'Pick what YOU would choose. Your vote stays hidden until the reveal.'
      : 'Now predict which answer will get the most votes from the room.';
    const currentSelection = g.phase === 'vote' ? me.vote : me.prediction;

    return `<main class="page"><div class="game-wrap">
      ${topbar(`<span class="tag">${esc(ps.room)}</span>`)}
      <div class="progress-row"><span>Round ${round} of ${TOTAL_ROUNDS}</span><span>${phaseTitle}</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
      <section class="card prompt-card">
        <span class="phase-badge">${phaseTitle}</span>
        <h2 class="prompt-text">${esc(prompt.q)}</h2>
        <p class="prompt-help">${help}</p>
        <div class="choice-grid">
          ${prompt.a.map((a,i)=>`<button class="choice-btn ${currentSelection===i?'selected':''}" data-action="choose" data-choice="${i}" ${currentSelection != null ? 'disabled' : ''}><span class="choice-letter">${String.fromCharCode(65+i)}</span><span>${esc(a)}</span></button>`).join('')}
        </div>
      </section>
      <section class="card status-card"><div><b>${currentSelection != null ? 'Locked in.' : 'Make your pick.'}</b><div class="status-text">${doneCount} of ${total} players finished this step</div></div><div class="dots">${Array.from({length:total},(_,i)=>`<span class="dot ${i<doneCount?'done':''}"></span>`).join('')}</div></section>
      ${state.error ? `<div class="error-box">${esc(state.error)}</div>` : ''}
      ${rulesModal()}
    </div></main>`;
  }

  function revealView(ps) {
    const g = ps.game;
    const me = ps.you || {};
    const winners = g.results.winners;
    const scored = me.roundScore || 0;
    const independent = me.independentBonus || false;
    const correct = me.prediction != null && winners.includes(me.prediction);
    const sync = g.results.sync;
    return `<main class="page"><div class="game-wrap">
      ${topbar(`<span class="tag">${esc(ps.room)}</span>`)}
      <div class="reveal-title">${correct ? 'You read the room.' : 'The room surprised you.'}</div>
      <p class="reveal-sub">${correct ? `+${scored} point${scored===1?'':'s'}${independent ? ' • Independent Read bonus' : ''}` : 'No points this round — but now you know your people better.'}</p>
      <section class="card">
        <h2 style="margin-bottom:4px">${esc(g.prompt.q)}</h2>
        <p class="small">What the room actually chose</p>
        <div class="result-stack">
          ${g.prompt.a.map((a,i)=>{
            const pct = ps.players.length ? Math.round((g.results.counts[i]/ps.players.length)*100) : 0;
            return `<div class="result-row ${winners.includes(i)?'winner-row':''}"><div class="result-bar" style="width:${pct}%"></div><div class="result-content"><div class="result-label"><span>${String.fromCharCode(65+i)}.</span><span>${esc(a)}</span>${winners.includes(i)?'<span class="tag">winner</span>':''}</div><div class="result-count">${g.results.counts[i]} vote${g.results.counts[i]===1?'':'s'} • ${pct}%</div></div></div>`;
          }).join('')}
        </div>
        <div class="score-pop">
          <div class="score-tile"><strong>+${scored}</strong><span>Your points this round</span></div>
          <div class="score-tile"><strong>${sync}%</strong><span>Room sync this round</span></div>
          <div class="score-tile"><strong>${g.results.correctReaders}/${ps.players.length}</strong><span>Players who read it right</span></div>
        </div>
      </section>
      ${leaderboard(ps)}
      <div class="actions-center">${state.mode==='host' ? `<button class="primary-btn" data-action="next">${g.round + 1 >= TOTAL_ROUNDS ? 'See final results' : 'Next round'}</button>` : '<span class="small">Waiting for the host to continue…</span>'}</div>
      ${rulesModal()}
    </div></main>`;
  }

  function leaderboard(ps) {
    const sorted = [...ps.players].sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name));
    return `<section class="card" style="margin-top:16px"><h3>Leaderboard</h3><div class="leaderboard">${sorted.map((p,i)=>`<div class="leader-row ${p.id===state.meId?'me-row':''}"><div class="rank">${i+1}</div><div><b>${esc(p.name)}</b>${p.id===state.meId?' <span class="small">(you)</span>':''}</div><div class="score">${p.score}</div></div>`).join('')}</div></section>`;
  }

  function finalView(ps) {
    const sorted = [...ps.players].sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name));
    const meRank = sorted.findIndex(p=>p.id===state.meId)+1;
    const winnerScore = sorted[0]?.score ?? 0;
    const tied = sorted.filter(p=>p.score===winnerScore);
    const harmony = ps.game.finalSync;
    const me = ps.you || {};
    const title = playerTitle(me.score || 0, me.independentReads || 0);
    return `<main class="page"><div class="game-wrap">
      ${topbar(`<span class="tag">Final</span>`)}
      <section class="card final-hero">
        <div class="trophy">🏆</div>
        <h1>${tied.length > 1 ? 'It’s a tie at the top.' : `${esc(sorted[0]?.name || 'Someone')} read the room best.`}</h1>
        <p class="lead" style="margin:0 auto">${tied.length>1 ? `${tied.map(p=>esc(p.name)).join(' and ')} finished with ${winnerScore} points.` : `${esc(sorted[0]?.name || '')} finished with ${winnerScore} points.`}</p>
        <div class="harmony-ring" style="--pct:${harmony}%"><div><strong>${harmony}%</strong><span>ROOM SYNC</span></div></div>
        <div><b>You finished #${meRank} with ${me.score || 0} points.</b></div>
        <span class="title-pill">${esc(title)}</span>
      </section>
      ${leaderboard(ps)}
      <div class="actions-center">${state.mode==='host' ? '<button class="primary-btn" data-action="rematch">Play again</button>' : ''}<button class="secondary-btn" data-action="leave">Leave room</button></div>
      ${rulesModal()}
    </div></main>`;
  }

  function playerTitle(score, independentReads) {
    if (score >= 15) return 'Certified Mind Reader';
    if (independentReads >= 3) return 'Independent Thinker';
    if (score >= 10) return 'Room Whisperer';
    if (score >= 6) return 'Social Radar Online';
    return 'Beautiful Wildcard';
  }

  function render() {
    let html;
    if (state.mode === 'home' || !state.publicState) html = homeView();
    else if (state.publicState.game?.phase === 'final') html = finalView(state.publicState);
    else if (state.publicState.game?.phase === 'reveal') html = revealView(state.publicState);
    else if (state.publicState.game?.phase === 'vote' || state.publicState.game?.phase === 'predict') html = gameView(state.publicState);
    else html = lobbyView(state.publicState);
    $app.innerHTML = html;
  }

  function createHost() {
    if (typeof Peer === 'undefined') return setError('The multiplayer library did not load. Check your internet connection, then refresh and try again.');
    resetNetwork();
    state.mode = 'host';
    state.name = (document.getElementById('name')?.value || 'Host').trim().slice(0,18) || 'Host';
    state.room = roomCode();
    state.joining = true;
    state.error = '';
    render();
    startHostPeer(0);
  }

  function startHostPeer(attempt) {
    if (attempt > 4) { state.mode='home'; setError('Could not create a room. Check your connection and try again.'); return; }
    const peerId = PEER_PREFIX + state.room.toLowerCase();
    const peer = new Peer(peerId, { debug: 0 });
    state.peer = peer;
    peer.on('open', () => {
      state.joining = false;
      const hostId = 'p-host';
      state.meId = hostId;
      state.hostGame = {
        room: state.room,
        phase: 'lobby',
        round: -1,
        deck: seededDeck(state.room),
        players: [{id:hostId, token:state.token, name:state.name, score:0, independentReads:0, isHost:true, connected:true}],
        votes: {}, predictions: {}, history: []
      };
      peer.on('connection', onIncomingConnection);
      syncAll();
    });
    peer.on('error', err => {
      if (err.type === 'unavailable-id') {
        try { peer.destroy(); } catch(_){ }
        state.room = roomCode();
        startHostPeer(attempt+1);
      } else {
        state.mode='home';
        state.peer=null;
        setError('Could not start multiplayer. Please check your internet connection and try again.');
      }
    });
  }

  function seededDeck(seed) {
    let x = 2166136261;
    for (const c of seed) x = Math.imul(x ^ c.charCodeAt(0), 16777619);
    const arr = PROMPTS.map((p,i)=>i);
    for (let i=arr.length-1;i>0;i--) {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      const j = Math.abs(x) % (i+1);
      [arr[i],arr[j]] = [arr[j],arr[i]];
    }
    return arr.slice(0,TOTAL_ROUNDS);
  }

  function onIncomingConnection(conn) {
    const tempKey = conn.peer + ':' + Date.now();
    state.conns.set(tempKey, conn);
    conn.on('data', msg => handleHostMessage(conn, msg, tempKey));
    conn.on('close', () => handleDisconnect(conn));
    conn.on('error', () => handleDisconnect(conn));
  }

  function handleHostMessage(conn, msg, tempKey) {
    if (!msg || typeof msg !== 'object' || !state.hostGame) return;
    if (msg.type === 'join') {
      const cleanName = String(msg.name || '').trim().slice(0,18);
      const token = String(msg.token || '');
      if (!cleanName) { conn.send({type:'join-error', message:'Enter a name to join.'}); return; }
      let p = state.hostGame.players.find(x => x.token === token);
      if (p) {
        p.name = cleanName; p.connected = true;
      } else {
        if (state.hostGame.phase !== 'lobby') { conn.send({type:'join-error', message:'This game has already started.'}); return; }
        if (state.hostGame.players.length >= MAX_PLAYERS) { conn.send({type:'join-error', message:'This room is full.'}); return; }
        p = {id:'p-'+cryptoRandom(8), token, name:cleanName, score:0, independentReads:0, isHost:false, connected:true};
        state.hostGame.players.push(p);
      }
      conn.__playerId = p.id;
      state.conns.delete(tempKey);
      const old = state.conns.get(p.id);
      if (old && old !== conn) try { old.close(); } catch(_){ }
      state.conns.set(p.id, conn);
      conn.send({type:'joined', playerId:p.id});
      syncAll();
      return;
    }
    const p = state.hostGame.players.find(x => x.id === conn.__playerId);
    if (!p) return;
    if (msg.type === 'vote') receiveChoice(p.id, 'vote', Number(msg.choice));
    if (msg.type === 'prediction') receiveChoice(p.id, 'prediction', Number(msg.choice));
  }

  function handleDisconnect(conn) {
    if (!state.hostGame || !conn.__playerId) return;
    const p = state.hostGame.players.find(x=>x.id===conn.__playerId);
    if (p) p.connected = false;
    syncAll();
  }

  function joinRoom() {
    if (typeof Peer === 'undefined') return setError('The multiplayer library did not load. Check your internet connection, then refresh and try again.');
    const name = (document.getElementById('name')?.value || '').trim().slice(0,18);
    const room = formatRoom(document.getElementById('room')?.value || '');
    if (!name) return setError('Enter your name first.');
    if (room.length !== 6) return setError('Enter the 6-character room code.');
    resetNetwork();
    state.mode = 'guest'; state.name=name; state.room=room; state.error=''; state.joining=true;
    const peer = new Peer(undefined, { debug:0 });
    state.peer = peer;
    peer.on('open', () => {
      const conn = peer.connect(PEER_PREFIX + room.toLowerCase(), { reliable:true, serialization:'json' });
      state.hostConn = conn;
      const timeout = setTimeout(()=>{ if(state.joining) { state.mode='home'; setError('Room not found. Double-check the code and try again.'); resetNetwork(); } }, 7000);
      conn.on('open', ()=>{
        conn.send({type:'join', name:state.name, token:state.token});
      });
      conn.on('data', msg => {
        if (msg.type === 'joined') { clearTimeout(timeout); state.joining=false; state.meId=msg.playerId; }
        else if (msg.type === 'join-error') { clearTimeout(timeout); state.mode='home'; setError(msg.message || 'Could not join.'); resetNetwork(); }
        else if (msg.type === 'state') { state.publicState = msg.state; render(); }
      });
      conn.on('close', ()=>{
        if (state.mode==='guest') { state.mode='home'; state.publicState=null; setError('The host disconnected. The room has ended.'); }
      });
      conn.on('error', ()=>{
        if (state.mode==='guest') { state.mode='home'; state.publicState=null; setError('Lost connection to the room.'); }
      });
    });
    peer.on('error', ()=>{
      if (state.mode==='guest') { state.mode='home'; state.publicState=null; setError('Could not connect. Check your internet connection and try again.'); }
    });
    render();
  }

  function startGame() {
    const g = state.hostGame;
    if (!g || g.players.length < 2 || g.phase !== 'lobby') return;
    g.round = 0;
    g.phase = 'vote';
    g.votes = {}; g.predictions = {};
    syncAll();
  }

  function currentPrompt(g) { return PROMPTS[g.deck[g.round]]; }

  function receiveChoice(playerId, kind, choice) {
    const g = state.hostGame;
    if (!g || !Number.isInteger(choice) || choice < 0 || choice > 3) return;
    if (kind==='vote' && g.phase==='vote' && g.votes[playerId] == null) {
      g.votes[playerId]=choice;
      if (Object.keys(g.votes).length >= g.players.length) g.phase='predict';
      syncAll();
    } else if (kind==='prediction' && g.phase==='predict' && g.predictions[playerId] == null) {
      g.predictions[playerId]=choice;
      if (Object.keys(g.predictions).length >= g.players.length) resolveRound();
      syncAll();
    }
  }

  function resolveRound() {
    const g = state.hostGame;
    const counts = [0,0,0,0];
    Object.values(g.votes).forEach(v=>counts[v]++);
    const max = Math.max(...counts);
    const winners = counts.map((c,i)=>c===max?i:null).filter(i=>i!=null);
    let correctReaders = 0;
    const roundScores = {};
    const bonuses = {};
    g.players.forEach(p=>{
      const pred = g.predictions[p.id];
      const vote = g.votes[p.id];
      const correct = winners.includes(pred);
      let pts = correct ? 3 : 0;
      let bonus = false;
      if (correct && !winners.includes(vote)) { pts += 1; bonus = true; p.independentReads = (p.independentReads||0)+1; }
      if (correct) correctReaders++;
      p.score += pts;
      roundScores[p.id]=pts;
      bonuses[p.id]=bonus;
    });
    const sync = Math.round((max / g.players.length) * 100);
    g.history.push({counts,winners,sync,correctReaders,roundScores,bonuses});
    g.phase='reveal';
  }

  function nextRound() {
    const g=state.hostGame;
    if (!g || g.phase!=='reveal') return;
    if (g.round + 1 >= TOTAL_ROUNDS) {
      g.phase='final';
      g.finalSync = Math.round(g.history.reduce((s,h)=>s+h.sync,0) / g.history.length);
    } else {
      g.round++;
      g.phase='vote';
      g.votes={}; g.predictions={};
    }
    syncAll();
  }

  function rematch() {
    const g=state.hostGame; if(!g) return;
    g.phase='lobby'; g.round=-1; g.deck=seededDeck(state.room + cryptoRandom(3)); g.votes={}; g.predictions={}; g.history=[];
    g.players.forEach(p=>{p.score=0;p.independentReads=0;});
    syncAll();
  }

  function publicStateFor(playerId) {
    const g = state.hostGame;
    const player = g.players.find(p=>p.id===playerId);
    const ps = {
      room:g.room,
      players:g.players.map(p=>({id:p.id,name:p.name,score:p.score,isHost:p.isHost,connected:p.connected})),
      game:{phase:g.phase,round:g.round}
    };
    if (g.phase==='vote' || g.phase==='predict' || g.phase==='reveal') {
      ps.game.prompt = currentPrompt(g);
      ps.game.status = {voted:Object.keys(g.votes).length,predicted:Object.keys(g.predictions).length};
      ps.you = {vote:g.votes[playerId] ?? null,prediction:g.predictions[playerId] ?? null,score:player?.score||0,independentReads:player?.independentReads||0};
      if (g.phase==='reveal') {
        const h=g.history[g.history.length-1];
        ps.game.results={counts:h.counts,winners:h.winners,sync:h.sync,correctReaders:h.correctReaders};
        ps.you.roundScore=h.roundScores[playerId]||0;
        ps.you.independentBonus=!!h.bonuses[playerId];
      }
    }
    if (g.phase==='final') {
      ps.game.finalSync=g.finalSync;
      ps.you={score:player?.score||0,independentReads:player?.independentReads||0};
    }
    return ps;
  }

  function syncAll() {
    if (!state.hostGame) return;
    state.publicState = publicStateFor(state.meId);
    for (const [pid, conn] of state.conns) {
      if (!pid.startsWith('p-') || pid==='p-host') continue;
      if (conn?.open) {
        try { conn.send({type:'state', state:publicStateFor(pid)}); } catch(_){ }
      }
    }
    render();
  }

  function choose(choice) {
    const ps=state.publicState;
    if (!ps?.game) return;
    if (state.mode==='host') {
      receiveChoice(state.meId, ps.game.phase==='vote'?'vote':'prediction', choice);
    } else if (state.hostConn?.open) {
      state.hostConn.send({type: ps.game.phase==='vote'?'vote':'prediction', choice});
    }
  }

  function resetNetwork() {
    try { state.hostConn?.close(); } catch(_){ }
    for (const c of state.conns.values()) try{c.close();}catch(_){ }
    try { state.peer?.destroy(); } catch(_){ }
    state.peer=null; state.hostConn=null; state.conns=new Map(); state.hostGame=null; state.publicState=null; state.meId=null;
  }

  function leave() {
    resetNetwork();
    state.mode='home'; state.error=''; state.room='';
    history.replaceState({},'',location.pathname);
    render();
  }

  document.addEventListener('click', async (e) => {
    const el=e.target.closest('[data-action]'); if(!el) return;
    const a=el.dataset.action;
    if (a==='rules') showRules();
    else if (a==='close-rules') hideRules();
    else if (a==='focus-join') document.getElementById('join-panel')?.scrollIntoView({behavior:'smooth',block:'center'});
    else if (a==='host') createHost();
    else if (a==='join') joinRoom();
    else if (a==='leave') leave();
    else if (a==='copy-code') { toast(await copyText(state.publicState.room) ? 'Room code copied' : 'Could not copy'); }
    else if (a==='copy-link') { toast(await copyText(el.dataset.link) ? 'Invite link copied' : 'Could not copy'); }
    else if (a==='start') startGame();
    else if (a==='choose') { choose(Number(el.dataset.choice)); playChime('ok'); }
    else if (a==='next') { nextRound(); playChime('win'); }
    else if (a==='rematch') rematch();
  });

  document.addEventListener('input', (e)=>{
    if (e.target?.id==='room') e.target.value = formatRoom(e.target.value);
  });

  document.addEventListener('keydown', (e)=>{
    if (e.key==='Enter' && state.mode==='home') {
      const active=document.activeElement;
      if (active?.id==='room' || active?.id==='name') joinRoom();
    }
    if (e.key==='Escape' && state.modal) hideRules();
  });

  window.addEventListener('beforeunload', ()=>resetNetwork());
  render();
})();
