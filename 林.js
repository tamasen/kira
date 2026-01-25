// ===== Canvas Game 完全版（PC・スマホ完全対応） =====
// ・スマホで確実にSTART可能
// ・タップ／クリック共通
// ・指追従操作
// ・画面サイズ自動調整
// ・STATE安全ガード付き

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ---------- 画面サイズ ----------
function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// ---------- STATE ----------
const STATE = { TITLE:0, PLAY:1, OVER:2 };
let state = STATE.TITLE;

// ---------- プレイヤー ----------
let px = 0, py = 0;
let speed = 5;

// ---------- タッチ操作 ----------
let touching = false;
let tx = 0, ty = 0;

// ---------- マウス ----------
canvas.addEventListener("mousedown", e=>{
  if(state !== STATE.PLAY) click(e.clientX, e.clientY);
  touching = true;
  tx = e.clientX;
  ty = e.clientY;
});
canvas.addEventListener("mousemove", e=>{
  if(touching){
    tx = e.clientX;
    ty = e.clientY;
  }
});
window.addEventListener("mouseup", ()=> touching=false);

// ---------- タッチ ----------
canvas.addEventListener("touchstart", e=>{
  e.preventDefault();
  const t = e.touches[0];
  const x = t.clientX;
  const y = t.clientY;

  if(state !== STATE.PLAY) click(x, y);

  touching = true;
  tx = x;
  ty = y;
},{passive:false});

canvas.addEventListener("touchmove", e=>{
  e.preventDefault();
  if(!touching) return;
  const t = e.touches[0];
  tx = t.clientX;
  ty = t.clientY;
},{passive:false});

canvas.addEventListener("touchend", ()=> touching=false);

// ---------- クリック判定 ----------
function click(x,y){
  if(state === STATE.TITLE){
    state = STATE.PLAY;
    px = canvas.width/2;
    py = canvas.height/2;
  }else if(state === STATE.OVER){
    state = STATE.TITLE;
  }
}

// ---------- 更新 ----------
function update(){
  if(state === STATE.PLAY && touching){
    const dx = tx - px;
    const dy = ty - py;
    const d = Math.hypot(dx, dy);
    if(d > 1){
      px += dx/d * speed;
      py += dy/d * speed;
    }
  }
}

// ---------- 描画 ----------
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(state === STATE.TITLE){
    ctx.fillStyle="#000";
    ctx.font="bold 40px sans-serif";
    ctx.textAlign="center";
    ctx.fillText("TAP TO START", canvas.width/2, canvas.height/2);
  }

  if(state === STATE.PLAY){
    ctx.fillStyle="blue";
    ctx.beginPath();
    ctx.arc(px, py, 20, 0, Math.PI*2);
    ctx.fill();
  }

  if(state === STATE.OVER){
    ctx.fillStyle="#000";
    ctx.font="bold 40px sans-serif";
    ctx.textAlign="center";
    ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
  }
}

// ---------- ループ ----------
function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
