const { chromium, webkit, devices } = require("playwright");
const { spawn } = require("child_process");
const server=spawn("python3",["-m","http.server","8000","--bind","127.0.0.1"],{stdio:"inherit"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await sleep(1000);
  const cb=await chromium.launch({headless:true});
  const wb=await webkit.launch({headless:true});
  const host=await cb.newPage({viewport:{width:1280,height:850}});
  const iosCtx=await wb.newContext({...devices["iPhone 13"]});
  const iphone=await iosCtx.newPage();
  try{
    const base="http://127.0.0.1:8000/";
    await Promise.all([host.goto(base),iphone.goto(base)]);
    await host.locator("#name").fill("Host");
    await host.getByRole("button",{name:/create a room/i}).click();
    await host.locator(".room-code").waitFor({timeout:15000});
    const room=(await host.locator(".room-code").textContent()).trim();
    await iphone.locator("#name").fill("iPhone");
    await iphone.locator("#room").fill(room);
    await iphone.getByRole("button",{name:/join room/i}).click();
    await host.locator(".arcade-player-card").nth(1).waitFor({timeout:25000});
    await iphone.locator(".arcade-player-card").nth(1).waitFor({timeout:25000});

    // Popup X must be a real close control.
    await iphone.getByRole("button",{name:/how to play/i}).click();
    await iphone.getByRole("dialog").waitFor();
    await iphone.getByRole("button",{name:"Close"}).click();
    await iphone.getByRole("dialog").waitFor({state:"detached"});

    await iphone.screenshot({path:"misspick-iphone-lobby.png",fullPage:true});
    console.log("MISSPICK iPhone WebKit smoke PASS: iPhone joined room and modal close button works.");
  } finally {
    await iosCtx.close();await wb.close();await cb.close();server.kill("SIGTERM");
  }
})().catch(err=>{console.error(err);server.kill("SIGTERM");process.exit(1);});