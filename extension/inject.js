// Create the UI elements
const div = document.createElement('div');
div.id = 'status-watch-popup';
div.innerHTML = `
  <div style="position: fixed; top: 20px; right: 20px; z-index: 999999; background: #F4EFE4; border: 2px solid #141210; padding: 20px; width: 300px; box-shadow: 8px 8px 0px #141210; font-family: sans-serif;">
    <div style="font-family: monospace; font-size: 10px; margin-bottom: 10px; color: #D93025;">● STATUSWATCH / ERROR DETECTED</div>
    <h1 style="font-family: 'Playfair Display', serif; font-size: 20px; margin: 0 0 10px 0;">Site is down.</h1>
    <p style="font-size: 12px; margin-bottom: 15px;">Want a ping when it's back?</p>
    <input type="email" id="sw-email" placeholder="email@example.com" style="width: 100%; padding: 8px; border: 1px solid #141210; margin-bottom: 10px;">
    <button id="sw-btn" style="width: 100%; background: #141210; color: #F4EFE4; border: none; padding: 10px; cursor: pointer; font-weight: bold;">NOTIFY ME</button>
    <button onclick="document.getElementById('status-watch-popup').remove()" style="background: none; border: none; font-size: 10px; cursor: pointer; margin-top: 10px; color: #9A9488; width: 100%;">Ignore</button>
  </div>
`;

document.body.appendChild(div);

// Add the logic to the injected button
document.getElementById('sw-btn').addEventListener('click', async () => {
  const email = document.getElementById('sw-email').value;
  const targetUrl = window.location.href;
  
  const btn = document.getElementById('sw-btn');
  btn.innerText = 'SENDING...';

  await fetch('https://status-watch-worker.pavan.workers.dev/track', {
    method: 'POST',
    body: JSON.stringify({ url: targetUrl, contact: email })
  });

  div.innerHTML = `<div style="position: fixed; top: 20px; right: 20px; z-index: 999999; background: #F4EFE4; border: 2px solid #141210; padding: 20px; width: 300px; box-shadow: 8px 8px 0px #141210; text-align: center;">
    <p>Watching. You can close this.</p>
    <button onclick="document.getElementById('status-watch-popup').remove()" style="background: #141210; color: white; border: none; padding: 5px 15px; margin-top: 10px;">Close</button>
  </div>`;
});