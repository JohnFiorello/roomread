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
      await page.locator("#answer").waitFor({timeout:10000});
      await page.locator("#answer").fill(text);
      await page.getByRole("button",{name:/lock answer/i}).click();
    }
    async function ready(page){
      await page.getByRole("button",{name:/i.m ready|see final scores/i}).click();
    }

    // Round 1: Host spotlight.
    await Promise.all([submit(host,"Coffee"),submit(iphone,"Tea"),submit(third,"Juice")]);
    await iphone.getByText(/which one is real/i).waitFor({timeout:10000});
    await iphone.getByRole("button",{name:/Coffee/}).click();
    await third.getByRole("button",{name:/Tea/}).click();
    await host.locator(".reveal-answer").waitFor({timeout:10000});
    await iphone.getByText(/Coffee/).first().waitFor();
    await Promise.all([ready(host),ready(iphone),ready(third)]);

    // Round 2: Ivy spotlight.
    await Promise.all([submit(host,"Beach"),submit(iphone,"Mountains"),submit(third,"City")]);
    await host.getByRole("button",{name:/Mountains/}).click();
    await third.getByRole("button",{name:/Beach/}).click();
    await iphone.locator(".reveal-answer").waitFor({timeout:10000});
    await Promise.all([ready(host),ready(iphone),ready(third)]);

    // Round 3: Sam spotlight.
    await Promise.all([submit(host,"Pizza"),submit(iphone,"Tacos"),submit(third,"Sushi")]);
    await host.getByRole("button",{name:/Sushi/}).click();
    await iphone.getByRole("button",{name:/Pizza/}).click();
    await third.locator(".reveal-answer").waitFor({timeout:10000});
    await Promise.all([ready(host),ready(iphone),ready(third)]);

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