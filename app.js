(() => {
  "use strict";

  const MAX_PLAYERS = 8;
  const TOTAL_ROUNDS = 8;
  const PEER_PREFIX = "misspick-";
  const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const TRAP_WINDOW_MS = 3200;

  const PUZZLES = [
    {tier:"easy", q:"What comes next?  2, 4, 6, 8, ?", options:["9","10","12","16"], correct:1, explain:"The sequence adds 2 each time."},
    {tier:"easy", q:"You pass the runner in 2nd place. What place are you in?", options:["1st","2nd","3rd","It depends"], correct:1, explain:"You take the 2nd-place runner's position."},
    {tier:"easy", q:"Which is heavier?", options:["1 lb of bricks","1 lb of feathers","They weigh the same","Not enough information"], correct:2, explain:"A pound is a pound."},
    {tier:"easy", q:"If yesterday was Sunday, what day is tomorrow?", options:["Monday","Tuesday","Wednesday","Saturday"], correct:1, explain:"Today is Monday, so tomorrow is Tuesday."},
    {tier:"easy", q:"You have 12 eggs. All but 5 break. How many are unbroken?", options:["5","7","12","0"], correct:0, explain:"“All but 5” means 5 did not break."},
    {tier:"easy", q:"Bird is to nest as bee is to…", options:["Web","Hive","Den","Shell"], correct:1, explain:"Birds live in nests; bees live in hives."},
    {tier:"easy", q:"What comes next?  1, 1, 2, 3, 5, ?", options:["6","7","8","10"], correct:2, explain:"Each number is the sum of the previous two."},
    {tier:"easy", q:"Which one does NOT belong?", options:["Triangle","Square","Circle","Cube"], correct:3, explain:"Cube is the only three-dimensional shape."},
    {tier:"easy", q:"What month comes next?  January, February, March, April, May, June, July, ?", options:["April","August","October","December"], correct:1, explain:"They are the months in order."},
    {tier:"easy", q:"Which word can follow SUN, MOON, and STAR?", options:["Beam","Light","Rise","Sky"], correct:1, explain:"Sunlight, moonlight, and starlight are all words."},

    {tier:"medium", q:"What comes next?  11, 14, 19, 26, ?", options:["33","34","35","37"], correct:2, explain:"The gaps are +3, +5, +7, so next is +9."},
    {tier:"medium", q:"What letter comes next?  A, C, F, J, ?", options:["M","N","O","P"], correct:2, explain:"Move forward +2, +3, +4, then +5 letters."},
    {tier:"medium", q:"What comes next?  2, 3, 5, 9, 17, ?", options:["25","31","33","34"], correct:2, explain:"The gaps double: +1, +2, +4, +8, then +16."},
    {tier:"medium", q:"If 2 → 6, 3 → 12, 4 → 20, then 5 → ?", options:["25","28","30","35"], correct:2, explain:"Each number is multiplied by the next number: n × (n + 1)."},
    {tier:"medium", q:"Two fathers and two sons eat 3 burgers. Everyone eats exactly one. How many people are there?", options:["3","4","5","6"], correct:0, explain:"Grandfather, father, and son make two fathers and two sons."},
    {tier:"medium", q:"5 machines make 5 widgets in 5 minutes. How long for 100 machines to make 100 widgets?", options:["5 minutes","20 minutes","100 minutes","500 minutes"], correct:0, explain:"Each machine makes one widget in 5 minutes."},
    {tier:"medium", q:"All BLOOPS are RAZZIES. No RAZZIES are green. Can any BLOOPS be green?", options:["Yes","No","Only some","Not enough information"], correct:1, explain:"If every bloop is a razzie and no razzie is green, no bloop can be green."},
    {tier:"medium", q:"What appears once in MINUTE, twice in MOMENT, and never in THOUSAND YEARS?", options:["The letter M","The letter N","The letter T","The letter E"], correct:0, explain:"M appears once in minute, twice in moment, and not at all in thousand years."},
    {tier:"medium", q:"Which number's letters are already in alphabetical order?", options:["FOUR","FORTY","SIX","TEN"], correct:1, explain:"F-O-R-T-Y is in alphabetical order."},
    {tier:"medium", q:"Which one does NOT belong?", options:["RACECAR","LEVEL","RADAR","ROBOT"], correct:3, explain:"The first three are palindromes."},
    {tier:"medium", q:"These numbers are in alphabetical order by name: 8, 5, 4, 9, 1, 7, 6, ?", options:["2","3","10","0"], correct:1, explain:"Eight, five, four, nine, one, seven, six, three…"},
    {tier:"medium", q:"3 cats catch 3 mice in 3 minutes. At the same rate, 100 cats catch 100 mice in…", options:["3 minutes","30 minutes","100 minutes","300 minutes"], correct:0, explain:"Each cat catches one mouse in 3 minutes."},
    {tier:"medium", q:"What comes next?  64, 32, 16, 8, ?", options:["2","3","4","6"], correct:2, explain:"Each number is halved."},
    {tier:"medium", q:"What comes next?  1, 2, 6, 24, ?", options:["48","96","100","120"], correct:3, explain:"Multiply by 2, then 3, then 4, then 5."},
    {tier:"medium", q:"A is taller than B. B is taller than C. D is taller than A. Who is second tallest?", options:["A","B","C","D"], correct:0, explain:"The order is D, A, B, C."},
    {tier:"medium", q:"Some FLURPS are GLIPS. All GLIPS are ZAPS. What MUST be true?", options:["All flurps are zaps","Some flurps are zaps","No flurps are zaps","All zaps are glips"], correct:1, explain:"The flurps that are glips must also be zaps."},

    {tier:"hard", q:"What comes next?  1, 4, 10, 22, 46, ?", options:["78","92","94","96"], correct:2, explain:"Double the number, then add 2."},
    {tier:"hard", q:"What letter comes next?  B, D, G, K, P, ?", options:["U","V","W","X"], correct:1, explain:"Move +2, +3, +4, +5, then +6 letters."},
    {tier:"hard", q:"What comes next?  1, 11, 21, 1211, 111221, ?", options:["212211","312211","111321","311221"], correct:1, explain:"Read the previous term aloud: three 1s, two 2s, one 1 → 312211."},
    {tier:"hard", q:"At exactly 3:15, what is the smaller angle between the clock hands?", options:["0°","7.5°","15°","22.5°"], correct:1, explain:"The minute hand is at 90°. The hour hand has moved to 97.5°."},
    {tier:"hard", q:"What comes next?  3, 3, 5, 4, 4, 3, 5, ?", options:["3","4","5","6"], correct:2, explain:"They are the letter counts of ONE, TWO, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT."},
    {tier:"hard", q:"A bat and ball cost $1.10 total. The bat costs $1.00 more than the ball. The ball costs…", options:["5¢","10¢","15¢","20¢"], correct:0, explain:"5¢ + $1.05 = $1.10."},
    {tier:"hard", q:"What is 30 divided by one-half, plus 10?", options:["25","40","60","70"], correct:3, explain:"Dividing by 1/2 doubles 30 to 60, then add 10."},
    {tier:"hard", q:"Five people each shake hands once with every other person. How many handshakes happen?", options:["5","10","20","25"], correct:1, explain:"There are 5×4÷2 = 10 unique pairs."},
    {tier:"hard", q:"A cube is painted on every face, then cut into 27 equal small cubes. How many small cubes have exactly TWO painted faces?", options:["8","12","18","24"], correct:1, explain:"The center cube on each of the 12 edges has exactly two painted faces."},
    {tier:"hard", q:"If SOUTH becomes TPVUI by shifting every letter forward one, NORTH becomes…", options:["OPSUI","OPSTI","OQSVI","NPSTI"], correct:0, explain:"N→O, O→P, R→S, T→U, H→I."},
    {tier:"hard", q:"What comes next?  AZ, BY, CX, ?", options:["DV","DW","DX","EV"], correct:1, explain:"The first letter moves forward; the second moves backward: A/Z, B/Y, C/X, D/W."},
    {tier:"hard", q:"What comes next?  1, 2, 4, 7, 11, ?", options:["14","15","16","18"], correct:2, explain:"Add +1, +2, +3, +4, then +5."},
    {tier:"easy", q:"Which word is the same forward and backward?", options:["LEVEL","CLOUD","MUSIC","LIGHT"], correct:0, explain:"LEVEL reads the same in either direction."},
    {tier:"easy", q:"Facing east, you turn right. Now you face…", options:["North","South","West","East"], correct:1, explain:"Turn right from east and you face south."},
    {tier:"easy", q:"Which of these birds can fly?", options:["Ostrich","Penguin","Owl","Emu"], correct:2, explain:"An owl flies; the other three are flightless birds."},
    {tier:"easy", q:"Which pair uses exactly the same letters?", options:["LISTEN / SILENT","COLD / CLOUD","MOUSE / HOUSE","TIGER / TIGGER"], correct:0, explain:"LISTEN and SILENT are anagrams."},
    {tier:"medium", q:"Which statement is always true?", options:["Every square is a rectangle","Every rectangle is a square","No squares have corners","A triangle has four sides"], correct:0, explain:"Squares are special rectangles with four equal sides."},
    {tier:"medium", q:"Which word contains all five vowels exactly once?", options:["EDUCATION","QUESTION","CREATION","LANTERN"], correct:0, explain:"EDUCATION contains E, U, A, I and O—each once."},
    {tier:"medium", q:"What letter completes the pattern? Z, X, U, Q, ?", options:["M","L","N","O"], correct:1, explain:"The gaps move backward 2, 3, 4, then 5 letters."},
    {tier:"medium", q:"Which pair of words are opposites?", options:["Expand / Shrink","Rise / Lift","Quiet / Silent","Bright / Vivid"], correct:0, explain:"Expand means grow; shrink means get smaller."},
    {tier:"medium", q:"Three brothers share one sister. How many children are in their family?", options:["3","4","5","6"], correct:1, explain:"Three brothers plus one sister makes four children."},
    {tier:"medium", q:"Which pair is an anagram?", options:["PEAR / REAP","BIRD / BRIDE","LAMP / MAPLE","STONE / STOVE"], correct:0, explain:"PEAR and REAP use exactly the same four letters."},
    {tier:"hard", q:"Which word becomes another everyday word when spelled backward?", options:["STRESSED","WINDOW","PURPLE","ORANGE"], correct:0, explain:"STRESSED backward spells DESSERTS."},
    {tier:"hard", q:"What comes next? J, F, M, A, M, J, J, A, ?", options:["S","O","N","D"], correct:0, explain:"The letters start the months from January to August; September is next."},
    {tier:"hard", q:"Every ZORP is a FIZZ. No FIZZ can swim. Can a ZORP swim?", options:["Always","Sometimes","Never","Only adults"], correct:2, explain:"Since all zorps are fizzes, and no fizz swims, no zorp swims."},
    {tier:"hard", q:"Which phrase reads the same backward when spaces are ignored?", options:["NEVER ODD OR EVEN","THE LONG ROAD","RUN TO WIN","LATER TONIGHT"], correct:0, explain:"NEVERODDOREVEN is a palindrome."},
    {tier:"hard", q:"All X are Y. Some Y are Z. What MUST follow?", options:["All X are Z","Some X are Z","No X are Z","None of these"], correct:3, explain:"The Y objects that are Z might not include any X objects."},
    {tier:"hard", q:"One person always lies, one tells the truth. Someone says 'We're both liars.' Who said it?", options:["The liar","The truth-teller","Either one","Neither one"], correct:0, explain:"Only the liar could say this, because the statement itself is false."}
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
    modal:false,
    localStartAt:0,
    localDeadline:0,
    localTrapUntil:0
  };

  let hostTicker = null;
  let uiTicker = null;
  const $app = document.getElementById("app");
  const $toast = document.getElementById("toast");

  function getToken(){
    let t = localStorage.getItem("misspick-token");
    if(!t){
      t = randomString(18);
      localStorage.setItem("misspick-token",t);
    }
    return t;
  }

  function randomString(len=8){
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    return Array.from(bytes,b => (b % 36).toString(36)).join("").slice(0,len);
  }

  function randomInt(max){
    if(max <= 1) return 0;
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % max;
  }

  function shuffle(arr){
    const out = [...arr];
    for(let i=out.length-1;i>0;i--){
      const j = randomInt(i+1);
      [out[i],out[j]] = [out[j],out[i]];
    }
    return out;
  }

  function makeRoomCode(){
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes,b => ROOM_CHARS[b % ROOM_CHARS.length]).join("");
  }

  function esc(v=""){
    return String(v).replace(/[&<>'"]/g,c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }

  function formatRoom(v=""){
    return v.toUpperCase().replace(/[^A-Z2-9]/g,"").slice(0,6);
  }

  function setError(msg=""){
    state.error = msg;
    render();
  }

  function toast(msg){
    $toast.textContent = msg;
    $toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>$toast.classList.remove("show"),1800);
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

  function playTone(kind="tap"){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = kind === "win" ? 740 : kind === "bad" ? 210 : 500;
      g.gain.setValueAtTime(.0001,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(.07,ctx.currentTime+.01);
      g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.16);
      o.start();
      o.stop(ctx.currentTime+.18);
    }catch(_){}
  }

  function topbar(extra=""){
    return '<div class="arcade-utility">'+
      '<div class="mini-logo"><span class="mini-logo-mark">M</span><span>MISSPICK</span></div>'+
      '<div class="utility-actions">'+extra+'<button class="ghost-btn" data-action="rules">HOW TO PLAY</button></div>'+
    '</div>';
  }

  function arcadePlayerCard(p,i){
    return '<div class="arcade-player-card player-color-'+(i%8)+' '+(p.id===state.meId?"is-me":"")+'">'+
      '<div class="arcade-player-avatar">'+esc(p.name.charAt(0).toUpperCase())+'</div>'+
      '<div class="arcade-player-copy"><span class="arcade-player-label">P'+(i+1)+(p.id===state.meId?' • YOU':'')+'</span><b>'+esc(p.name)+'</b></div>'+
      '<div class="arcade-player-score"><span>SCORE</span><strong>'+Number(p.score||0)+'</strong></div>'+
    '</div>';
  }

  function arcadePlayerStrip(ps){
    const players=ps?.players||[];
    if(!players.length) return "";
    return '<section class="arcade-score-strip" style="--player-count:'+players.length+'">'+
      players.map((p,i)=>arcadePlayerCard(p,i)).join("")+
    '</section>';
  }

  function battleHeader(ps,extra=""){
    const players=ps?.players||[];
    const cut=Math.ceil(players.length/2);
    const left=players.slice(0,cut);
    const right=players.slice(cut);
    return '<header class="battle-header">'+
      '<div class="battle-meta">'+extra+'<button class="ghost-btn" data-action="rules">HOW TO PLAY</button></div>'+
      '<div class="battle-roster">'+
        '<div class="roster-half roster-left">'+left.map((p,i)=>arcadePlayerCard(p,i)).join("")+'</div>'+
        '<div class="battle-logo-wrap"><div class="battle-logo">MISSPICK</div><div class="battle-tagline">SOLVE FAST • CALL THE MISS</div></div>'+
        '<div class="roster-half roster-right">'+right.map((p,i)=>arcadePlayerCard(p,cut+i)).join("")+'</div>'+
      '</div>'+
    '</header>';
  }

  function rulesModal(){
    if(!state.modal) return "";
    return '<div class="modal-backdrop" data-action="close-rules">'+
      '<div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">'+
        '<div class="modal-head"><h2>How MISSPICK works</h2><button class="icon-btn" data-action="close-rules" aria-label="Close">✕</button></div>'+
        '<ol>'+
          '<li><b>Solve the puzzle.</b> Everyone gets the same four-choice brain teaser and a short countdown.</li>'+
          '<li><b>Right answer: +1 point.</b> <b>Fastest right answer: +2 bonus points.</b></li>'+
          '<li><b>Solve early? Call a miss.</b> Predict which WRONG answer another player will pick. Your prediction is secret until the reveal.</li>'+
          '<li><b>Called it!</b> Earn +1 for each person who makes the wrong choice you predicted (up to +2 each round). Anyone whose mistake was correctly predicted loses 1 point (minimum score: zero).</li>'+
          '<li>There are <b>'+TOTAL_ROUNDS+' rounds</b>. Everyone confirms they are ready before the next round. The last is a faster Lightning Round.</li>'+
        '</ol>'+
        '<p>That is the entire game: <b>solve fast, then predict your friends’ mistakes.</b></p>'+
      '</div>'+
    '</div>';
  }

  function homeView(){
    const prefill = new URLSearchParams(location.search).get("room") || "";
    return '<main class="page arcade-page">'+
      '<section class="arcade-home-scene">'+
        topbar()+
        '<div class="home-marquee">'+
          '<div class="battle-logo home-logo">MISSPICK</div>'+
          '<div class="battle-tagline">SOLVE FAST • CALL THE MISS</div>'+
          '<div class="eyebrow">LIVE MULTIPLAYER • 2–8 PLAYERS</div>'+
          '<h1 class="home-headline">Beat the puzzle.<br><span>Call their mistake.</span></h1>'+
          '<p class="lead home-lead">Everyone sees the same quick challenge. Get it right early, then predict the wrong answer somebody else will choose.</p>'+
          '<div class="hero-actions">'+
            '<button class="primary-btn big-arcade-btn" data-action="host" '+(state.joining?"disabled":"")+'>'+(state.joining?"CREATING ROOM…":"CREATE A ROOM")+'</button>'+
            '<button class="secondary-btn big-arcade-btn" data-action="focus-join" '+(state.joining?"disabled":"")+'>JOIN A ROOM</button>'+
          '</div>'+
        '</div>'+
        '<div class="home-rule-row">'+
          '<div class="rule-chip"><b>1 • SOLVE</b><span>One puzzle. Four answers. Beat the clock.</span></div>'+
          '<div class="rule-chip"><b>2 • CALL IT</b><span>Get it right early? Predict a tempting wrong answer.</span></div>'+
          '<div class="rule-chip"><b>3 • REVEAL</b><span>Score the solve, then see who walked into the miss you called.</span></div>'+
        '</div>'+
        '<section class="card join-panel arcade-join-panel" id="join-panel">'+
          '<div class="field"><label for="name">PLAYER NAME</label><input id="name" maxlength="18" autocomplete="nickname" placeholder="e.g. Alex"></div>'+
          '<div class="field"><label for="room">ROOM CODE</label><input id="room" class="code-input" maxlength="6" placeholder="ABC123" value="'+esc(prefill)+'"></div>'+
          '<button class="secondary-btn" data-action="join" '+(state.joining?"disabled":"")+'>'+(state.joining?"CONNECTING…":"JOIN ROOM")+'</button>'+
        '</section>'+
        (state.error?'<div class="error-box">'+esc(state.error)+'</div>':"")+
        '<div class="arcade-footnote">NO LOGIN • NO INSTALL • KEEP THE HOST TAB OPEN</div>'+
      '</section>'+
      rulesModal()+
    '</main>';
  }

  function lobbyView(ps){
    const isHost = state.mode === "host";
    const players = ps.players || [];
    const canStart = isHost && players.length >= 2;
    const roomUrl = location.origin + location.pathname + "?room=" + encodeURIComponent(ps.room);
    return '<main class="page arcade-page">'+
      '<section class="arcade-lobby-scene">'+
        battleHeader(ps,'<span class="tag">'+(isHost?"HOST":"JOINED")+'</span>')+
        '<div class="lobby-marquee">'+
          '<div class="insert-copy">ROOM READY</div>'+
          '<div class="room-code">'+esc(ps.room)+'</div>'+
          '<div class="room-kicker">SHARE THIS CODE • '+players.length+' PLAYER'+(players.length===1?"":"S")+' CONNECTED</div>'+
        '</div>'+
        '<div class="lobby-cabinet">'+
          '<section class="card lobby-player-card">'+
            '<div class="cabinet-title"><span>PLAYERS</span><button class="ghost-btn" data-action="leave">LEAVE</button></div>'+
            '<div class="player-list">'+players.map(p=>
              '<div class="player-row"><div class="player-id"><div class="avatar">'+esc(p.name.charAt(0).toUpperCase())+'</div><div class="player-name">'+esc(p.name)+'</div></div>'+
              (p.isHost?'<span class="tag">HOST</span>':(!p.connected?'<span class="tag warning">OFFLINE</span>':'<span class="tag">READY</span>'))+
              '</div>'
            ).join("")+'</div>'+
            '<div class="copy-row"><button class="secondary-btn" data-action="copy-code">COPY CODE</button><button class="secondary-btn" data-action="copy-link" data-link="'+esc(roomUrl)+'">COPY INVITE LINK</button></div>'+
          '</section>'+
          '<section class="card lobby-rules-card">'+
            '<div class="cabinet-title"><span>HOW TO WIN</span></div>'+
            '<div class="explain-list">'+
              '<div class="explain-item"><div class="explain-num">1</div><div><b>GET IT RIGHT</b><span>Right answer +1 point.</span></div></div>'+
              '<div class="explain-item"><div class="explain-num">2</div><div><b>BE FIRST</b><span>Fastest right answer gets +2 more.</span></div></div>'+
              '<div class="explain-item"><div class="explain-num">3</div><div><b>CALL A MISS</b><span>Solve early and predict a wrong answer someone else will choose.</span></div></div>'+
            '</div>'+
          '</section>'+
        '</div>'+
        '<div class="lobby-start">'+
          (isHost?'<button class="primary-btn start-game-btn" data-action="start" '+(canStart?"":"disabled")+'>'+(canStart?"START GAME":"WAITING FOR 1 MORE PLAYER")+'</button>':'<div class="waiting-host">WAITING FOR HOST TO START…</div>')+
        '</div>'+
        (state.error?'<div class="error-box">'+esc(state.error)+'</div>':"")+
      '</section>'+
      rulesModal()+
    '</main>';
  }

  function questionView(ps){
    const g = ps.game;
    const me = ps.you || {};
    const answered = !!me.answer;
    const correct = answered && me.answer.correct;
    const trapOpen = correct && me.answer.trapEligible && me.trap == null;
    const lateCorrect = correct && !me.answer.trapEligible;
    const lightning = g.round === TOTAL_ROUNDS-1;

    let centerHtml = "";
    let missHtml = "";

    if(!answered){
      centerHtml =
        answerGrid(g.puzzle,me)+
        '<div class="instruction score-callout"><b>RIGHT ANSWER <strong>+1</strong></b><span>FASTEST RIGHT ANSWER <strong>+2</strong></span></div>';
      missHtml =
        '<div class="miss-panel-idle"><div class="miss-fist">👊</div><p>THINK SOMEONE WILL PICK WRONG?</p><strong>CALL A MISS</strong><span>Get it right early, then predict their wrong answer.</span><button class="miss-cta" disabled>CALL A MISS</button></div>';
    }else if(trapOpen){
      centerHtml =
        '<div class="success-banner"><div class="success-icon">✓</div><div><b>RIGHT ANSWER!</b><span>Now read the room.</span></div></div>'+
        answerGrid(g.puzzle,me,true);
      missHtml =
        '<div class="miss-panel-live"><div class="miss-panel-title">CALL A MISS</div><p>Which WRONG answer do you predict somebody else picked?</p>'+
        '<div class="miss-choice-grid">'+g.puzzle.options.map((opt,i)=>{
          if(i===me.answer.choice) return '';
          return '<button class="miss-choice trap-btn" data-action="trap" data-choice="'+i+'"><span>'+String.fromCharCode(65+i)+'</span>'+esc(opt)+'</button>';
        }).join("")+'</div>'+
        '<div class="trap-clock">LOCK IT IN • <b id="trap-time">—</b></div></div>';
    }else if(correct){
      centerHtml =
        '<div class="success-banner"><div class="success-icon">✓</div><div><b>CORRECT.</b><span>'+(lateCorrect?"Too late to Call a Miss this round.":"Your Call a Miss prediction is locked.")+'</span></div></div>'+
        answerGrid(g.puzzle,me,true);
      missHtml = '<div class="miss-panel-idle locked"><div class="miss-fist small">✓</div><strong>'+(lateCorrect?"NO CALL THIS ROUND":"MISS CALLED")+'</strong><span>'+(lateCorrect?"You solved it after the prediction window closed.":"Prediction locked. Reveal incoming.")+'</span></div>';
    }else{
      centerHtml =
        '<div class="wrong-banner"><div class="wrong-icon">×</div><div><b>ANSWER LOCKED.</b><span>The right answer stays hidden until the reveal.</span></div></div>'+
        answerGrid(g.puzzle,me,true);
      missHtml = '<div class="miss-panel-idle locked"><div class="miss-fist small">×</div><strong>NO CALL THIS ROUND</strong><span>Call a Miss only unlocks after a correct early answer.</span></div>';
    }

    return '<main class="page arcade-page">'+
      '<section class="arcade-game-scene">'+
        battleHeader(ps,'<span class="tag">'+esc(ps.room)+'</span>')+
        '<div class="arena-layout">'+
          '<section class="question-stage">'+
            '<div class="round-chrome"><span>'+(lightning?"⚡ LIGHTNING ROUND":"ROUND "+(g.round+1)+" / "+TOTAL_ROUNDS)+'</span><div class="timer-hex"><small>TIME</small><strong id="timer-num">—</strong></div><span>'+esc(g.tier.toUpperCase())+' CHALLENGE</span></div>'+
            '<div class="timer-track"><div id="timer-fill" class="timer-fill"></div></div>'+
            '<section class="puzzle-panel">'+
              '<div id="ready-banner" class="ready-banner">GET READY</div>'+
              '<h2 class="puzzle-question">'+esc(g.puzzle.q)+'</h2>'+
            '</section>'+
            '<div class="answer-zone">'+centerHtml+'</div>'+
          '</section>'+
          '<aside class="call-miss-panel">'+
            '<div class="call-miss-logo">CALL A<br><span>MISS</span></div>'+
            missHtml+
          '</aside>'+
        '</div>'+
        '<section class="status-ticker"><span>'+statusTitle(me)+'</span><span>'+g.status.answered+' / '+ps.players.length+' ANSWERS LOCKED</span><span>'+g.status.traps+' MISS CALL'+(g.status.traps===1?"":"S")+'</span></section>'+
        (state.error?'<div class="error-box">'+esc(state.error)+'</div>':"")+
      '</section>'+
      rulesModal()+
    '</main>';
  }

  function statusTitle(me){
    if(!me.answer) return "Solve it before time runs out.";
    if(me.answer.correct && me.trap != null) return "Correct. Prediction locked.";
    if(me.answer.correct && me.answer.trapEligible) return "Correct. Pick a wrong answer to predict.";
    if(me.answer.correct) return "Correct. Locked in.";
    return "Answer locked.";
  }

  function answerGrid(puzzle,me,locked=false){
    return '<div class="answer-grid">'+puzzle.options.map((opt,i)=>{
      const selected = me.answer && me.answer.choice===i;
      let cls = "answer-card answer-btn";
      if(selected) cls += me.answer.correct ? " selected-correct" : " selected-wrong";
      return '<button class="'+cls+'" data-action="answer" data-choice="'+i+'" '+(locked||me.answer?"disabled":"")+'>'+
        '<span class="answer-letter">'+String.fromCharCode(65+i)+'</span><span><b>'+esc(opt)+'</b></span>'+
      '</button>';
    }).join("")+'</div>';
  }

  function revealView(ps){
    const g = ps.game;
    const r = g.results;
    const readyPlayers = g.readyPlayers || [];
    const readyCount = readyPlayers.filter(p=>p.ready).length;
    const allCount = readyPlayers.length;
    const iAmReady = !!ps.you?.ready;
    const lastRound = g.round + 1 >= TOTAL_ROUNDS;
    const mine = r.players.find(p=>p.id===state.meId);
    const correctOpt = g.puzzle.options[r.correct];
    const fastest = r.players.find(p=>p.id===r.fastestId);
    const mineDelta = mine ? mine.delta : 0;

    return '<main class="page arcade-page">'+
      '<section class="arcade-results-scene">'+
        battleHeader(ps,'<span class="tag">'+esc(ps.room)+'</span>')+
        '<div class="results-marquee"><span>'+(mine && mine.correct ? (mine.id===r.fastestId?"FASTEST BRAIN IN THE ROOM!":"NICE READ!") : "ROUND REVEAL")+'</span><b>'+(mineDelta>=0?"+":"")+mineDelta+' THIS ROUND</b></div>'+
        '<section class="results-board">'+
          '<div class="correct-answer"><span>✓</span><div><small>CORRECT ANSWER</small><b>'+String.fromCharCode(65+r.correct)+'. '+esc(correctOpt)+'</b><small>'+esc(r.explain)+'</small></div></div>'+
          (fastest?'<div class="fastest-strip">⚡ <b>'+esc(fastest.name)+'</b> was fastest at <b>'+formatTime(fastest.answerMs)+'</b> • +2 SPEED BONUS</div>':'<div class="fastest-strip">Nobody solved it in time.</div>')+
          '<div class="answer-reveal-grid">'+g.puzzle.options.map((opt,i)=>{
            const pickers = r.players.filter(p=>p.choice===i);
            const traps = r.players.filter(p=>p.trap===i);
            return '<div class="reveal-option '+(i===r.correct?"is-correct":"")+'">'+
              '<div class="reveal-option-head"><span class="answer-letter">'+String.fromCharCode(65+i)+'</span><b>'+esc(opt)+'</b>'+(traps.length?'<span class="trap-marker">🎯 '+traps.length+'</span>':"")+'</div>'+
              '<div class="picker-row">'+(pickers.length?pickers.map(p=>'<span class="person-chip '+(p.trapped?"caught":"")+'">'+esc(p.name)+(p.trapped?" 💥":"")+'</span>').join(""):'<span class="small">Nobody chose this</span>')+'</div>'+
            '</div>';
          }).join("")+'</div>'+
          '<div class="round-results">'+r.players.map(p=>
            '<div class="round-player '+(p.id===state.meId?"mine":"")+'"><div><b>'+esc(p.name)+'</b><small>'+resultSummary(p)+'</small></div><div class="delta '+(p.delta<0?"negative":"")+'">'+(p.delta>=0?"+":"")+p.delta+'</div></div>'
          ).join("")+'</div>'+
        '</section>'+
        leaderboard(ps)+
        '<section class="ready-card arcade-ready-card">'+
          '<div class="ready-head"><div><h3>READY FOR '+(lastRound?"THE FINAL SCORE?":"THE NEXT PUZZLE?")+'</h3><p>The game continues when everyone is ready.</p></div><span class="tag">'+readyCount+' / '+allCount+' READY</span></div>'+
          '<div class="ready-roster">'+readyPlayers.map(p=>'<span class="ready-person '+(p.ready?"ready":"")+'">'+(p.ready?"✓ ":"○ ")+esc(p.name)+(p.connected?"":" (offline)")+'</span>').join("")+'</div>'+
          '<div class="actions-center">'+(iAmReady?'<span class="small">✓ YOU’RE READY • WAITING FOR THE ROOM…</span>':'<button class="primary-btn" data-action="ready">I’M READY '+(lastRound?"FOR FINAL RESULTS":"FOR THE NEXT ROUND")+'</button>')+'</div>'+
        '</section>'+
      '</section>'+
      rulesModal()+
    '</main>';
  }

  function resultSummary(p){
    const bits=[];
    if(p.correct) bits.push("correct");
    else if(p.choice==null) bits.push("no answer");
    else bits.push("wrong");
    if(p.fastest) bits.push("fastest +2");
    if(p.trapHits>0) bits.push("called misses: "+p.trapHits);
    if(p.trapped) bits.push("mistake predicted −1");
    return bits.join(" • ");
  }

  function leaderboard(ps){
    const sorted=[...ps.players].sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name));
    return '<section class="leaderboard-card arcade-board"><div class="leader-head"><h3>LEADERBOARD</h3><span class="small">AFTER ROUND '+Math.min(TOTAL_ROUNDS,(ps.game.round||0)+1)+'</span></div><div class="leaderboard">'+sorted.map((p,i)=>
      '<div class="leader-row '+(p.id===state.meId?"me-row":"")+'"><div class="rank">'+(i+1)+'</div><div><b>'+esc(p.name)+'</b>'+(p.id===state.meId?' <span class="small">(YOU)</span>':"")+'</div><div class="score">'+p.score+'</div></div>'
    ).join("")+'</div></section>';
  }

  function finalView(ps){
    const sorted=[...ps.players].sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name));
    const top=sorted[0]?.score||0;
    const winners=sorted.filter(p=>p.score===top);
    const meRank=sorted.findIndex(p=>p.id===state.meId)+1;
    const me=sorted.find(p=>p.id===state.meId)||{score:0,trapHits:0,fastestWins:0};
    const trapKing=[...sorted].sort((a,b)=>b.trapHits-a.trapHits || b.score-a.score)[0];
    const speedKing=[...sorted].sort((a,b)=>b.fastestWins-a.fastestWins || b.score-a.score)[0];

    return '<main class="page arcade-page">'+
      '<section class="arcade-final-scene">'+
        battleHeader(ps,'<span class="tag">FINAL</span>')+
        '<section class="final-hero arcade-final-board">'+
          '<div class="final-kicker">GAME OVER</div>'+
          '<h1>'+(winners.length>1?"DEAD HEAT!":esc(winners[0].name)+" WINS!")+'</h1>'+
          '<p class="lead final-lead">'+(winners.length>1?esc(winners.map(p=>p.name).join(" and "))+" tied at "+top+" points.":esc(winners[0].name)+" finished with "+top+" points.")+'</p>'+
          '<div class="stat-ribbon">'+
            '<div class="stat-box"><strong>#'+meRank+'</strong><span>YOUR FINISH</span></div>'+
            '<div class="stat-box"><strong>'+me.score+'</strong><span>YOUR SCORE</span></div>'+
            '<div class="stat-box"><strong>'+me.trapHits+'</strong><span>MISSES YOU CALLED</span></div>'+
          '</div>'+
          '<div class="award-row"><span>⚡ SPEED DEMON: <b>'+esc(speedKing?.name||"—")+'</b> ('+(speedKing?.fastestWins||0)+')</span><span>🎯 SHARPEST PREDICTOR: <b>'+esc(trapKing?.name||"—")+'</b> ('+(trapKing?.trapHits||0)+')</span></div>'+
        '</section>'+
        leaderboard(ps)+
        '<div class="actions-center final-actions">'+(state.mode==="host"?'<button class="primary-btn" data-action="rematch">PLAY AGAIN</button>':"")+'<button class="secondary-btn" data-action="leave">LEAVE ROOM</button></div>'+
      '</section>'+
      rulesModal()+
    '</main>';
  }

  function render(){
    let html;
    if(state.mode==="home" || !state.publicState) html=homeView();
    else if(state.publicState.game?.phase==="final") html=finalView(state.publicState);
    else if(state.publicState.game?.phase==="reveal") html=revealView(state.publicState);
    else if(state.publicState.game?.phase==="question") html=questionView(state.publicState);
    else html=lobbyView(state.publicState);
    $app.innerHTML=html;
    updateTimerUI();
  }

  function formatTime(ms){
    if(ms==null) return "—";
    return (ms/1000).toFixed(2)+"s";
  }

  function applyTiming(g){
    if(!g || g.phase!=="question"){
      state.localStartAt=0;state.localDeadline=0;state.localTrapUntil=0;
      return;
    }
    const now=Date.now();
    state.localStartAt=now+(g.startAt-g.hostNow);
    state.localDeadline=now+(g.deadline-g.hostNow);
    state.localTrapUntil=g.youTrapUntil?now+(g.youTrapUntil-g.hostNow):0;
  }

  function startUiTicker(){
    if(uiTicker) clearInterval(uiTicker);
    uiTicker=setInterval(updateTimerUI,80);
  }

  function updateTimerUI(){
    const ps=state.publicState;
    if(!ps || ps.game?.phase!=="question") return;
    const now=Date.now();
    const ready=document.getElementById("ready-banner");
    const timerNum=document.getElementById("timer-num");
    const fill=document.getElementById("timer-fill");
    const trapTime=document.getElementById("trap-time");
    const pre=state.localStartAt-now;
    const rem=Math.max(0,state.localDeadline-now);
    const duration=ps.game.duration||12000;
    if(ready) ready.classList.toggle("show",pre>0);
    if(timerNum) timerNum.textContent=pre>0?"READY":(rem/1000).toFixed(rem<4000?1:0);
    if(fill) fill.style.width=(Math.max(0,Math.min(1,rem/duration))*100)+"%";
    document.querySelectorAll(".answer-btn").forEach(btn=>{
      const me=ps.you||{};
      btn.disabled = !!me.answer || pre>0 || rem<=0;
    });
    if(trapTime){
      const trapRem=Math.max(0,state.localTrapUntil-now);
      trapTime.textContent=(trapRem/1000).toFixed(1)+"s";
      if(trapRem<=0) document.querySelectorAll(".trap-btn").forEach(b=>b.disabled=true);
    }
  }

  function resetNetwork(){
    try{state.hostConn?.close();}catch(_){}
    for(const c of state.conns.values()) try{c.close();}catch(_){}
    try{state.peer?.destroy();}catch(_){}
    state.peer=null;
    state.hostConn=null;
    state.conns=new Map();
    state.hostGame=null;
    state.publicState=null;
    state.meId=null;
    if(hostTicker){clearInterval(hostTicker);hostTicker=null;}
  }

  function createHost(){
    if(typeof Peer==="undefined") return setError("The multiplayer library did not load. Check your internet connection, refresh, and try again.");
    const typed=(document.getElementById("name")?.value||"Host").trim().slice(0,18)||"Host";
    resetNetwork();
    state.mode="host";
    state.name=typed;
    state.room=makeRoomCode();
    state.joining=true;
    state.error="";
    render();
    startHostPeer(0);
  }

  function startHostPeer(attempt){
    if(attempt>4){
      state.mode="home";state.joining=false;
      return setError("Could not create a room. Check your connection and try again.");
    }
    const peer=new Peer(PEER_PREFIX+state.room.toLowerCase(),{debug:0});
    state.peer=peer;
    peer.on("open",()=>{
      state.joining=false;
      state.meId="p-host";
      state.hostGame={
        room:state.room,
        phase:"lobby",
        round:-1,
        ready:{},
        deck:buildDeck(),
        current:null,
        players:[{id:"p-host",token:state.token,name:state.name,score:0,trapHits:0,fastestWins:0,isHost:true,connected:true}],
        answers:{},
        traps:{},
        history:[]
      };
      peer.on("connection",onIncomingConnection);
      hostTicker=setInterval(hostTick,100);
      syncAll();
    });
    peer.on("error",err=>{
      if(err?.type==="unavailable-id"){
        try{peer.destroy();}catch(_){}
        state.room=makeRoomCode();
        startHostPeer(attempt+1);
      }else{
        state.mode="home";state.joining=false;state.peer=null;
        setError("Could not start multiplayer. Check your internet connection and try again.");
      }
    });
  }

  // Mix puzzle types deliberately: at most two number-pattern/math questions
  // in an eight-round match, instead of a mostly-arithmetic deck.
  function numberPuzzle(p){
    return /^(What comes next\?  [0-9]|If 2 →|5 machines|3 cats|A bat and ball|What is 30|Five people each shake|At exactly 3:15|A cube is painted|These numbers are|You have 12 eggs)/.test(p.q);
  }

  function buildDeck(){
    const ids=(tier,isNumber)=>shuffle(PUZZLES.map((p,i)=>p.tier===tier && numberPuzzle(p)===isNumber?i:null).filter(i=>i!=null));
    const easy=ids("easy",false).slice(0,2);
    const medium=shuffle([...ids("medium",false).slice(0,3),...ids("medium",true).slice(0,1)]);
    const hardNumber=ids("hard",true).slice(0,1);
    const hardWords=ids("hard",false).slice(0,1);
    return [...easy,...medium,...hardNumber,...hardWords];
  }

  function preparePuzzle(index){
    const src=PUZZLES[index];
    const items=src.options.map((text,i)=>({text,correct:i===src.correct}));
    const shuffled=shuffle(items);
    return {
      q:src.q,
      options:shuffled.map(x=>x.text),
      correct:shuffled.findIndex(x=>x.correct),
      explain:src.explain,
      tier:src.tier
    };
  }

  function onIncomingConnection(conn){
    const temp=conn.peer+":"+Date.now();
    state.conns.set(temp,conn);
    conn.on("data",msg=>handleHostMessage(conn,msg,temp));
    conn.on("close",()=>handleDisconnect(conn));
    conn.on("error",()=>handleDisconnect(conn));
  }

  function handleHostMessage(conn,msg,tempKey){
    if(!msg || typeof msg!=="object" || !state.hostGame) return;
    if(msg.type==="join"){
      const name=String(msg.name||"").trim().slice(0,18);
      const token=String(msg.token||"");
      if(!name){conn.send({type:"join-error",message:"Enter a name to join."});return;}
      let p=state.hostGame.players.find(x=>x.token===token);
      if(p){
        p.name=name;p.connected=true;
      }else{
        if(state.hostGame.phase!=="lobby"){conn.send({type:"join-error",message:"This game has already started."});return;}
        if(state.hostGame.players.length>=MAX_PLAYERS){conn.send({type:"join-error",message:"This room is full."});return;}
        p={id:"p-"+randomString(8),token,name,score:0,trapHits:0,fastestWins:0,isHost:false,connected:true};
        state.hostGame.players.push(p);
      }
      conn.__playerId=p.id;
      state.conns.delete(tempKey);
      const old=state.conns.get(p.id);
      if(old && old!==conn) try{old.close();}catch(_){}
      state.conns.set(p.id,conn);
      conn.send({type:"joined",playerId:p.id});
      syncAll();
      return;
    }
    const p=state.hostGame.players.find(x=>x.id===conn.__playerId);
    if(!p) return;
    if(msg.type==="answer") receiveAnswer(p.id,Number(msg.choice));
    if(msg.type==="trap") receiveTrap(p.id,Number(msg.choice));
    if(msg.type==="ready") receiveReady(p.id);
  }

  function handleDisconnect(conn){
    if(!state.hostGame || !conn.__playerId) return;
    if(state.conns.get(conn.__playerId)!==conn) return;
    const p=state.hostGame.players.find(x=>x.id===conn.__playerId);
    if(p) p.connected=false;
    syncAll();
  }

  function joinRoom(){
    if(typeof Peer==="undefined") return setError("The multiplayer library did not load. Check your internet connection, refresh, and try again.");
    const name=(document.getElementById("name")?.value||"").trim().slice(0,18);
    const room=formatRoom(document.getElementById("room")?.value||"");
    if(!name) return setError("Enter your name first.");
    if(room.length!==6) return setError("Enter the 6-character room code.");
    resetNetwork();
    state.mode="guest";state.name=name;state.room=room;state.error="";state.joining=true;
    render();
    const peer=new Peer(undefined,{debug:0});
    state.peer=peer;
    peer.on("open",()=>{
      const conn=peer.connect(PEER_PREFIX+room.toLowerCase(),{reliable:true,serialization:"json"});
      state.hostConn=conn;
      const timeout=setTimeout(()=>{
        if(state.joining){
          state.mode="home";state.joining=false;resetNetwork();
          setError("Room not found. Double-check the code and try again.");
        }
      },7500);
      conn.on("open",()=>conn.send({type:"join",name:state.name,token:state.token}));
      conn.on("data",msg=>{
        if(msg.type==="joined"){
          clearTimeout(timeout);state.joining=false;state.meId=msg.playerId;
        }else if(msg.type==="join-error"){
          clearTimeout(timeout);state.mode="home";state.joining=false;resetNetwork();
          setError(msg.message||"Could not join.");
        }else if(msg.type==="state"){
          state.publicState=msg.state;
          applyTiming(msg.state.game);
          render();
        }
      });
      conn.on("close",()=>{
        if(state.mode==="guest"){
          state.mode="home";state.joining=false;state.publicState=null;
          setError("The host disconnected. The room has ended.");
        }
      });
      conn.on("error",()=>{
        if(state.mode==="guest"){
          state.mode="home";state.joining=false;state.publicState=null;
          setError("Lost connection to the room.");
        }
      });
    });
    peer.on("error",()=>{
      if(state.mode==="guest"){
        state.mode="home";state.joining=false;state.publicState=null;
        setError("Could not connect. Check your internet connection and try again.");
      }
    });
  }

  function startGame(){
    const g=state.hostGame;
    if(!g || g.phase!=="lobby" || g.players.length<2) return;
    g.round=0;
    beginRound();
  }

  function beginRound(){
    const g=state.hostGame;
    const duration=g.round===TOTAL_ROUNDS-1?8000:(g.round<2?14000:12000);
    g.current=preparePuzzle(g.deck[g.round]);
    g.answers={};
    g.traps={};
    g.ready={};
    g.phase="question";
    g.startAt=Date.now()+1500;
    g.deadline=g.startAt+duration;
    g.duration=duration;
    syncAll();
  }

  function receiveAnswer(playerId,choice){
    const g=state.hostGame;
    if(!g || g.phase!=="question" || g.answers[playerId] || !Number.isInteger(choice) || choice<0 || choice>3) return;
    const now=Date.now();
    if(now<g.startAt-150 || now>g.deadline) return;
    const correct=choice===g.current.correct;
    const answerMs=Math.max(0,now-g.startAt);
    const enough=g.deadline-now>=TRAP_WINDOW_MS;
    g.answers[playerId]={
      choice,correct,answerMs,
      trapEligible:correct && enough,
      trapUntil:correct && enough ? Math.min(g.deadline,now+TRAP_WINDOW_MS) : 0
    };
    syncAll();
    maybeResolveRound();
  }

  function receiveTrap(playerId,choice){
    const g=state.hostGame;
    const ans=g?.answers[playerId];
    if(!g || g.phase!=="question" || !ans?.trapEligible || g.traps[playerId]!=null || !Number.isInteger(choice) || choice<0 || choice>3) return;
    if(choice===g.current.correct) return;
    if(Date.now()>ans.trapUntil) return;
    g.traps[playerId]=choice;
    syncAll();
    maybeResolveRound();
  }

  function hostTick(){
    const g=state.hostGame;
    if(!g || g.phase!=="question") return;
    const now=Date.now();
    if(now>=g.deadline){
      resolveRound();
      return;
    }
    maybeResolveRound();
  }

  function maybeResolveRound(){
    const g=state.hostGame;
    if(!g || g.phase!=="question") return;
    const now=Date.now();
    const allAnswered=g.players.every(p=>g.answers[p.id]);
    if(!allAnswered) return;
    const pending=g.players.some(p=>{
      const a=g.answers[p.id];
      return a?.trapEligible && g.traps[p.id]==null && now<a.trapUntil;
    });
    if(!pending) resolveRound();
  }

  function resolveRound(){
    const g=state.hostGame;
    if(!g || g.phase!=="question") return;
    const correctAnswers=g.players.map(p=>({p,a:g.answers[p.id]})).filter(x=>x.a?.correct);
    correctAnswers.sort((x,y)=>x.a.answerMs-y.a.answerMs);
    const fastestId=correctAnswers[0]?.p.id||null;
    const before=Object.fromEntries(g.players.map(p=>[p.id,p.score]));
    const resultPlayers=[];

    const trappedVictims=new Set();
    for(const victim of g.players){
      const a=g.answers[victim.id];
      if(!a || a.correct) continue;
      const caught=g.players.some(trapper=>trapper.id!==victim.id && g.traps[trapper.id]===a.choice);
      if(caught) trappedVictims.add(victim.id);
    }

    for(const p of g.players){
      const a=g.answers[p.id]||null;
      const isCorrect=!!a?.correct;
      const fastest=p.id===fastestId;
      const trapChoice=g.traps[p.id]??null;
      const victims=trapChoice==null?[]:g.players.filter(v=>v.id!==p.id && g.answers[v.id]?.choice===trapChoice && !g.answers[v.id]?.correct);
      const trapHits=Math.min(2,victims.length);
      const trapped=trappedVictims.has(p.id);
      const earned=(isCorrect?1:0)+(fastest?2:0)+trapHits;
      const penalty=trapped?1:0;
      p.score=Math.max(0,p.score+earned-penalty);
      if(fastest) p.fastestWins++;
      p.trapHits+=trapHits;
      resultPlayers.push({
        id:p.id,name:p.name,choice:a?.choice??null,correct:isCorrect,
        answerMs:a?.answerMs??null,fastest,trap:trapChoice,trapHits,
        trapVictims:victims.slice(0,2).map(v=>v.name),trapped,
        earned,penalty,delta:p.score-before[p.id],score:p.score
      });
    }

    g.history.push({
      correct:g.current.correct,
      explain:g.current.explain,
      fastestId,
      players:resultPlayers
    });
    g.phase="reveal";
    g.ready={};
    syncAll();
  }

  function receiveReady(playerId){
    const g=state.hostGame;
    if(!g || g.phase!=="reveal" || !g.players.some(p=>p.id===playerId)) return;
    g.ready[playerId]=true;
    if(g.players.every(p=>g.ready[p.id])){
      nextRound();
    }else{
      syncAll();
    }
  }

  function nextRound(){
    const g=state.hostGame;
    if(!g || g.phase!=="reveal") return;
    if(g.round+1>=TOTAL_ROUNDS){
      g.phase="final";
      syncAll();
    }else{
      g.round++;
      beginRound();
    }
  }

  function rematch(){
    const g=state.hostGame;
    if(!g) return;
    g.phase="lobby";g.round=-1;g.deck=buildDeck();g.current=null;g.answers={};g.traps={};g.ready={};g.history=[];
    g.players.forEach(p=>{p.score=0;p.trapHits=0;p.fastestWins=0;});
    syncAll();
  }

  function publicStateFor(playerId){
    const g=state.hostGame;
    const p=g.players.find(x=>x.id===playerId);
    const ps={
      room:g.room,
      players:g.players.map(x=>({id:x.id,name:x.name,score:x.score,trapHits:x.trapHits,fastestWins:x.fastestWins,isHost:x.isHost,connected:x.connected})),
      game:{phase:g.phase,round:g.round}
    };

    if(g.phase==="question"){
      const ans=g.answers[playerId]||null;
      ps.game.hostNow=Date.now();
      ps.game.startAt=g.startAt;
      ps.game.deadline=g.deadline;
      ps.game.duration=g.duration;
      ps.game.youTrapUntil=ans?.trapUntil||0;
      ps.game.tier=g.current.tier;
      ps.game.puzzle={q:g.current.q,options:g.current.options};
      ps.game.status={answered:Object.keys(g.answers).length,traps:Object.keys(g.traps).length};
      ps.you={
        answer:ans?{choice:ans.choice,correct:ans.correct,answerMs:ans.answerMs,trapEligible:ans.trapEligible}:null,
        trap:g.traps[playerId]??null
      };
    }

    if(g.phase==="reveal"){
      const h=g.history[g.history.length-1];
      ps.game.tier=g.current.tier;
      ps.game.puzzle={q:g.current.q,options:g.current.options};
      ps.game.results=h;
      ps.game.readyPlayers=g.players.map(x=>({id:x.id,name:x.name,ready:!!g.ready?.[x.id],connected:x.connected}));
      ps.you={ready:!!g.ready?.[playerId]};
    }

    if(g.phase==="final"){
      ps.you={score:p?.score||0,trapHits:p?.trapHits||0,fastestWins:p?.fastestWins||0};
    }
    return ps;
  }

  function syncAll(){
    if(!state.hostGame) return;
    state.publicState=publicStateFor(state.meId);
    applyTiming(state.publicState.game);
    for(const [pid,conn] of state.conns){
      if(!String(pid).startsWith("p-") || pid==="p-host") continue;
      if(conn?.open){
        try{conn.send({type:"state",state:publicStateFor(pid)});}catch(_){}
      }
    }
    render();
  }

  function chooseAnswer(choice){
    const ps=state.publicState;
    if(!ps || ps.game?.phase!=="question") return;
    if(Date.now()<state.localStartAt || Date.now()>state.localDeadline || ps.you?.answer) return;
    if(state.mode==="host") receiveAnswer(state.meId,choice);
    else if(state.hostConn?.open) state.hostConn.send({type:"answer",choice});
  }

  function chooseTrap(choice){
    const ps=state.publicState;
    if(!ps || ps.game?.phase!=="question" || ps.you?.trap!=null) return;
    if(Date.now()>state.localTrapUntil) return;
    if(state.mode==="host") receiveTrap(state.meId,choice);
    else if(state.hostConn?.open) state.hostConn.send({type:"trap",choice});
  }

  function readyUp(){
    if(state.publicState?.game?.phase!=="reveal" || state.publicState?.you?.ready) return;
    if(state.mode==="host") receiveReady(state.meId);
    else if(state.hostConn?.open) state.hostConn.send({type:"ready"});
  }

  function leave(){
    resetNetwork();
    state.mode="home";state.error="";state.room="";state.joining=false;
    history.replaceState({},"",location.pathname);
    render();
  }

  document.addEventListener("click",async e=>{
    const el=e.target.closest("[data-action]");
    if(!el) return;
    const a=el.dataset.action;
    if(a==="rules"){state.modal=true;render();}
    else if(a==="close-rules"){state.modal=false;render();}
    else if(a==="focus-join") document.getElementById("join-panel")?.scrollIntoView({behavior:"smooth",block:"center"});
    else if(a==="host") createHost();
    else if(a==="join") joinRoom();
    else if(a==="leave") leave();
    else if(a==="copy-code") toast(await copyText(state.publicState.room)?"Room code copied":"Could not copy");
    else if(a==="copy-link") toast(await copyText(el.dataset.link)?"Invite link copied":"Could not copy");
    else if(a==="start") startGame();
    else if(a==="answer"){chooseAnswer(Number(el.dataset.choice));playTone("tap");}
    else if(a==="trap"){chooseTrap(Number(el.dataset.choice));playTone("win");}
    else if(a==="ready") readyUp();
    else if(a==="rematch") rematch();
  });

  document.addEventListener("input",e=>{
    if(e.target?.id==="room") e.target.value=formatRoom(e.target.value);
  });

  document.addEventListener("keydown",e=>{
    if(e.key==="Enter" && state.mode==="home"){
      const active=document.activeElement;
      if(active?.id==="room" || active?.id==="name") joinRoom();
    }
    if(e.key==="Escape" && state.modal){state.modal=false;render();}
  });

  window.addEventListener("beforeunload",resetNetwork);

  // Visual-review mode uses the exact production question renderer without
  // opening a multiplayer connection. It is intentionally read-only.
  const previewMode = new URLSearchParams(location.search).get("preview");
  if(previewMode==="question"){
    const now=Date.now();
    state.mode="host";
    state.meId="p-host";
    state.publicState={
      room:"ARCADE",
      players:[
        {id:"p-host",name:"John",score:7,trapHits:1,fastestWins:2,isHost:true,connected:true},
        {id:"p-alex",name:"Alex",score:5,trapHits:1,fastestWins:1,isHost:false,connected:true},
        {id:"p-sam",name:"Sam",score:4,trapHits:0,fastestWins:1,isHost:false,connected:true},
        {id:"p-riley",name:"Riley",score:3,trapHits:1,fastestWins:0,isHost:false,connected:true}
      ],
      game:{
        phase:"question",round:2,tier:"medium",
        hostNow:now,startAt:now-2200,deadline:now+11800,duration:14000,youTrapUntil:0,
        puzzle:{q:"Which planet is known as the Red Planet?",options:["Venus","Mars","Jupiter","Saturn"]},
        status:{answered:1,traps:0}
      },
      you:{answer:null,trap:null}
    };
    applyTiming(state.publicState.game);
  }

  startUiTicker();
  render();
})();