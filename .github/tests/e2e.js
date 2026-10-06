
const { chromium } = require("playwright");
const { spawn } = require("child_process");

const server = spawn("python3", ["-m","http.server","8000","--bind","127.0.0.1"], {stdio:"inherit"});
const sleep = ms => new Promise(r => setTimeout(r,ms));

(async () => {
  await sleep(1200);
  const browser = await chromium.launch({headless:true});
  const host = await browser.newPage();
  const guest = await browser.newPage();
  const base = "http://127.0.0.1:8000/";

  try {
    await host.goto(base, {waitUntil:"networkidle"});
    await guest.goto(base, {waitUntil:"networkidle"});

    await host.locator("#name").fill("HostBot");
    await host.getByRole("button",{name:"Create a room"}).click();
    const roomEl = host.locator(".room-code");
    await roomEl.waitFor({timeout:15000});
    const room = (await roomEl.textContent()).trim();
    if(!/^[A-Z2-9]{6}$/.test(room)) throw new Error("Bad room code: "+room);

    await guest.locator("#name").fill("GuestBot");
    await guest.locator("#room").fill(room);
    await guest.getByRole("button",{name:"Join room"}).click();

    await host.getByText("2 players in the room").waitFor({timeout:20000});
    await guest.getByText("2 players in the room").waitFor({timeout:20000});

    await host.getByRole("button",{name:"Start game"}).click();

    for(let round=1; round<=5; round++){
      await host.getByText("Your secret motive").waitFor({timeout:10000});
      await guest.getByText("Your secret motive").waitFor({timeout:10000});

      await host.locator(".signal-btn.pull").first().click();
      await guest.locator(".signal-btn.push").nth(1).click();

      await host.getByText("Signals are public. Moves are not.").waitFor({timeout:15000});
      await guest.getByText("Signals are public. Moves are not.").waitFor({timeout:15000});

      await host.locator(".choice-btn").first().click();
      await guest.locator(".choice-btn").nth(1).click();

      await host.getByText("Round "+round+" reveal").waitFor({timeout:15000});
      await guest.getByText("Round "+round+" reveal").waitFor({timeout:15000});

      await host.screenshot({path:"e2e-round-"+round+".png",fullPage:true});
      await host.getByRole("button",{name:round===5 ? "See final results" : "Next round"}).click();
    }

    await host.getByText("Average room scatter").waitFor({timeout:10000});
    await guest.getByText("Average room scatter").waitFor({timeout:10000});
    await host.screenshot({path:"e2e-final.png",fullPage:true});

    console.log("ODD MOTIVES E2E PASS: real PeerJS room, two isolated browser pages, five rounds, synchronized final.");
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }
})().catch(err => {
  console.error(err);
  server.kill("SIGTERM");
  process.exit(1);
});
