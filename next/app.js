(() => {
  "use strict";

  const MAX_PLAYERS = 6;
  const MIN_PLAYERS = 3;
  const PEER_PREFIX = "that-tracks-";
  const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const PEER_OPTIONS = {
    debug:0,
    pingInterval:5000,
    config:{
      sdpSemantics:"unified-plan",
      iceServers:[
        {urls:"stun:stun.l.google.com:19302"},
        {urls:"stun:stun1.l.google.com:19302"},
        {urls:"stun:openrelay.metered.ca:80"},
        {urls:"turn:openrelay.metered.ca:80",username:"openrelayproject",credential:"openrelayproject"},
        {urls:"turn:openrelay.metered.ca:443",username:"openrelayproject",credential:"openrelayproject"},
        {urls:"turn:openrelay.metered.ca:443?transport=tcp",username:"openrelayproject",credential:"openrelayproject"}
      ]
    }
  };

  const PROMPTS = [
    "What tiny inconvenience annoys you way more than it should?",
    "If you had an unexpected $500 to spend today, what would you buy?",
    "What snack has no business being as good as it is?",
    "What job would you be hilariously bad at?",
    "What is your most defensible bad habit?",
    "If you had to teach a class tomorrow, what could you fake your way through?",
    "What is the most useless thing you are weirdly good at?",
    "What would you name a pet dragon?",
    "What is your ideal excuse for cancelling plans?",
    "What is one thing you would absolutely overpay for?",
    "What app would be hardest for you to delete for a month?",
    "If you could instantly master one ordinary skill, what would it be?",
    "What is the first thing you would do with an unexpected day off?",
    "What food opinion could get you kicked out of a group chat?",
    "What harmless rule do you secretly hate following?",
    "What would your terrible superhero name be?",
    "What is your most irrational everyday fear?",
    "If you had to open a ridiculous store, what would it sell?",
    "What is something you pretend not to care about but absolutely do?",
    "What is the dumbest luxury you would love to own?"
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

  let hostTicker = null;
  const $app = document.getElementById("app");
  const $toast = document.getElementById("toast");

  function getToken(){
    let t=localStorage.getItem("that-tracks-token");
    if(!t){
      t=randomString(18);
      localStorage.setItem("that-tracks-token",t);
    }
    return t;
  }
  function randomString(len=8){
    const bytes=new Uint8Array(len);
    crypto.getRandomValues(bytes);
    return Array.from(bytes,b=>(b%36).toString(36)).join("").slice(0,len);
  }
  function randomInt(max){
    if(max<=1) return 0;
    const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%max;
  }
  function shuffle(arr){
    const out=[...arr];
    for(let i=out.length-1;i>0;i--){const j=randomInt(i+1);[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }
  function roomCode(){
    const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);
    return Array.from(bytes,b=>ROOM_CHARS[b%ROOM_CHARS.length]).join("");
  }
  function esc(v=""){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
  function formatRoom(v=""){return v.toUpperCase().replace(/[^A-Z2-9]/g,"").slice(0,6);}
  function setError(msg=""){state.error=msg;render();}
  function toast(msg){$toast.textContent=msg;$toast.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>$toast.classList.remove("show"),1600);}
  async function copyText(v){
    try{await navigator.clipboard.writeText(v);return true;}
    catch(_){
      try{const t=document.createElement("textarea");t.value=v;t.style.position="fixed";t.style.opacity="0";document.body.appendChild(t);t.select();const ok=document.execCommand("copy");t.remove();return ok;}catch(__){return false;}
    }
  }

  function logo(extra=""){
    return '<div class="top"><div class="logo"><div class="logo-mark">TT</div><div class="logo-copy"><b>THAT TRACKS</b><span>Know the person • fake the answer</span></div></div>'+
      '<div class="actions" style="margin:0">'+extra+'<button class="ghost" data-action="rules">How to play</button></div></div>';
  }

  function rules(){
    if(!state.modal) return "";
    return '<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h2>How THAT TRACKS works</h2><button class="icon" data-action="close-rules" aria-label="Close">✕</button></div>'+
      '<ol><li>Each round puts one player in the <b>Spotlight</b>.</li><li>The Spotlight answers one playful prompt <b>honestly</b>.</li><li>Everyone else writes a fake answer that sounds like something the Spotlight might say.</li><li>The answers are shuffled. Everyone except the Spotlight guesses the real one.</li><li>Find the real answer: <b>+2</b>. Fool someone with your decoy: <b>+1 per fooled player</b>.</li></ol>'+
      '<p>No timer. No trivia. The funny part comes from the people in the room.</p></div></div>';
  }

  function home(){
    const prefill=new URLSearchParams(location.search).get("room")||"";
    return '<main class="shell">'+logo()+
      '<section class="hero"><div class="card hero-main"><span class="kicker">3–6 PLAYERS • NO TIMER</span><h1>THAT<br><span>TRACKS.</span></h1><p class="lead">One person tells the truth. Everyone else writes a believable fake. Can your friends tell what actually sounds like you?</p>'+
      '<div class="actions"><button class="primary" data-action="host" '+(state.joining?"disabled":"")+'>'+(state.joining?"Creating…":"Create a room")+'</button><button class="secondary" data-action="focus-join">Join a room</button></div></div>'+
      '<div class="side"><div class="note"><b>1. One person answers honestly.</b><p>The Spotlight gets a playful prompt and writes the real answer.</p></div><div class="note"><b>2. Everyone else impersonates them.</b><p>Write a decoy that sounds plausible enough to fool the room.</p></div><div class="note"><b>3. Pick the real one.</b><p>Correct guesses score. Convincing decoys score too.</p></div></div></section>'+
      '<section id="joinbox" class="card joinbox"><div class="field"><label for="name">Your name</label><input id="name" maxlength="18" autocomplete="nickname" placeholder="e.g. Alex"></div><div class="field"><label for="room">Room code</label><input id="room" class="code" maxlength="6" placeholder="ABC123" value="'+esc(prefill)+'"></div><button class="secondary" data-action="join" '+(state.joining?"disabled":"")+'>'+(state.joining?"Connecting…":"Join room")+'</button></section>'+
      (state.error?'<div class="error">'+esc(state.error)+'</div>':"")+
      rules()+'</main>';
  }

  function scoreRow(ps){
    return '<div class="score-row">'+ps.players.map(p=>'<span class="score-chip '+(p.id===state.meId?"me":"")+'">'+esc(p.name)+' • '+p.score+'</span>').join("")+'</div>';
  }

  function lobby(ps){
    const isHost=state.mode==="host";
    const url=location.origin+location.pathname+"?room="+encodeURIComponent(ps.room);
    return '<main class="shell">'+logo('<span class="pill" style="padding:7px 9px;background:#fff">'+esc(ps.room)+'</span>')+
      '<div class="room-head"><div><div class="small">ROOM CODE</div><div class="room-code">'+esc(ps.room)+'</div></div><button class="ghost" data-action="leave">Leave</button></div>'+
      '<section class="card"><h2 style="margin-top:0">'+ps.players.length+' player'+(ps.players.length===1?"":"s")+' in the room</h2><div class="players">'+ps.players.map((p,i)=>'<div class="player"><div class="player-id"><div class="avatar" style="background:'+["#e6533f","#3b78c8","#4e986a","#efbd3d","#8b67b7","#d0789b"][i%6]+'">'+esc(p.name.charAt(0).toUpperCase())+'</div><div class="player-name">'+esc(p.name)+'</div></div><span class="tag">'+(p.isHost?"host":p.connected?"ready":"offline")+'</span></div>').join("")+'</div>'+
      '<div class="actions"><button class="secondary" data-action="copy-code">Copy code</button><button class="secondary" data-action="copy-link" data-link="'+esc(url)+'">Copy invite link</button></div>'+
      (isHost?'<div class="actions"><button class="primary" data-action="start" '+(ps.players.length>=MIN_PLAYERS?"":"disabled")+'>'+(ps.players.length>=MIN_PLAYERS?"Start game":"Need "+MIN_PLAYERS+" players")+'</button></div>':'<p class="small" style="margin-top:18px">The host starts when everyone is here.</p>')+
      '</section>'+rules()+'</main>';
  }

  function gameHeader(ps){
    return '<div class="game-top"><div><div class="round">ROUND '+(ps.game.round+1)+' OF '+ps.game.totalRounds+'</div><b>'+esc(ps.game.spotlightName)+' is in the Spotlight</b></div>'+scoreRow(ps)+'</div>';
  }

  function submitView(ps){
    const g=ps.game, me=ps.you||{}, spotlight=state.meId===g.spotlightId;
    const submitted=!!me.submitted;
    return '<main class="shell">'+logo('<span class="tag">'+esc(ps.room)+'</span>')+gameHeader(ps)+
      '<section class="spotlight"><div class="who">'+(spotlight?"YOU ARE IN THE SPOTLIGHT":esc(g.spotlightName)+" IS IN THE SPOTLIGHT")+'</div><h2>'+esc(g.prompt)+'</h2>'+
      '<p>'+(spotlight?"Answer as yourself. Everyone else is trying to imitate you.":"Write an answer that sounds believable coming from "+esc(g.spotlightName)+".")+'</p></section>'+
      (!submitted?
        '<section class="card prompt-card"><div class="role-box '+(spotlight?"truth":"decoy")+'"><b>'+(spotlight?"YOUR JOB: TELL THE TRUTH":"YOUR JOB: WRITE A DECOY")+'</b><br>'+(spotlight?"Keep it real. Short answers work best.":"Make it plausible, specific, or funny—but try to sound like the Spotlight.")+'</div><div class="field" style="margin-top:12px"><label for="answer">Your answer</label><textarea id="answer" maxlength="90" placeholder="'+(spotlight?"Type your real answer…":"Type a convincing fake…")+'"></textarea></div><div class="submit-row"><button class="primary" data-action="submit-answer">Lock answer</button></div></section>'
        :
        '<div class="waiting"><b>Answer locked.</b><p class="small">Waiting for the rest of the room. There is no timer.</p><div class="progress-dots">'+Array.from({length:ps.players.length},(_,i)=>'<span class="dot '+(i<g.submittedCount?"done":"")+'"></span>').join("")+'</div></div>'
      )+rules()+'</main>';
  }

  function voteView(ps){
    const g=ps.game, me=ps.you||{}, spotlight=state.meId===g.spotlightId;
    if(spotlight){
      return '<main class="shell">'+logo('<span class="tag">'+esc(ps.room)+'</span>')+gameHeader(ps)+
        '<section class="spotlight"><div class="who">YOU KNOW THE ANSWER</div><h2>Watch them try to figure you out.</h2><p>Your real answer is hidden among the decoys. Sit back and enjoy the accusations.</p></section>'+
        '<div class="waiting"><b>'+g.votedCount+' of '+g.votersNeeded+' guesses locked</b><p class="small">The reveal starts automatically when everyone else has guessed.</p></div>'+rules()+'</main>';
    }
    return '<main class="shell">'+logo('<span class="tag">'+esc(ps.room)+'</span>')+gameHeader(ps)+
      '<section class="spotlight"><div class="who">WHICH ONE IS REAL?</div><h2>'+esc(g.prompt)+'</h2><p>Tap the answer you think '+esc(g.spotlightName)+' actually wrote.</p></section>'+
      '<div class="choice-list">'+g.options.map((o,i)=>'<button class="choice '+(me.vote===i?"selected":"")+' '+(o.own?"own":"")+'" data-action="vote" data-choice="'+i+'" '+(me.vote!=null||o.own?"disabled":"")+'><b>'+String.fromCharCode(65+i)+'.</b> '+esc(o.text)+(o.own?'<br><span class="small">Your decoy</span>':"")+'</button>').join("")+'</div>'+
      (me.vote!=null?'<div class="waiting"><b>Guess locked.</b><p class="small">'+g.votedCount+' of '+g.votersNeeded+' guesses are in.</p></div>':"")+
      rules()+'</main>';
  }

  function revealView(ps){
    const g=ps.game, r=g.results, me=r.players.find(p=>p.id===state.meId);
    return '<main class="shell">'+logo('<span class="tag">'+esc(ps.room)+'</span>')+gameHeader(ps)+
      '<section class="spotlight"><div class="who">THE REAL ANSWER</div><h2>'+esc(g.prompt)+'</h2></section>'+
      '<div class="reveal-answer"><small>'+esc(g.spotlightName)+' actually wrote</small><strong>'+esc(r.truthText)+'</strong></div>'+
      '<div class="reveal-grid">'+r.options.map((o,i)=>'<div class="reveal-row '+(!o.isTruth&&o.votes.length?"fooled":"")+'"><div><b>'+String.fromCharCode(65+i)+'. '+esc(o.text)+'</b><small>'+(o.isTruth?'<b>REAL ANSWER</b>':'Decoy by '+esc(o.authorName))+(o.votes.length?' • picked by '+esc(o.votes.join(", ")):' • nobody picked this')+'</small></div><div class="delta '+(o.points>0?"pos":"")+'">'+(o.points?("+"+o.points):"")+'</div></div>').join("")+'</div>'+
      '<div class="reveal-grid">'+r.players.map(p=>'<div class="reveal-row"><div><b>'+esc(p.name)+'</b><small>'+esc(p.summary)+'</small></div><div class="delta '+(p.delta>0?"pos":"")+'">+'+p.delta+'</div></div>').join("")+'</div>'+
      '<div class="card ready-box"><h3 style="margin-top:0">Ready for the next person?</h3><p class="small">'+g.readyCount+' / '+ps.players.length+' ready</p>'+
      (ps.you?.ready?'<b>✓ You are ready</b>':'<button class="primary" data-action="ready">'+(g.lastRound?"See final scores":"I’m ready")+'</button>')+'</div>'+
      rules()+'</main>';
  }

  function finalView(ps){
    const sorted=[...ps.players].sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
    return '<main class="shell">'+logo('<span class="tag">FINAL</span>')+
      '<div class="final-title"><span class="kicker">GAME OVER</span><h1>'+esc(sorted[0].name)+'<br><span>TRACKS.</span></h1><p class="lead" style="margin:0 auto">'+esc(sorted[0].name)+' wins with '+sorted[0].score+' points.</p></div>'+
      '<div class="leaderboard">'+sorted.map((p,i)=>'<div class="leader '+(p.id===state.meId?"me":"")+'"><div class="rank">'+(i+1)+'</div><div><b>'+esc(p.name)+'</b>'+(p.id===state.meId?' <span class="small">(you)</span>':"")+'</div><div class="points">'+p.score+'</div></div>').join("")+'</div>'+
      '<div class="actions" style="justify-content:center;margin-top:16px">'+(state.mode==="host"?'<button class="primary" data-action="rematch">Play again</button>':"")+'<button class="secondary" data-action="leave">Leave room</button></div>'+rules()+'</main>';
  }

  function render(){
    const ps=state.publicState;
    if(state.mode==="home"||!ps){$app.innerHTML=home();return;}
    if(ps.game?.phase==="submit"){$app.innerHTML=submitView(ps);return;}
    if(ps.game?.phase==="vote"){$app.innerHTML=voteView(ps);return;}
    if(ps.game?.phase==="reveal"){$app.innerHTML=revealView(ps);return;}
    if(ps.game?.phase==="final"){$app.innerHTML=finalView(ps);return;}
    $app.innerHTML=lobby(ps);
  }

  function resetNetwork(){
    try{state.hostConn?.close();}catch(_){}
    for(const c of state.conns.values())try{c.close();}catch(_){}
    try{state.peer?.destroy();}catch(_){}
    state.peer=null;state.hostConn=null;state.conns=new Map();state.hostGame=null;state.publicState=null;state.meId=null;
    if(hostTicker){clearInterval(hostTicker);hostTicker=null;}
  }

  function createHost(){
    if(typeof Peer==="undefined") return setError("Multiplayer could not load. Refresh and try again.");
    const name=(document.getElementById("name")?.value||"Host").trim().slice(0,18)||"Host";
    resetNetwork();state.mode="host";state.name=name;state.room=roomCode();state.joining=true;state.error="";render();startHostPeer(0);
  }
  function startHostPeer(attempt){
    if(attempt>4){state.mode="home";state.joining=false;return setError("Could not create a room. Try again.");}
    const peer=new Peer(PEER_PREFIX+state.room.toLowerCase(),PEER_OPTIONS);state.peer=peer;
    peer.on("open",()=>{
      state.joining=false;state.meId="p-host";
      state.hostGame={
        room:state.room,phase:"lobby",round:-1,promptDeck:shuffle(PROMPTS),players:[
          {id:"p-host",token:state.token,name:state.name,score:0,isHost:true,connected:true}
        ],submissions:{},votes:{},ready:{},options:[],history:[]
      };
      peer.on("connection",incoming);
      hostTicker=setInterval(()=>{},10000);
      syncAll();
    });
    peer.on("error",err=>{
      if(err?.type==="unavailable-id"){try{peer.destroy();}catch(_){}state.room=roomCode();startHostPeer(attempt+1);}
      else{state.mode="home";state.joining=false;state.peer=null;setError("Could not start multiplayer. Check your connection.");}
    });
  }

  function incoming(conn){
    const temp=conn.peer+":"+Date.now();state.conns.set(temp,conn);
    conn.on("data",m=>hostMessage(conn,m,temp));
    conn.on("close",()=>disconnect(conn));conn.on("error",()=>disconnect(conn));
  }
  function hostMessage(conn,msg,temp){
    if(!msg||typeof msg!=="object"||!state.hostGame)return;
    if(msg.type==="join"){
      const name=String(msg.name||"").trim().slice(0,18),token=String(msg.token||"");
      if(!name){conn.send({type:"join-error",message:"Enter a name."});return;}
      let p=state.hostGame.players.find(x=>x.token===token);
      if(p){p.name=name;p.connected=true;}
      else{
        if(state.hostGame.phase!=="lobby"){conn.send({type:"join-error",message:"This game already started."});return;}
        if(state.hostGame.players.length>=MAX_PLAYERS){conn.send({type:"join-error",message:"This room is full."});return;}
        p={id:"p-"+randomString(8),token,name,score:0,isHost:false,connected:true};state.hostGame.players.push(p);
      }
      conn.__playerId=p.id;state.conns.delete(temp);
      const old=state.conns.get(p.id);if(old&&old!==conn)try{old.close();}catch(_){}
      state.conns.set(p.id,conn);conn.send({type:"joined",playerId:p.id});syncAll();return;
    }
    const p=state.hostGame.players.find(x=>x.id===conn.__playerId);if(!p)return;
    if(msg.type==="submit")submitAnswer(p.id,String(msg.text||""));
    if(msg.type==="vote")vote(p.id,Number(msg.choice));
    if(msg.type==="ready")ready(p.id);
  }
  function disconnect(conn){
    if(!state.hostGame||!conn.__playerId)return;
    if(state.conns.get(conn.__playerId)!==conn)return;
    const p=state.hostGame.players.find(x=>x.id===conn.__playerId);if(p)p.connected=false;syncAll();
  }

  function joinRoom(){
    if(typeof Peer==="undefined")return setError("Multiplayer could not load. Refresh and try again.");
    const name=(document.getElementById("name")?.value||"").trim().slice(0,18),room=formatRoom(document.getElementById("room")?.value||"");
    if(!name)return setError("Enter your name.");
    if(room.length!==6)return setError("Enter the 6-character room code.");
    resetNetwork();state.mode="guest";state.name=name;state.room=room;state.error="";state.joining=true;render();
    const peer=new Peer(undefined,PEER_OPTIONS);state.peer=peer;
    peer.on("open",()=>{
      const conn=peer.connect(PEER_PREFIX+room.toLowerCase(),{serialization:"json"});state.hostConn=conn;
      const timeout=setTimeout(()=>{if(state.joining){state.mode="home";state.joining=false;resetNetwork();setError("Could not reach that room. Check the code and try again.");}},15000);
      conn.on("open",()=>conn.send({type:"join",name:state.name,token:state.token}));
      conn.on("data",msg=>{
        if(msg.type==="joined"){clearTimeout(timeout);state.joining=false;state.meId=msg.playerId;}
        else if(msg.type==="join-error"){clearTimeout(timeout);state.mode="home";state.joining=false;resetNetwork();setError(msg.message||"Could not join.");}
        else if(msg.type==="state"){state.publicState=msg.state;render();}
      });
      conn.on("close",()=>{if(state.mode==="guest"){state.mode="home";state.joining=false;state.publicState=null;setError("The host disconnected.");}});
      conn.on("error",()=>{if(state.mode==="guest"){state.mode="home";state.joining=false;state.publicState=null;setError("Connection lost.");}});
    });
    peer.on("error",()=>{if(state.mode==="guest"&&state.joining){state.mode="home";state.joining=false;state.publicState=null;setError("Could not connect. Try again.");}});
  }

  function startGame(){
    const g=state.hostGame;if(!g||g.phase!=="lobby"||g.players.length<MIN_PLAYERS)return;
    g.round=0;beginRound();
  }
  function beginRound(){
    const g=state.hostGame;
    g.phase="submit";g.submissions={};g.votes={};g.ready={};g.options=[];
    g.spotlightId=g.players[g.round%g.players.length].id;
    g.prompt=g.promptDeck[g.round%g.promptDeck.length];
    syncAll();
  }
  function submitAnswer(playerId,text){
    const g=state.hostGame;if(!g||g.phase!=="submit"||g.submissions[playerId])return;
    text=text.trim().replace(/\s+/g," ").slice(0,90);if(!text)return;
    g.submissions[playerId]=text;
    if(g.players.every(p=>g.submissions[p.id]))prepareVote();
    else syncAll();
  }
  function prepareVote(){
    const g=state.hostGame;
    const items=g.players.map(p=>({authorId:p.id,authorName:p.name,text:g.submissions[p.id],isTruth:p.id===g.spotlightId}));
    g.options=shuffle(items);g.phase="vote";g.votes={};syncAll();
  }
  function vote(playerId,choice){
    const g=state.hostGame;if(!g||g.phase!=="vote"||g.votes[playerId]!=null||playerId===g.spotlightId)return;
    if(!Number.isInteger(choice)||choice<0||choice>=g.options.length)return;
    if(g.options[choice].authorId===playerId)return;
    g.votes[playerId]=choice;
    const voters=g.players.filter(p=>p.id!==g.spotlightId);
    if(voters.every(p=>g.votes[p.id]!=null))resolveRound();else syncAll();
  }
  function resolveRound(){
    const g=state.hostGame;if(!g||g.phase!=="vote")return;
    const truthIndex=g.options.findIndex(o=>o.isTruth);
    const before=Object.fromEntries(g.players.map(p=>[p.id,p.score]));
    const optionResults=g.options.map((o,i)=>{
      const voterIds=Object.keys(g.votes).filter(pid=>g.votes[pid]===i);
      let points=0;
      if(!o.isTruth){points=voterIds.length;const author=g.players.find(p=>p.id===o.authorId);if(author)author.score+=points;}
      return {...o,votes:voterIds.map(id=>g.players.find(p=>p.id===id)?.name||"?"),points};
    });
    for(const [pid,ch] of Object.entries(g.votes)){
      if(ch===truthIndex){const p=g.players.find(x=>x.id===pid);if(p)p.score+=2;}
    }
    const players=g.players.map(p=>{
      let summary="";
      if(p.id===g.spotlightId)summary="Spotlight — sat out the vote";
      else if(g.votes[p.id]===truthIndex)summary="Found the real answer +2";
      else summary="Picked a decoy";
      const fooled=optionResults.find(o=>o.authorId===p.id&&!o.isTruth)?.points||0;
      if(fooled)summary+=(summary?" • ":"")+"fooled "+fooled+" player"+(fooled===1?"":"s");
      return {id:p.id,name:p.name,delta:p.score-before[p.id],summary};
    });
    g.results={truthText:g.options[truthIndex].text,options:optionResults,players};
    g.phase="reveal";g.ready={};g.history.push(g.results);syncAll();
  }
  function ready(playerId){
    const g=state.hostGame;if(!g||g.phase!=="reveal")return;g.ready[playerId]=true;
    if(g.players.every(p=>g.ready[p.id])){
      if(g.round+1>=g.players.length){g.phase="final";syncAll();}
      else{g.round++;beginRound();}
    }else syncAll();
  }
  function rematch(){
    const g=state.hostGame;if(!g)return;
    g.phase="lobby";g.round=-1;g.promptDeck=shuffle(PROMPTS);g.submissions={};g.votes={};g.ready={};g.options=[];g.history=[];
    g.players.forEach(p=>p.score=0);syncAll();
  }

  function publicStateFor(playerId){
    const g=state.hostGame,p=g.players.find(x=>x.id===playerId);
    const ps={room:g.room,players:g.players.map(x=>({id:x.id,name:x.name,score:x.score,isHost:x.isHost,connected:x.connected})),game:{phase:g.phase,round:g.round,totalRounds:g.players.length}};
    if(g.phase!=="lobby"&&g.phase!=="final"){
      const spot=g.players.find(x=>x.id===g.spotlightId);
      ps.game.spotlightId=g.spotlightId;ps.game.spotlightName=spot?.name||"Player";ps.game.prompt=g.prompt;
    }
    if(g.phase==="submit"){ps.game.submittedCount=Object.keys(g.submissions).length;ps.you={submitted:!!g.submissions[playerId]};}
    if(g.phase==="vote"){
      ps.game.votedCount=Object.keys(g.votes).length;ps.game.votersNeeded=g.players.length-1;
      ps.game.options=g.options.map((o,i)=>({text:o.text,own:o.authorId===playerId}));
      ps.you={vote:g.votes[playerId]??null};
    }
    if(g.phase==="reveal"){
      ps.game.results=g.results;ps.game.readyCount=Object.keys(g.ready).length;ps.game.lastRound=g.round+1>=g.players.length;
      ps.you={ready:!!g.ready[playerId]};
    }
    if(g.phase==="final"){ps.you={score:p?.score||0};}
    return ps;
  }
  function syncAll(){
    if(!state.hostGame)return;
    state.publicState=publicStateFor(state.meId);
    for(const [pid,c] of state.conns){
      if(!String(pid).startsWith("p-")||pid==="p-host")continue;
      if(c?.open)try{c.send({type:"state",state:publicStateFor(pid)});}catch(_){}
    }
    render();
  }

  function clientSubmit(){
    const text=(document.getElementById("answer")?.value||"").trim();
    if(!text){toast("Write an answer first.");return;}
    if(state.mode==="host")submitAnswer(state.meId,text);else if(state.hostConn?.open)state.hostConn.send({type:"submit",text});
  }
  function clientVote(choice){
    if(state.mode==="host")vote(state.meId,choice);else if(state.hostConn?.open)state.hostConn.send({type:"vote",choice});
  }
  function clientReady(){
    if(state.mode==="host")ready(state.meId);else if(state.hostConn?.open)state.hostConn.send({type:"ready"});
  }
  function leave(){
    resetNetwork();state.mode="home";state.error="";state.room="";state.joining=false;history.replaceState({},"",location.pathname);render();
  }

  document.addEventListener("click",async e=>{
    if(state.modal&&e.target.classList?.contains("modal-backdrop")){state.modal=false;render();return;}
    const el=e.target.closest("[data-action]");if(!el)return;
    const a=el.dataset.action;
    if(a==="rules"){state.modal=true;render();}
    else if(a==="close-rules"){state.modal=false;render();}
    else if(a==="focus-join")document.getElementById("joinbox")?.scrollIntoView({behavior:"smooth",block:"center"});
    else if(a==="host")createHost();
    else if(a==="join")joinRoom();
    else if(a==="leave")leave();
    else if(a==="copy-code")toast(await copyText(state.publicState.room)?"Code copied":"Could not copy");
    else if(a==="copy-link")toast(await copyText(el.dataset.link)?"Invite link copied":"Could not copy");
    else if(a==="start")startGame();
    else if(a==="submit-answer")clientSubmit();
    else if(a==="vote")clientVote(Number(el.dataset.choice));
    else if(a==="ready")clientReady();
    else if(a==="rematch")rematch();
  });
  document.addEventListener("input",e=>{if(e.target?.id==="room")e.target.value=formatRoom(e.target.value);});
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&state.modal){state.modal=false;render();}
    if(e.key==="Enter"&&state.mode==="home"&&(document.activeElement?.id==="name"||document.activeElement?.id==="room"))joinRoom();
  });
  window.addEventListener("beforeunload",resetNetwork);
  render();
})();