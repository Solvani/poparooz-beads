export interface AnonymousReviewPacket {
  readonly packetId: string;
  readonly leftImageDataUrl: string;
  readonly rightImageDataUrl: string;
}

export interface BlindReviewToolInput {
  readonly packetSetId: string;
  readonly packetSetSha256: string;
  readonly packets: readonly AnonymousReviewPacket[];
}

export function renderBlindReviewHtml(input: BlindReviewToolInput): string {
  if (input.packets.length < 40 || input.packets.length > 80) {
    throw new Error("Blind review requires 40 to 80 packets.");
  }
  const payload = JSON.stringify(input).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Poparooz Pattern Review</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background:#f5f3ee; color:#231f20; }
    * { box-sizing:border-box; }
    body { margin:0; }
    main { width:min(1120px,100%); margin:0 auto; padding:24px; }
    .card { background:#fff; border:1px solid #ded9d0; border-radius:16px; padding:24px; box-shadow:0 8px 28px #2a21140d; }
    h1 { margin-top:0; font-size:clamp(1.55rem,3vw,2.2rem); }
    p, li { line-height:1.55; }
    .muted { color:#655f58; }
    .hidden { display:none !important; }
    label { font-weight:650; }
    input[type=text] { display:block; width:min(420px,100%); margin:8px 0 18px; padding:12px; border:1px solid #9d968e; border-radius:9px; font:inherit; }
    button { border:1px solid #3d3732; background:#fff; color:#231f20; border-radius:9px; padding:11px 16px; font:inherit; font-weight:650; cursor:pointer; }
    button.primary { background:#231f20; color:#fff; }
    button:disabled { opacity:.45; cursor:not-allowed; }
    button:focus-visible, input:focus-visible { outline:3px solid #d36a39; outline-offset:3px; }
    .topline { display:flex; justify-content:space-between; gap:16px; align-items:center; flex-wrap:wrap; }
    progress { width:min(420px,100%); height:14px; }
    .patterns { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin:22px 0; }
    .pattern { text-align:center; }
    .pattern h2 { margin:0 0 8px; }
    .pattern img { display:block; width:100%; max-height:58vh; object-fit:contain; image-rendering:pixelated; border:1px solid #c9c4bc; background:#555; border-radius:10px; }
    fieldset { border:0; padding:0; margin:0; }
    legend { font-weight:750; margin-bottom:10px; }
    .choices { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:9px; }
    .choice { position:relative; }
    .choice input { position:absolute; opacity:0; }
    .choice label { display:block; height:100%; padding:12px; border:1px solid #aaa39a; border-radius:9px; cursor:pointer; text-align:center; }
    .choice input:checked + label { background:#f5d8c9; border-color:#8c3e1e; box-shadow:0 0 0 2px #8c3e1e; }
    .choice input:focus-visible + label { outline:3px solid #d36a39; outline-offset:2px; }
    .actions { display:flex; justify-content:space-between; gap:12px; margin-top:20px; }
    .complete { text-align:center; }
    @media (max-width:720px) { main{padding:12px}.card{padding:16px}.patterns{gap:8px}.choices{grid-template-columns:1fr 1fr}.pattern img{max-height:42vh} }
  </style>
</head>
<body>
<main>
  <section id="intro" class="card">
    <h1>Poparooz Pattern Review</h1>
    <p>Compare two fuse-bead patterns and choose the one that looks better as a usable pattern.</p>
    <ul>
      <li>Consider overall resemblance, important details, clean edges, and coherent bead regions.</li>
      <li>Prefer color changes only when they add useful visual information.</li>
      <li>Penalize distracting fragmentation or speckled color noise.</li>
      <li>Do not consider price, package size, inventory, or assume either side should be better.</li>
    </ul>
    <p class="muted">Your progress is saved only in this browser. Complete this review independently and do not discuss answers with another reviewer.</p>
    <label for="reviewer-id">Reviewer ID</label>
    <input id="reviewer-id" type="text" maxlength="40" autocomplete="off" placeholder="reviewer-1">
    <button id="start" class="primary">Start review</button>
  </section>
  <section id="review" class="card hidden" aria-live="polite">
    <div class="topline"><strong id="progress-text"></strong><progress id="progress" max="100"></progress></div>
    <p><strong>Which pattern looks better as a usable fuse-bead pattern?</strong></p>
    <div class="patterns">
      <div class="pattern"><h2>Pattern A</h2><img id="image-a" alt="Anonymous fuse-bead Pattern A"></div>
      <div class="pattern"><h2>Pattern B</h2><img id="image-b" alt="Anonymous fuse-bead Pattern B"></div>
    </div>
    <fieldset><legend>Choose one answer</legend><div id="choices" class="choices"></div></fieldset>
    <div class="actions"><button id="back">Back</button><button id="next" class="primary">Next</button></div>
  </section>
  <section id="finish" class="card complete hidden">
    <h1>Review complete</h1>
    <p id="finish-copy">Check that every comparison has an answer, then lock this session.</p>
    <button id="lock" class="primary">Finish and lock answers</button>
    <button id="download" class="primary hidden">Download reviewer result</button>
    <p id="hash" class="muted"></p>
  </section>
</main>
<script>
"use strict";
const tool=${payload};
const choices=[
  ["a_clearly_better","A clearly better","1"],
  ["a_slightly_better","A slightly better","2"],
  ["no_meaningful_difference","No meaningful difference","3"],
  ["b_slightly_better","B slightly better","4"],
  ["b_clearly_better","B clearly better","5"],
  ["cannot_judge","Cannot judge","6"]
];
let session=null;
let current=0;
const byId=(id)=>document.getElementById(id);
const storagePrefix="poparooz-d04-a02:"+tool.packetSetSha256+":";
choices.forEach(([value,label,key])=>{
  const wrapper=document.createElement("div"); wrapper.className="choice";
  const input=document.createElement("input"); input.type="radio"; input.name="choice"; input.id="choice-"+value; input.value=value;
  input.addEventListener("change",()=>saveAnswer(value));
  const text=document.createElement("label"); text.htmlFor=input.id; text.textContent=label+" ("+key+")";
  wrapper.append(input,text); byId("choices").append(wrapper);
});
byId("start").addEventListener("click",start);
byId("back").addEventListener("click",()=>move(-1));
byId("next").addEventListener("click",()=>move(1));
byId("lock").addEventListener("click",lockSession);
byId("download").addEventListener("click",downloadResult);
document.addEventListener("keydown",(event)=>{
  if(byId("review").classList.contains("hidden")) return;
  const selected=choices[Number(event.key)-1];
  if(selected){event.preventDefault(); const input=byId("choice-"+selected[0]); input.checked=true; saveAnswer(selected[0]);}
  else if(event.key==="ArrowLeft"){event.preventDefault();move(-1);}
  else if(event.key==="ArrowRight"&&!byId("next").disabled){event.preventDefault();move(1);}
});
function start(){
  const reviewerId=byId("reviewer-id").value.trim();
  if(!/^[A-Za-z0-9_-]{3,40}$/.test(reviewerId)){alert("Use a 3–40 character reviewer ID with letters, numbers, hyphens, or underscores.");return;}
  const key=storagePrefix+reviewerId;
  const saved=localStorage.getItem(key);
  session=saved?JSON.parse(saved):{schemaVersion:1,stage:"P3-A03-E05-D04-A02",packetSetId:tool.packetSetId,packetSetSha256:tool.packetSetSha256,reviewerId,sessionId:crypto.randomUUID(),startedAt:new Date().toISOString(),completedAt:null,locked:false,responses:[]};
  byId("intro").classList.add("hidden");
  current=Math.min(session.responses.length,tool.packets.length-1);
  if(session.locked) showFinish(); else {byId("review").classList.remove("hidden");render();}
}
function saveAnswer(choice){
  if(!session||session.locked)return;
  const packetId=tool.packets[current].packetId;
  const existing=session.responses.find((item)=>item.packetId===packetId);
  if(existing){existing.choice=choice;existing.answeredAt=new Date().toISOString();}
  else session.responses.push({packetId,choice,answeredAt:new Date().toISOString()});
  persist(); byId("next").disabled=false;
}
function move(delta){
  if(!session||session.locked)return;
  if(delta>0&&byId("next").disabled)return;
  if(delta>0&&current===tool.packets.length-1){byId("review").classList.add("hidden");byId("finish").classList.remove("hidden");return;}
  current=Math.max(0,Math.min(tool.packets.length-1,current+delta));render();
}
function render(){
  const packet=tool.packets[current];
  byId("image-a").src=packet.leftImageDataUrl; byId("image-b").src=packet.rightImageDataUrl;
  byId("progress-text").textContent="Comparison "+(current+1)+" of "+tool.packets.length;
  byId("progress").value=((current+1)/tool.packets.length)*100;
  byId("back").disabled=current===0;
  const response=session.responses.find((item)=>item.packetId===packet.packetId);
  document.querySelectorAll('input[name="choice"]').forEach((input)=>{input.checked=response?.choice===input.value;input.disabled=session.locked;});
  byId("next").disabled=!response;
  byId("next").textContent=current===tool.packets.length-1?"Review completion":"Next";
}
function persist(){localStorage.setItem(storagePrefix+session.reviewerId,JSON.stringify(session));}
function showFinish(){byId("intro").classList.add("hidden");byId("review").classList.add("hidden");byId("finish").classList.remove("hidden");if(session.locked){byId("lock").classList.add("hidden");byId("download").classList.remove("hidden");byId("finish-copy").textContent="This session is locked. Download the result file and return it without editing.";renderHash();}}
async function lockSession(){
  if(session.responses.length!==tool.packets.length){alert("Every comparison needs an answer before locking.");return;}
  session.responses.sort((a,b)=>a.packetId.localeCompare(b.packetId)); session.completedAt=new Date().toISOString(); session.locked=true; persist(); showFinish();
}
async function resultRecord(){const payload=JSON.parse(JSON.stringify(session));const canonical=canonicalJson(payload);const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonical));return {...payload,resultSha256:[...new Uint8Array(digest)].map((byte)=>byte.toString(16).padStart(2,"0")).join("")};}
async function renderHash(){const result=await resultRecord();byId("hash").textContent="Result SHA-256: "+result.resultSha256;}
async function downloadResult(){const result=await resultRecord();const blob=new Blob([JSON.stringify(result,null,2)+"\\n"],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="poparooz-a02-"+session.reviewerId+"-"+session.sessionId+".json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function canonicalJson(value){if(Array.isArray(value))return"["+value.map(canonicalJson).join(",")+"]";if(value&&typeof value==="object")return"{"+Object.keys(value).sort().map((key)=>JSON.stringify(key)+":"+canonicalJson(value[key])).join(",")+"}";return JSON.stringify(value);}
</script>
</body>
</html>
`;
}
