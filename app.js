
(() => {
  "use strict";

  const MAX_PLAYERS = 8;
  const TOTAL_ROUNDS = 5;
  const PEER_PREFIX = "oddmotives-";
  const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const MAPS = [
    {title:"After Hours",subtitle:"Four places. Four very different vibes.",zones:[["🍕","Snack Bar"],["🌃","Rooftop"],["🛋️","Sofa Zone"],["🪩","Dance Floor"]]},
    {title:"Day Off",subtitle:"Where does everybody drift?",zones:[["☕","Coffee Shop"],["🥾","Trailhead"],["🕹️","Arcade"],["📚","Bookstore"]]},
    {title:"Festival",subtitle:"The crowd is moving. So are you.",zones:[["🎤","Main Stage"],["🌮","Food Trucks"],["🎡","Ferris Wheel"],["⛺","Chill Tent"]]},
    {title:"Space Break",subtitle:"Even astronauts have side quests.",zones:[["🔭","Observation Deck"],["🌿","Hydroponics"],["🛰️","Zero-G Gym"],["🍜","Noodle Bar"]]},
    {title:"Campus Detour",subtitle:"Nobody is where they are supposed to be.",zones:[["🏫","Student Center"],["📚","Library"],["🌳","Quad"],["☕","Coffee Cart"]]},
    {title:"Road Trip Stop",subtitle:"Ten minutes somehow becomes forty-five.",zones:[["🥞","Diner"],["🌄","Scenic Overlook"],["🪞","Antique Shop"],["🍬","Snack Stop"]]},
    {title:"Snow Day",subtitle:"Pick your corner of the perfect cancelled day.",zones:[["🔥","Fireplace"],["🛷","Sled Hill"],["🍪","Kitchen"],["🏰","Blanket Fort"]]},
    {title:"Museum After Dark",subtitle:"No guards. Questionable choices.",zones:[["🦖","Dinosaur Hall"],["🎨","Gallery"],["🌿","Conservatory"],["🌌","Planetarium"]]}
  ];

  const state = {
    mode:"home",
    peer:null,
    hostConn:null,
    conns:new Map(),
    room:"",
    meId:null,
    name:"",
    token:getToken(),
    hostGame:null,
    publicState:null,
    error:"",
    joining:false,
    modal:false
  };

  const $app = document.getElementById("app");
  const $toast = document.getElementById("toast");

  function getToken(){
    let t = localStorage.getItem("oddmotives-token");
    if(!t){
      t = randomString(18);
      localStorage.setItem("oddmotives-token",t);
    }
    return t;
  }

  function randomString(len){
    const bytes = new Uint8Array(len || 8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes,b => (b % 36).toString(36)).join("").slice(0,len || 8);
  }

  function randomInt(max){
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return max ? a[0] % max : 0;
  }

  function makeRoomCode(){
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes,b => ROOM_CHARS[b % ROOM_CHARS.length]).join("");
  }

  function esc(v){
    return String(v == null ? "" : v).replace(/[&<>'"]/g,c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }

  function formatRoom(v){
    return String(v || "").toUpperCase().replace(/[^A-Z2-9]/g,"").slice(0,6);
  }

  async function copyText(value){
    try{
      await navigator.clipboard.writeText(value);
      return true;
    }catch(_){
      try{
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      }catch(__){ return false; }
    }
  }

  function toast(msg){
    $toast.textContent = msg;
    $toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => $toast.classList.remove("show"),1800);
  }

  function setError(msg){
    state.error = msg || "";
    render();
  }

  function playTone(win){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = win ? 650 : 480;
      o.type = "sine";
      g.gain.setValueAtTime(.0001,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(.07,ctx.currentTime + .015);
      g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime + .18);
      o.start();
      o.stop(ctx.currentTime + .2);
    }catch(_){}
  }

  function topbar(extra){
    return '<div class="topbar">'+
      '<div class="brand"><span class="brand-mark">O</span><div>ODD MOTIVES<span class="brand-sub">same map • different goals</span></div></div>'+
      '<div style="display:flex;gap:8px;align-items:center">'+(extra || "")+'<button class="ghost-btn" data-action="rules">How to play</button></div>'+
    '</div>';
  }

  function rulesModal(){
    if(!state.modal) return "";
    return '<div class="modal-backdrop" data-action="close-rules">'+
      '<div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">'+
        '<div class="modal-head"><h2>How ODD MOTIVES works</h2><button class="icon-btn" data-action="close-rules" aria-label="Close">✕</button></div>'+
        '<ol>'+
          '<li><b>Get a secret motive.</b> You might need to be alone, form a pair, join the biggest crowd, shadow someone, dodge them, or complete another private objective.</li>'+
          '<li><b>Send one public signal.</b> PULL tells the room “come here.” PUSH says “stay away.” Everybody locks a signal before any are revealed.</li>'+
          '<li><b>Make your real move.</b> After seeing all signals, secretly choose one of the four zones.</li>'+
          '<li><b>Reveal.</b> Complete your motive for <b>3 points</b>. If your motive succeeds and your final move contradicted your signal, earn a <b>+1 Misdirect bonus</b>.</li>'+
          '<li>After <b>'+TOTAL_ROUNDS+' rounds</b>, highest score wins.</li>'+
        '</ol>'+
        '<p>Your signal is not a promise. Bluffing is part of the game.</p>'+
      '</div>'+
    '</div>';
  }

  function homeView(){
    const prefill = new URLSearchParams(location.search).get("room") || "";
    return '<main class="page">'+
      topbar()+
      '<section class="hero">'+
        '<div class="hero-card">'+
          '<div class="eyebrow">Live multiplayer • 2–8 players</div>'+
          '<h1>Everybody has a plan.<br><span class="gradient-text">Nobody has the same one.</span></h1>'+
          '<p class="lead">Signal one thing. Do another. Complete your secret objective without making your motive obvious.</p>'+
          '<div class="hero-actions">'+
            '<button class="primary-btn" data-action="host" '+(state.joining ? "disabled" : "")+'>'+(state.joining ? "Creating room…" : "Create a room")+'</button>'+
            '<button class="secondary-btn" data-action="focus-join" '+(state.joining ? "disabled" : "")+'>Join a room</button>'+
          '</div>'+
          '<div class="rule-strip">'+
            '<div class="rule-chip"><b>1. Get your motive</b><span>Your private win condition changes every round.</span></div>'+
            '<div class="rule-chip"><b>2. Signal the room</b><span>PULL people in or PUSH them away. Truth optional.</span></div>'+
            '<div class="rule-chip"><b>3. Make your move</b><span>Everyone reveals together. Motives finally make sense.</span></div>'+
          '</div>'+
        '</div>'+
        '<div class="side-stack">'+
          '<div class="mini-card"><strong>🎭 Hidden agendas</strong><p>Every player can want a different final board.</p></div>'+
          '<div class="mini-card"><strong>📡 Public signals</strong><p>Signals reveal together, so nobody can wait and copy.</p></div>'+
          '<div class="mini-card"><strong>⚡ Five rounds</strong><p>Fast to learn, replayable because motives and maps keep shifting.</p></div>'+
        '</div>'+
      '</section>'+
      '<section class="card join-panel" id="join-panel">'+
        '<div class="field"><label for="name">Your name</label><input id="name" maxlength="18" autocomplete="nickname" placeholder="e.g. Alex"></div>'+
        '<div class="field"><label for="room">Room code</label><input id="room" class="code-input" maxlength="6" placeholder="ABC123" value="'+esc(prefill)+'"></div>'+
        '<button class="secondary-btn" data-action="join" '+(state.joining ? "disabled" : "")+'>'+(state.joining ? "Connecting…" : "Join room")+'</button>'+
      '</section>'+
      (state.error ? '<div class="error-box">'+esc(state.error)+'</div>' : "")+
      '<div class="notice">No account. No install. The host keeps the room alive, so keep the host tab open while you play.</div>'+
      rulesModal()+
    '</main>';
  }

  function lobbyView(ps){
    const isHost = state.mode === "host";
    const players = ps.players || [];
    const canStart = isHost && players.length >= 2;
    const roomUrl = location.origin + location.pathname + "?room=" + encodeURIComponent(ps.room);
    return '<main class="page">'+
      topbar('<span class="tag">'+(isHost ? "Host" : "Joined")+'</span>')+
      '<div class="room-head"><div><div class="room-kicker">Room code</div><div class="room-code">'+esc(ps.room)+'</div></div><button class="ghost-btn" data-action="leave">Leave</button></div>'+
      '<section class="lobby-grid">'+
        '<div class="card">'+
          '<h2>'+players.length+' player'+(players.length === 1 ? "" : "s")+' in the room</h2>'+
          '<div class="player-list">'+players.map(p =>
            '<div class="player-row"><div class="player-id"><div class="avatar">'+esc(p.name.charAt(0).toUpperCase())+'</div><div class="player-name">'+esc(p.name)+'</div></div>'+
            (p.isHost ? '<span class="tag">host</span>' : (!p.connected ? '<span class="tag" style="color:#ffd36e;background:rgba(255,211,110,.1)">offline</span>' : ""))+
            '</div>'
          ).join("")+'</div>'+
          '<div class="copy-row"><button class="secondary-btn" data-action="copy-code">Copy code</button><button class="secondary-btn" data-action="copy-link" data-link="'+esc(roomUrl)+'">Copy invite link</button></div>'+
          (isHost
            ? '<div style="margin-top:20px"><button class="primary-btn" data-action="start" '+(canStart ? "" : "disabled")+'>'+(canStart ? "Start game" : "Waiting for 1 more player")+'</button></div>'
            : '<p class="notice">The host will start when everyone is in.</p>')+
        '</div>'+
        '<div class="card"><h3>The rules in 20 seconds</h3><div class="explain-list">'+
          '<div class="explain-item"><div class="explain-num">1</div><div><b>Read your secret motive</b><span>Only your screen shows what you need this round.</span></div></div>'+
          '<div class="explain-item"><div class="explain-num">2</div><div><b>Send a PULL or PUSH signal</b><span>Signals reveal simultaneously. Bluffing is legal.</span></div></div>'+
          '<div class="explain-item"><div class="explain-num">3</div><div><b>Choose your real zone</b><span>Moves stay secret until everybody locks in.</span></div></div>'+
          '<div class="explain-item"><div class="explain-num">4</div><div><b>Complete your motive</b><span>3 points for success. +1 if you succeeded while misdirecting the room.</span></div></div>'+
        '</div></div>'+
      '</section>'+
      (state.error ? '<div class="error-box">'+esc(state.error)+'</div>' : "")+
      rulesModal()+
    '</main>';
  }

  function signalText(sig,map){
    if(!sig) return "";
    const z = map.zones[sig.zone];
    return '<span class="signal-msg '+sig.kind.toLowerCase()+'">'+(sig.kind === "PULL" ? "PULL → " : "PUSH → ")+esc(z[0]+" "+z[1])+'</span>';
  }

  function phaseView(ps){
    const g = ps.game;
    const me = ps.you || {};
    const map = g.map;
    const round = g.round + 1;
    const progress = Math.round((g.round / TOTAL_ROUNDS) * 100);
    const inBrief = g.phase === "brief";
    const done = inBrief ? g.status.signaled : g.status.moved;
    const total = ps.players.length;
    const motive = me.motive;

    let body = "";
    if(inBrief){
      body += '<div class="motive-card"><span class="motive-label">Your secret motive</span><strong>'+esc(motive.title)+'</strong><p>'+esc(motive.text)+'</p></div>'+
        '<p class="map-sub"><b>Now send one public signal.</b> PULL means “come here.” PUSH means “stay away.” Your signal can be honest or bait.</p>'+
        '<div class="zone-grid">'+map.zones.map((z,i) =>
          '<div class="zone-card"><div class="zone-head"><span class="zone-icon">'+esc(z[0])+'</span><span class="zone-name">'+esc(z[1])+'</span><span class="zone-letter">'+String.fromCharCode(65+i)+'</span></div>'+
          '<div class="signal-actions">'+
            '<button class="signal-btn pull '+(me.signal && me.signal.zone === i && me.signal.kind === "PULL" ? "selected" : "")+'" data-action="signal" data-kind="PULL" data-zone="'+i+'" '+(me.signal ? "disabled" : "")+'>PULL here</button>'+
            '<button class="signal-btn push '+(me.signal && me.signal.zone === i && me.signal.kind === "PUSH" ? "selected" : "")+'" data-action="signal" data-kind="PUSH" data-zone="'+i+'" '+(me.signal ? "disabled" : "")+'>PUSH away</button>'+
          '</div></div>'
        ).join("")+'</div>';
    }else{
      body += '<div class="motive-card"><span class="motive-label">Your secret motive</span><strong>'+esc(motive.title)+'</strong><p>'+esc(motive.text)+'</p></div>'+
        '<p class="map-sub"><b>Signals are public. Moves are not.</b> Study the room, then secretly choose where you actually go.</p>'+
        '<div class="signal-board">'+g.signals.map(s =>
          '<div class="signal-row"><div><b>'+esc(s.name)+'</b></div><div>'+signalText(s.signal,map)+'</div></div>'
        ).join("")+'</div>'+
        '<div class="zone-grid">'+map.zones.map((z,i) =>
          '<button class="choice-btn '+(me.move === i ? "selected" : "")+'" data-action="move" data-zone="'+i+'" '+(me.move != null ? "disabled" : "")+'>'+
            '<span class="choice-letter">'+String.fromCharCode(65+i)+'</span><span><b>'+esc(z[0]+" "+z[1])+'</b></span>'+
          '</button>'
        ).join("")+'</div>';
    }

    return '<main class="page"><div class="game-wrap">'+
      topbar('<span class="tag">'+esc(ps.room)+'</span>')+
      '<div class="progress-row"><span>Round '+round+' of '+TOTAL_ROUNDS+'</span><span>'+(inBrief ? "SIGNAL" : "SHIFT")+'</span></div>'+
      '<div class="progress-track"><div class="progress-fill" style="width:'+progress+'%"></div></div>'+
      '<section class="card phase-card">'+
        '<span class="phase-badge">'+(inBrief ? "Step 1 • Secret motive + signal" : "Step 2 • Make your real move")+'</span>'+
        '<h2 class="map-title">'+esc(map.title)+'</h2><p class="map-sub">'+esc(map.subtitle)+'</p>'+
        body+
      '</section>'+
      '<section class="card status-card"><div><b>'+((inBrief ? me.signal : me.move != null) ? "Locked in." : "Your move.")+'</b><div class="status-text">'+done+' of '+total+' players finished this step</div></div><div class="dots">'+Array.from({length:total},(_,i) => '<span class="dot '+(i < done ? "done" : "")+'"></span>').join("")+'</div></section>'+
      (state.error ? '<div class="error-box">'+esc(state.error)+'</div>' : "")+
      rulesModal()+
    '</div></main>';
  }

  function revealView(ps){
    const g = ps.game;
    const r = g.results;
    const map = g.map;
    const meResult = r.players.find(x => x.id === state.meId);
    const scored = meResult ? meResult.points : 0;
    const success = meResult ? meResult.success : false;

    return '<main class="page"><div class="game-wrap">'+
      topbar('<span class="tag">'+esc(ps.room)+'</span>')+
      '<div class="reveal-title">'+(success ? "Motive complete." : "Your plan got scrambled.")+'</div>'+
      '<p class="reveal-sub">'+(success ? ("+"+scored+" point"+(scored === 1 ? "" : "s")+(meResult.bonus ? " • Misdirect bonus" : "")) : "No points this round. The board had other ideas.")+'</p>'+
      '<section class="card">'+
        '<span class="phase-badge">Round '+(g.round+1)+' reveal</span><h2 class="map-title">'+esc(map.title)+'</h2>'+
        '<div class="board">'+map.zones.map((z,i) => {
          const occupants = r.players.filter(p => p.move === i);
          return '<div class="board-zone"><div class="zone-head"><span class="zone-icon">'+esc(z[0])+'</span><span class="zone-name">'+esc(z[1])+'</span><span class="zone-letter">'+occupants.length+'</span></div>'+
            '<div class="occupants">'+(occupants.length ? occupants.map(p => '<span class="person-chip"><span class="person-dot"></span>'+esc(p.name)+'</span>').join("") : '<span class="small">Nobody came here.</span>')+'</div></div>';
        }).join("")+'</div>'+
        '<div class="result-list">'+r.players.map(p =>
          '<div class="result-row '+(p.success ? "success" : "")+'">'+
            '<div><b>'+esc(p.name)+'</b><div class="small">'+signalText(p.signal,map)+'</div></div>'+
            '<div class="result-motive"><b>'+esc(p.motiveTitle)+'</b> — '+esc(p.motiveText)+'</div>'+
            '<div class="result-points">'+(p.success ? ("+"+p.points) : "0")+'</div>'+
          '</div>'
        ).join("")+'</div>'+
        '<div class="score-pop">'+
          '<div class="score-tile"><strong>+'+scored+'</strong><span>Your points</span></div>'+
          '<div class="score-tile"><strong>'+r.successCount+'/'+ps.players.length+'</strong><span>Motives completed</span></div>'+
          '<div class="score-tile"><strong>'+r.scatter+'%</strong><span>Room scatter</span></div>'+
        '</div>'+
      '</section>'+
      leaderboard(ps)+
      '<div class="actions-center">'+(state.mode === "host" ? '<button class="primary-btn" data-action="next">'+(g.round + 1 >= TOTAL_ROUNDS ? "See final results" : "Next round")+'</button>' : '<span class="small">Waiting for the host to continue…</span>')+'</div>'+
      rulesModal()+
    '</div></main>';
  }

  function leaderboard(ps){
    const sorted = [...ps.players].sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));
    return '<section class="card" style="margin-top:15px"><h3>Leaderboard</h3><div class="leaderboard">'+sorted.map((p,i) =>
      '<div class="leader-row '+(p.id === state.meId ? "me-row" : "")+'"><div class="rank">'+(i+1)+'</div><div><b>'+esc(p.name)+'</b>'+(p.id === state.meId ? ' <span class="small">(you)</span>' : "")+'</div><div class="score">'+p.score+'</div></div>'
    ).join("")+'</div></section>';
  }

  function finalView(ps){
    const sorted = [...ps.players].sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));
    const top = sorted[0] ? sorted[0].score : 0;
    const winners = sorted.filter(p => p.score === top);
    const meRank = sorted.findIndex(p => p.id === state.meId) + 1;
    const me = sorted.find(p => p.id === state.meId) || {score:0};
    const master = [...ps.players].sort((a,b) => b.misdirects - a.misdirects || b.score - a.score)[0];
    return '<main class="page"><div class="game-wrap">'+
      topbar('<span class="tag">Final</span>')+
      '<section class="card final-hero">'+
        '<div class="trophy">🎭</div>'+
        '<h1>'+(winners.length > 1 ? "Nobody owned the room alone." : esc(winners[0].name)+" played everybody best.")+'</h1>'+
        '<p class="lead" style="margin:0 auto">'+(winners.length > 1 ? esc(winners.map(p => p.name).join(" and "))+" tied with "+top+" points." : esc(winners[0].name)+" finished with "+top+" points.")+'</p>'+
        '<div class="stat-ribbon">'+
          '<div class="stat-box"><strong>#'+meRank+'</strong><span>Your finish</span></div>'+
          '<div class="stat-box"><strong>'+me.score+'</strong><span>Your points</span></div>'+
          '<div class="stat-box"><strong>'+ps.game.avgScatter+'%</strong><span>Average room scatter</span></div>'+
        '</div>'+
        '<p class="small">Master of Misdirection: <b>'+esc(master ? master.name : "—")+'</b> • '+(master ? master.misdirects : 0)+' successful bluff'+(master && master.misdirects === 1 ? "" : "s")+'</p>'+
      '</section>'+
      leaderboard(ps)+
      '<div class="actions-center">'+(state.mode === "host" ? '<button class="primary-btn" data-action="rematch">Play again</button>' : "")+'<button class="secondary-btn" data-action="leave">Leave room</button></div>'+
      rulesModal()+
    '</div></main>';
  }

  function render(){
    let html;
    if(state.mode === "home" || !state.publicState) html = homeView();
    else if(state.publicState.game && state.publicState.game.phase === "final") html = finalView(state.publicState);
    else if(state.publicState.game && state.publicState.game.phase === "reveal") html = revealView(state.publicState);
    else if(state.publicState.game && (state.publicState.game.phase === "brief" || state.publicState.game.phase === "shift")) html = phaseView(state.publicState);
    else html = lobbyView(state.publicState);
    $app.innerHTML = html;
  }

  function resetNetwork(){
    try{ if(state.hostConn) state.hostConn.close(); }catch(_){}
    for(const c of state.conns.values()) try{ c.close(); }catch(_){}
    try{ if(state.peer) state.peer.destroy(); }catch(_){}
    state.peer = null;
    state.hostConn = null;
    state.conns = new Map();
    state.hostGame = null;
    state.publicState = null;
    state.meId = null;
  }

  function createHost(){
    if(typeof Peer === "undefined") return setError("The multiplayer library did not load. Check your internet connection, refresh, and try again.");
    const typedName = (document.getElementById("name") && document.getElementById("name").value || "Host").trim().slice(0,18) || "Host";
    resetNetwork();
    state.mode = "host";
    state.name = typedName;
    state.room = makeRoomCode();
    state.joining = true;
    state.error = "";
    render();
    startHostPeer(0);
  }

  function startHostPeer(attempt){
    if(attempt > 4){
      state.mode = "home";
      state.joining = false;
      return setError("Could not create a room. Check your connection and try again.");
    }
    const peer = new Peer(PEER_PREFIX + state.room.toLowerCase(),{debug:0});
    state.peer = peer;
    peer.on("open",() => {
      state.joining = false;
      state.meId = "p-host";
      state.hostGame = {
        room:state.room,
        phase:"lobby",
        round:-1,
        mapDeck:shuffledMapDeck(),
        players:[{id:"p-host",token:state.token,name:state.name,score:0,misdirects:0,isHost:true,connected:true}],
        signals:{},
        moves:{},
        motives:{},
        history:[]
      };
      peer.on("connection",onIncomingConnection);
      syncAll();
    });
    peer.on("error",err => {
      if(err && err.type === "unavailable-id"){
        try{ peer.destroy(); }catch(_){}
        state.room = makeRoomCode();
        startHostPeer(attempt + 1);
      }else{
        state.mode = "home";
        state.joining = false;
        state.peer = null;
        setError("Could not start multiplayer. Check your internet connection and try again.");
      }
    });
  }

  function shuffledMapDeck(){
    const arr = MAPS.map((_,i) => i);
    for(let i = arr.length - 1; i > 0; i--){
      const j = randomInt(i + 1);
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr.slice(0,TOTAL_ROUNDS);
  }

  function onIncomingConnection(conn){
    const tempKey = conn.peer + ":" + Date.now();
    state.conns.set(tempKey,conn);
    conn.on("data",msg => handleHostMessage(conn,msg,tempKey));
    conn.on("close",() => handleDisconnect(conn));
    conn.on("error",() => handleDisconnect(conn));
  }

  function handleHostMessage(conn,msg,tempKey){
    if(!msg || typeof msg !== "object" || !state.hostGame) return;
    if(msg.type === "join"){
      const cleanName = String(msg.name || "").trim().slice(0,18);
      const token = String(msg.token || "");
      if(!cleanName){ conn.send({type:"join-error",message:"Enter a name to join."}); return; }

      let p = state.hostGame.players.find(x => x.token === token);
      if(p){
        p.name = cleanName;
        p.connected = true;
      }else{
        if(state.hostGame.phase !== "lobby"){ conn.send({type:"join-error",message:"This game has already started."}); return; }
        if(state.hostGame.players.length >= MAX_PLAYERS){ conn.send({type:"join-error",message:"This room is full."}); return; }
        p = {id:"p-"+randomString(8),token,name:cleanName,score:0,misdirects:0,isHost:false,connected:true};
        state.hostGame.players.push(p);
      }

      conn.__playerId = p.id;
      state.conns.delete(tempKey);
      const old = state.conns.get(p.id);
      if(old && old !== conn) try{ old.close(); }catch(_){}
      state.conns.set(p.id,conn);
      conn.send({type:"joined",playerId:p.id});
      syncAll();
      return;
    }

    const p = state.hostGame.players.find(x => x.id === conn.__playerId);
    if(!p) return;
    if(msg.type === "signal") receiveSignal(p.id,msg.kind,Number(msg.zone));
    if(msg.type === "move") receiveMove(p.id,Number(msg.zone));
  }

  function handleDisconnect(conn){
    if(!state.hostGame || !conn.__playerId) return;
    const p = state.hostGame.players.find(x => x.id === conn.__playerId);
    if(p) p.connected = false;
    syncAll();
  }

  function joinRoom(){
    if(typeof Peer === "undefined") return setError("The multiplayer library did not load. Check your internet connection, refresh, and try again.");
    const name = (document.getElementById("name") && document.getElementById("name").value || "").trim().slice(0,18);
    const room = formatRoom(document.getElementById("room") && document.getElementById("room").value || "");
    if(!name) return setError("Enter your name first.");
    if(room.length !== 6) return setError("Enter the 6-character room code.");

    resetNetwork();
    state.mode = "guest";
    state.name = name;
    state.room = room;
    state.error = "";
    state.joining = true;
    render();

    const peer = new Peer(undefined,{debug:0});
    state.peer = peer;
    peer.on("open",() => {
      const conn = peer.connect(PEER_PREFIX + room.toLowerCase(),{reliable:true,serialization:"json"});
      state.hostConn = conn;
      const timeout = setTimeout(() => {
        if(state.joining){
          state.mode = "home";
          state.joining = false;
          resetNetwork();
          setError("Room not found. Double-check the code and try again.");
        }
      },7500);

      conn.on("open",() => conn.send({type:"join",name:state.name,token:state.token}));
      conn.on("data",msg => {
        if(msg.type === "joined"){
          clearTimeout(timeout);
          state.joining = false;
          state.meId = msg.playerId;
        }else if(msg.type === "join-error"){
          clearTimeout(timeout);
          state.mode = "home";
          state.joining = false;
          resetNetwork();
          setError(msg.message || "Could not join.");
        }else if(msg.type === "state"){
          state.publicState = msg.state;
          render();
        }
      });
      conn.on("close",() => {
        if(state.mode === "guest"){
          state.mode = "home";
          state.joining = false;
          state.publicState = null;
          setError("The host disconnected. The room has ended.");
        }
      });
      conn.on("error",() => {
        if(state.mode === "guest"){
          state.mode = "home";
          state.joining = false;
          state.publicState = null;
          setError("Lost connection to the room.");
        }
      });
    });
    peer.on("error",() => {
      if(state.mode === "guest"){
        state.mode = "home";
        state.joining = false;
        state.publicState = null;
        setError("Could not connect. Check your internet connection and try again.");
      }
    });
  }

  function startGame(){
    const g = state.hostGame;
    if(!g || g.phase !== "lobby" || g.players.length < 2) return;
    g.round = 0;
    beginRound();
  }

  function beginRound(){
    const g = state.hostGame;
    g.phase = "brief";
    g.signals = {};
    g.moves = {};
    g.motives = {};
    for(const p of g.players) g.motives[p.id] = makeMotive(p,g.players);
    syncAll();
  }

  function makeMotive(player,players){
    const n = players.length;
    const others = players.filter(p => p.id !== player.id);
    const target = others[randomInt(others.length)];
    let pool;
    if(n === 2) pool = ["duo","solo","shadow","escape"];
    else if(n === 3) pool = ["crowd","solo","duo","shadow","escape","trio"];
    else pool = ["crowd","solo","duo","shadow","escape","small","trio"];
    const type = pool[randomInt(pool.length)];
    if(type === "crowd") return {type,title:"JOIN THE CROWD",text:"Finish in a largest group. A lone player never counts as a crowd."};
    if(type === "solo") return {type,title:"FLY SOLO",text:"Be the only player in your final zone."};
    if(type === "duo") return {type,title:"FIND A PARTNER",text:"Finish in a zone with exactly one other player."};
    if(type === "shadow") return {type,targetId:target.id,title:"SHADOW "+target.name.toUpperCase(),text:"Finish in the same zone as "+target.name+"."};
    if(type === "escape") return {type,targetId:target.id,title:"DODGE "+target.name.toUpperCase(),text:"Finish in a different zone from "+target.name+"."};
    if(type === "small") return {type,title:"SMALL CIRCLE",text:"Finish in the smallest occupied group of at least two players."};
    return {type:"trio",title:"MAKE IT THREE",text:"Finish in a zone containing exactly three players, including you."};
  }

  function receiveSignal(playerId,kind,zone){
    const g = state.hostGame;
    if(!g || g.phase !== "brief" || g.signals[playerId] || !["PULL","PUSH"].includes(kind) || !Number.isInteger(zone) || zone < 0 || zone > 3) return;
    g.signals[playerId] = {kind,zone};
    if(Object.keys(g.signals).length >= g.players.length) g.phase = "shift";
    syncAll();
  }

  function receiveMove(playerId,zone){
    const g = state.hostGame;
    if(!g || g.phase !== "shift" || g.moves[playerId] != null || !Number.isInteger(zone) || zone < 0 || zone > 3) return;
    g.moves[playerId] = zone;
    if(Object.keys(g.moves).length >= g.players.length) resolveRound();
    syncAll();
  }

  function motiveSuccess(motive,playerId,counts,moves){
    const zone = moves[playerId];
    const size = counts[zone];
    if(motive.type === "solo") return size === 1;
    if(motive.type === "duo") return size === 2;
    if(motive.type === "trio") return size === 3;
    if(motive.type === "shadow") return zone === moves[motive.targetId];
    if(motive.type === "escape") return zone !== moves[motive.targetId];
    if(motive.type === "crowd"){
      const max = Math.max.apply(null,counts);
      return size >= 2 && size === max;
    }
    if(motive.type === "small"){
      const grouped = counts.filter(c => c >= 2);
      if(!grouped.length || size < 2) return false;
      return size === Math.min.apply(null,grouped);
    }
    return false;
  }

  function isMisdirect(signal,move){
    if(!signal) return false;
    return signal.kind === "PULL" ? move !== signal.zone : move === signal.zone;
  }

  function resolveRound(){
    const g = state.hostGame;
    const counts = [0,0,0,0];
    Object.values(g.moves).forEach(z => counts[z]++);
    let successCount = 0;
    const roundPlayers = [];

    for(const p of g.players){
      const motive = g.motives[p.id];
      const success = motiveSuccess(motive,p.id,counts,g.moves);
      const bonus = success && isMisdirect(g.signals[p.id],g.moves[p.id]);
      const points = success ? (bonus ? 4 : 3) : 0;
      if(success) successCount++;
      if(bonus) p.misdirects++;
      p.score += points;
      roundPlayers.push({
        id:p.id,name:p.name,move:g.moves[p.id],signal:g.signals[p.id],
        motiveTitle:motive.title,motiveText:motive.text,success,bonus,points
      });
    }

    const occupied = counts.filter(c => c > 0).length;
    const scatter = Math.round((occupied / Math.min(4,g.players.length)) * 100);
    g.history.push({counts,scatter,successCount,players:roundPlayers});
    g.phase = "reveal";
  }

  function nextRound(){
    const g = state.hostGame;
    if(!g || g.phase !== "reveal") return;
    if(g.round + 1 >= TOTAL_ROUNDS){
      g.phase = "final";
    }else{
      g.round++;
      beginRound();
      return;
    }
    syncAll();
  }

  function rematch(){
    const g = state.hostGame;
    if(!g) return;
    g.phase = "lobby";
    g.round = -1;
    g.mapDeck = shuffledMapDeck();
    g.signals = {};
    g.moves = {};
    g.motives = {};
    g.history = [];
    g.players.forEach(p => { p.score = 0; p.misdirects = 0; });
    syncAll();
  }

  function publicStateFor(playerId){
    const g = state.hostGame;
    const p = g.players.find(x => x.id === playerId);
    const ps = {
      room:g.room,
      players:g.players.map(x => ({id:x.id,name:x.name,score:x.score,misdirects:x.misdirects,isHost:x.isHost,connected:x.connected})),
      game:{phase:g.phase,round:g.round}
    };

    if(g.round >= 0 && g.round < TOTAL_ROUNDS){
      ps.game.map = MAPS[g.mapDeck[g.round]];
    }

    if(g.phase === "brief" || g.phase === "shift"){
      ps.game.status = {signaled:Object.keys(g.signals).length,moved:Object.keys(g.moves).length};
      ps.you = {
        motive:g.motives[playerId],
        signal:g.signals[playerId] || null,
        move:g.moves[playerId] == null ? null : g.moves[playerId]
      };
      if(g.phase === "shift"){
        ps.game.signals = g.players.map(x => ({id:x.id,name:x.name,signal:g.signals[x.id]}));
      }
    }

    if(g.phase === "reveal"){
      const h = g.history[g.history.length - 1];
      ps.game.results = h;
      ps.you = {motive:g.motives[playerId],signal:g.signals[playerId],move:g.moves[playerId]};
    }

    if(g.phase === "final"){
      ps.game.avgScatter = g.history.length ? Math.round(g.history.reduce((s,h) => s + h.scatter,0) / g.history.length) : 0;
      ps.you = {score:p ? p.score : 0,misdirects:p ? p.misdirects : 0};
    }
    return ps;
  }

  function syncAll(){
    if(!state.hostGame) return;
    state.publicState = publicStateFor(state.meId);
    for(const [pid,conn] of state.conns){
      if(!String(pid).startsWith("p-") || pid === "p-host") continue;
      if(conn && conn.open){
        try{ conn.send({type:"state",state:publicStateFor(pid)}); }catch(_){}
      }
    }
    render();
  }

  function chooseSignal(kind,zone){
    if(state.mode === "host") receiveSignal(state.meId,kind,zone);
    else if(state.hostConn && state.hostConn.open) state.hostConn.send({type:"signal",kind,zone});
  }

  function chooseMove(zone){
    if(state.mode === "host") receiveMove(state.meId,zone);
    else if(state.hostConn && state.hostConn.open) state.hostConn.send({type:"move",zone});
  }

  function leave(){
    resetNetwork();
    state.mode = "home";
    state.error = "";
    state.room = "";
    state.joining = false;
    history.replaceState({},"",location.pathname);
    render();
  }

  document.addEventListener("click",async e => {
    const el = e.target.closest("[data-action]");
    if(!el) return;
    const a = el.dataset.action;
    if(a === "rules"){ state.modal = true; render(); }
    else if(a === "close-rules"){ state.modal = false; render(); }
    else if(a === "focus-join") document.getElementById("join-panel") && document.getElementById("join-panel").scrollIntoView({behavior:"smooth",block:"center"});
    else if(a === "host") createHost();
    else if(a === "join") joinRoom();
    else if(a === "leave") leave();
    else if(a === "copy-code") toast(await copyText(state.publicState.room) ? "Room code copied" : "Could not copy");
    else if(a === "copy-link") toast(await copyText(el.dataset.link) ? "Invite link copied" : "Could not copy");
    else if(a === "start") startGame();
    else if(a === "signal"){ chooseSignal(el.dataset.kind,Number(el.dataset.zone)); playTone(false); }
    else if(a === "move"){ chooseMove(Number(el.dataset.zone)); playTone(false); }
    else if(a === "next"){ nextRound(); playTone(true); }
    else if(a === "rematch") rematch();
  });

  document.addEventListener("input",e => {
    if(e.target && e.target.id === "room") e.target.value = formatRoom(e.target.value);
  });

  document.addEventListener("keydown",e => {
    if(e.key === "Enter" && state.mode === "home"){
      const active = document.activeElement;
      if(active && (active.id === "room" || active.id === "name")) joinRoom();
    }
    if(e.key === "Escape" && state.modal){ state.modal = false; render(); }
  });

  window.addEventListener("beforeunload",resetNetwork);
  render();
})();
