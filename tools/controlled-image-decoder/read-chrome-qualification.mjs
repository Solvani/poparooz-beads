const endpoint = process.argv[2] ?? "http://127.0.0.1:9222";
const deadline = Date.now() + 20_000;
let target;
while (Date.now() < deadline) {
  try {
    const targets = await (await fetch(`${endpoint}/json`)).json();
    target = targets.find(
      (candidate) =>
        candidate.type === "page" &&
        candidate.url.includes("decoder-qualification.html"),
    );
    if (target) break;
  } catch {
    // Chrome may still be starting.
  }
  await delay(200);
}
if (!target) throw new Error("Chrome DevTools target was unavailable");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const resolve = pending.get(message.id);
  if (resolve) {
    pending.delete(message.id);
    resolve(message);
  }
});

while (Date.now() < deadline) {
  const response = await send("Runtime.evaluate", {
    expression:
      "JSON.stringify({status: document.body.dataset.qualification, text: document.body.textContent})",
    returnByValue: true,
  });
  const value = response.result?.result?.value;
  if (typeof value !== "string") {
    await delay(200);
    continue;
  }
  const state = JSON.parse(value);
  if (state.status === "PASS" || state.status === "FAIL") {
    console.log(state.text);
    socket.close();
    process.exit(state.status === "PASS" ? 0 : 1);
  }
  await delay(200);
}
socket.close();
throw new Error("Browser qualification did not finish before the deadline");

function send(method, params) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve) => pending.set(id, resolve));
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
