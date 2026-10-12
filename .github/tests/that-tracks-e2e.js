const { chromium, devices } = require("playwright");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await sleep(2500);
  const cb=await chromium.launch({headless:true});
  const hostCtx=await cb.newContext({viewport:{width:1280,height:850}});
  const mobileCtx=await cb.newContext({...devices["iPhone 13"]});
  const thirdCtx=await cb.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const host=await hostCtx.newPage();
  const iphone=await mobileCtx.newPage();
  const third=await thirdCtx.newPage();

  const base="https://johnfiorello.github.io/roomread/next/?e2e="+encodeURIComponent(process.env.GITHUB_SHA||"test");
  try{
    await Promise.all([host.goto(base),iphone.goto(base),third.goto(base)]);
    if(!((await host.title()).includes("THAT TRACKS"))) throw new Error("Wrong game loaded");

    await host.locator("#name").fill("Host");
    await host.getByRole("button",{name:/create a room/i}).click();
    await host.locator(".room-code").waitFor({timeout:15000});
    const room=(await host.locator(".room-code").textContent()).trim();

    await iphone.locator("#name").fill("Ivy");
    await iphone.locator("#room").fill(room);
    await iphone.getByRole("button",{name:/join room/i}).click();
    await host.getByText(/2 players in the room/i).waitFor({timeout:25000});

    await third.locator("#name").fill("Sam");
    await third.locator("#room").fill(room);
    await third.getByRole("button",{name:/join room/i}).click();

    await host.getByText(/3 players in the room/i).waitFor({timeout:25000});
    await iphone.getByText(/3 players in the room/i).waitFor({timeout:25000});
    await third.getByText(/3 players in the room/i).waitFor({timeout:25000});

    // Instructions X must close on iPhone-sized WebKit.
    await iphone.getByRole("button",{name:/how to play/i}).click();
    await iphone.getByRole("dialog").waitFor();
    await iphone.getByRole("button",{name:"Close"}).click();
    await iphone.getByRole("dialog").waitFor({state:"detached"});

    await host.getByRole("button",{name:/start game/i}).click();

    async function submit(page,text){
      await page.locator("#answer").waitFor({timeout:15000});
      await page.locator("#answer").fill(text);
      await page.getByRole("button",{name:/lock answer/i}).click();
      await page.locator("#answer").waitFor({state:"detached",timeout:10000});
    }
    async function ready(page){
      const b=page.getByRole("button",{name:/i.m ready|see final scores/i});
      await b.waitFor({timeout:10000});
      await b.click();
    }
    async function voteFor(page,text){
      await page.locator(".choice-list").waitFor({timeout:15000});
      const b=page.locator(".choice").filter({hasText:text});
      await b.waitFor({timeout:10000});
      await b.click();
    }

    // Round 1: Host spotlight.
    await submit(host,"Coffee");
    await submit(iphone,"Tea");
    await submit(third,"Juice");
    await iphone.getByText(/which one is real/i).waitFor({timeout:10000});
    await voteFor(iphone,"Coffee");
    await voteFor(third,"Tea");
    await host.locator(".reveal-answer").waitFor({timeout:10000});
    await iphone.getByText(/Coffee/).first().waitFor();
    await ready(host); await ready(iphone); await ready(third);

    // Round 2: Ivy spotlight.
    await submit(host,"Beach");
    await submit(iphone,"Mountains");
    await submit(third,"City");
    await voteFor(host,"Mountains");
    await voteFor(third,"Beach");
    await iphone.locator(".reveal-answer").waitFor({timeout:10000});
    await ready(host); await ready(iphone); await ready(third);

    // Round 3: Sam spotlight.
    await submit(host,"Pizza");
    await submit(iphone,"Tacos");
    await submit(third,"Sushi");
    await voteFor(host,"Sushi");
    await voteFor(iphone,"Pizza");
    await third.locator(".reveal-answer").waitFor({timeout:10000});
    await ready(host); await ready(iphone); await ready(third);

    await host.getByText(/GAME OVER/i).waitFor({timeout:10000});
    await iphone.getByText(/GAME OVER/i).waitFor({timeout:10000});
    await third.getByText(/GAME OVER/i).waitFor({timeout:10000});

    await host.screenshot({path:"that-tracks-final.png",fullPage:true});
    await iphone.screenshot({path:"that-tracks-iphone.png",fullPage:true});
    console.log("THAT TRACKS E2E PASS: three isolated browser players including phone layout, three complete no-timer rounds.");
  } finally {
    await hostCtx.close();
    await mobileCtx.close();
    await thirdCtx.close();
    await cb.close();
  }
})().catch(err=>{
  console.error(err);
  process.exit(1);
});