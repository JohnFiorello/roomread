const { chromium } = require("playwright");
const { spawn } = require("child_process");

const liveBase = process.env.BASE_URL || "";
const server = liveBase ? null : spawn("python3", ["-m","http.server","8000","--bind","127.0.0.1"], {stdio:"inherit"});
const base = liveBase || "http://127.0.0.1:8000/";
const sleep = ms => new Promise(r => setTimeout(r,ms));

const correctFor = (q, options) => {
  const map = new Map([
    ["What comes next?  2, 4, 6, 8, ?","10"],
    ["You pass the runner in 2nd place. What place are you in?","2nd"],
    ["Which is heavier?","They weigh the same"],
    ["If yesterday was Sunday, what day is tomorrow?","Tuesday"],
    ["You have 12 eggs. All but 5 break. How many are unbroken?","5"],
    ["Bird is to nest as bee is to…","Hive"],
    ["What comes next?  1, 1, 2, 3, 5, ?","8"],
    ["What month comes next?  January, February, March, April, May, June, July, ?","August"],
    ["Which word can follow SUN, MOON, and STAR?","Light"],
    ["What comes next?  11, 14, 19, 26, ?","35"],
    ["What letter comes next?  A, C, F, J, ?","O"],
    ["What comes next?  2, 3, 5, 9, 17, ?","33"],
    ["If 2 → 6, 3 → 12, 4 → 20, then 5 → ?","30"],
    ["Two fathers and two sons eat 3 burgers. Everyone eats exactly one. How many people are there?","3"],
    ["5 machines make 5 widgets in 5 minutes. How long for 100 machines to make 100 widgets?","5 minutes"],
    ["All BLOOPS are RAZZIES. No RAZZIES are green. Can any BLOOPS be green?","No"],
    ["What appears once in MINUTE, twice in MOMENT, and never in THOUSAND YEARS?","The letter M"],
    ["Which number's letters are already in alphabetical order?","FORTY"],
    ["These numbers are in alphabetical order by name: 8, 5, 4, 9, 1, 7, 6, ?","3"],
    ["3 cats catch 3 mice in 3 minutes. At the same rate, 100 cats catch 100 mice in…","3 minutes"],
    ["What comes next?  64, 32, 16, 8, ?","4"],
    ["What comes next?  1, 2, 6, 24, ?","120"],
    ["A is taller than B. B is taller than C. D is taller than A. Who is second tallest?","A"],
    ["Some FLURPS are GLIPS. All GLIPS are ZAPS. What MUST be true?","Some flurps are zaps"],
    ["What comes next?  1, 4, 10, 22, 46, ?","94"],
    ["What letter comes next?  B, D, G, K, P, ?","V"],
    ["What comes next?  1, 11, 21, 1211, 111221, ?","312211"],
    ["At exactly 3:15, what is the smaller angle between the clock hands?","7.5°"],
    ["What comes next?  3, 3, 5, 4, 4, 3, 5, ?","5"],
    ["A bat and ball cost $1.10 total. The bat costs $1.00 more than the ball. The ball costs…","5¢"],
    ["What is 30 divided by one-half, plus 10?","70"],
    ["Five people each shake hands once with every other person. How many handshakes happen?","10"],
    ["A cube is painted on every face, then cut into 27 equal small cubes. How many small cubes have exactly TWO painted faces?","12"],
    ["If SOUTH becomes TPVUI by shifting every letter forward one, NORTH becomes…","OPSUI"],
    ["What comes next?  AZ, BY, CX, ?","DW"],
    ["What comes next?  1, 2, 4, 7, 11, ?","16"]
  ]);
  if(q === "Which one does NOT belong?"){
    if(options.includes("Cube")) return "Cube";
    if(options.includes("ROBOT")) return "ROBOT";
  }
  return map.get(q);
};

(async () => {
  if(server) await sleep(1200);
  const browser = await chromium.launch({headless:true});
  const host = await browser.newPage();
  const guest = await browser.newPage();

  try {
    await host.goto(base, {waitUntil:"networkidle", timeout:30000});
    await guest.goto(base, {waitUntil:"networkidle", timeout:30000});

    if(!((await host.title()) || "").includes("QUICKTRAP")) throw new Error("Live page is not QUICKTRAP: "+await host.title());

    await host.locator("#name").fill("HostBot");
    await host.getByRole("button",{name:"Create a room"}).click();
    const roomEl = host.locator(".room-code");
    await roomEl.waitFor({timeout:15000});
    const room = (await roomEl.textContent()).trim();
    if(!/^[A-Z2-9]{6}$/.test(room)) throw new Error("Bad room code: "+room);

    await guest.locator("#name").fill("GuestBot");
    await guest.locator("#room").fill(room);
    await guest.getByRole("button",{name:"Join room"}).click();

    await host.getByText("2 players ready").waitFor({timeout:20000});
    await guest.getByText("2 players ready").waitFor({timeout:20000});
    await host.getByRole("button",{name:"Start game"}).click();

    for(let round=1; round<=8; round++){
      const qEl = host.locator(".puzzle-question");
      await qEl.waitFor({timeout:10000});
      const q = (await qEl.textContent()).trim();
      const optionTexts = await host.locator(".answer-btn b").allTextContents();
      const correct = correctFor(q, optionTexts);
      if(!correct) throw new Error("No E2E answer mapping for: "+q+" options="+optionTexts.join("|"));

      const exact = text => new RegExp("^"+text.replace(/[.*+?^${}()|[\\]\\]/g,"\\const hostCorrect = host.locator(".answer-btn").filter({hasText:correct});")+"$");\n      const hostCorrect = host.locator(".answer-btn").filter({has:host.locator("b").filter({hasText:exact(correct)})});
      await hostCorrect.click({timeout:10000});

      await host.getByText("CORRECT — NOW SET THE TRAP.").waitFor({timeout:5000});
      const trapButton = host.locator(".trap-btn").first();
      const trapText = (await trapButton.locator("b").textContent()).trim();
      await trapButton.click();

      const guestWrong = guest.locator(".answer-btn").filter({has:guest.locator("b").filter({hasText:exact(trapText)})});
      await guestWrong.click({timeout:5000});

      await host.locator(".correct-answer").waitFor({timeout:10000});
      await guest.locator(".correct-answer").waitFor({timeout:10000});
      await guest.locator(".person-chip.caught").filter({hasText:"GuestBot"}).waitFor({timeout:5000});

      if(round===1 || round===8){
        await host.screenshot({path:"e2e-round-"+round+".png",fullPage:true});
      }

      await host.getByRole("button",{name:round===8 ? "See final results" : "Next puzzle"}).click();
    }

    await host.getByText("People you trapped").waitFor({timeout:10000});
    await guest.getByText("People you trapped").waitFor({timeout:10000});
    await host.screenshot({path:"e2e-final.png",fullPage:true});

    console.log("QUICKTRAP E2E PASS against "+base+": real PeerJS room, two isolated browsers, eight timed rounds, traps, penalties, synchronized final.");
  } finally {
    await browser.close();
    if(server) server.kill("SIGTERM");
  }
})().catch(err => {
  console.error(err);
  if(server) server.kill("SIGTERM");
  process.exit(1);
});