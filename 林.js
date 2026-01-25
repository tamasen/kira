// =====================
// Firebase
// =====================
const db = window.db;
const DEVELOPER_NAME = "たません";

// =====================
// Canvas
// =====================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W,H;
function resize(){
  const dpr = window.devicePixelRatio || 1;
  W = innerWidth;
  H = innerHeight;
  canvas.width = W*dpr;
  canvas.height = H*dpr;
  canvas.style.width = W+"px";
  canvas.style.height = H+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
resize();
addEventListener("resize",resize);

// =====================
// Images
// =====================
const imgs = {};
["player","enemy","boss","item_speed"].forEach(n=>{
  const i = new Image();
  i.src = `${n}.png`;
  imgs[n]=i;
});

// =====================
// State / Mode
// =====================
const STATE={TITLE:0,PLAY:1,GAMEOVER:2};
let state=STATE.TITLE;

const MODES=["林","森（四面楚歌）","森（一騎当千）"];
let modeIndex=0;

// =====================
// Player / Enemy
// =====================
const SIZE=80;
const player={x:0,y:0,speed:4};
let enemies=[];

// =====================
// Score
// =====================
let startTime=0;
let survive=0;
let level=1;
let ranking=[];

// =====================
// Name
// =====================
let playerName=localStorage.getItem("playerName")||"";

// =====================
// Input
// =====================
const keys={};
let touching=false,tx=0,ty=0;

addEventListener("keydown",e=>keys[e.key]=true);
addEventListener("keyup",e=>keys[e.key]=false);

canvas.addEventListener("click",e=>handleClick(e.clientX,e.clientY));
canvas.addEventListener("touchstart",e=>{
  e.preventDefault();
  touching=true;
  tx=e.touches[0].clientX;
  ty=e.touches[0].clientY;
},{passive:false});
canvas.addEventListener("touchmove",e=>{
  e.preventDefault();
  if(!touching)return;
  tx=e.touches[0].clientX;
  ty=e.touches[0].clientY;
},{passive:false});
canvas.addEventListener("touchend",()=>touching=false);

// =====================
// Utils
// =====================
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const hit=(a,b)=>(
  a.x<b.x+SIZE && a.x+SIZE>b.x &&
  a.y<b.y+SIZE && a.y+SIZE>b.y
);

// =====================
// Buttons
// =====================
const btns={
  start:{w:220,h:60},
  mode:{w:220,h:60},
  name:{w:220,h:60}
};

function layoutButtons(){
  const cx=W/2-110;
  btns.start.x=cx; btns.start.y=180;
  btns.mode.x =cx; btns.mode.y =260;
  btns.name.x =cx; btns.name.y =340;
}

function drawBtn(b,t){
  ctx.fillStyle="#fff";
  ctx.fillRect(b.x,b.y,b.w,b.h);
  ctx.strokeStyle="#000";
  ctx.strokeRect(b.x,b.y,b.w,b.h);
  ctx.fillStyle="#000";
  ctx.textAlign="center";
  ctx.fillText(t,b.x+b.w/2,b.y+38);
}

const inside=(b,x,y)=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;

// =====================
// Click
// =====================
function handleClick(x,y){
  if(state===STATE.TITLE){
    if(inside(btns.start,x,y)) startGame();
    if(inside(btns.mode,x,y)) modeIndex=(modeIndex+1)%MODES.length;
    if(inside(btns.name,x,y)) changeName();
  }else if(state===STATE.GAMEOVER){
    state=STATE.TITLE;
  }
}

// =====================
// Name Change
// =====================
async function changeName(){
  const n=prompt("名前を入力");
  if(!n)return;

  const snap=await db.collection("scores").where("name","==",n).get();
  if(!snap.empty && n!==playerName){
    alert("その名前は使われています");
    return;
  }
  playerName=n;
  localStorage.setItem("playerName",n);
}

// =====================
// Start Game
// =====================
function startGame(){
  state=STATE.PLAY;
  enemies=[];
  player.x=W/2-SIZE/2;
  player.y=H/2-SIZE/2;
  player.speed=4;
  level=1;
  startTime=performance.now();

  const m=MODES[modeIndex];
  if(m==="林"){
    enemies.push({x:0,y:0,speed:2,img:imgs.enemy});
  }else if(m==="森（四面楚歌）"){
    for(let i=0;i<4;i++)
      enemies.push({x:Math.random()*W,y:Math.random()*H,speed:2.5,img:imgs.enemy});
  }else{
    player.speed=6;
    level=999;
    enemies.push({x:0,y:0,speed:player.speed*0.9,img:imgs.boss});
  }
}

// =====================
// Update
// =====================
function update(){
  // player move
  if(keys.ArrowUp||keys.w)player.y-=player.speed;
  if(keys.ArrowDown||keys.s)player.y+=player.speed;
  if(keys.ArrowLeft||keys.a)player.x-=player.speed;
  if(keys.ArrowRight||keys.d)player.x+=player.speed;

  if(touching){
    const dx=tx-(player.x+SIZE/2);
    const dy=ty-(player.y+SIZE/2);
    const d=Math.hypot(dx,dy);
    if(d>1){
      player.x+=dx/d*player.speed;
      player.y+=dy/d*player.speed;
    }
  }

  player.x=clamp(player.x,0,W-SIZE);
  player.y=clamp(player.y,0,H-SIZE);

  survive=Math.floor((performance.now()-startTime)/1000);

  if(MODES[modeIndex]==="林"){
    level=Math.floor(survive/5)+1;
    enemies[0].speed=2+level*0.3;
  }

  enemies.forEach(e=>{
    const dx=player.x-e.x;
    const dy=player.y-e.y;
    const d=Math.hypot(dx,dy)||1;
    const spd=MODES[modeIndex]==="森（一騎当千）"
      ? player.speed*0.9 : e.speed;
    e.x+=dx/d*spd;
    e.y+=dy/d*spd;
    if(hit(player,e)) gameOver();
  });
}

// =====================
// Game Over
// =====================
async function gameOver(){
  state=STATE.GAMEOVER;
  if(!playerName)return;

  await db.collection("scores").add({name:playerName,score:survive});
  const snap=await db.collection("scores")
    .orderBy("score","desc").limit(5).get();
  ranking=snap.docs.map(d=>d.data());
}

// =====================
// Draw
// =====================
function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.font="20px sans-serif";

  if(state===STATE.TITLE){
    ctx.textAlign="center";
    ctx.fillText("林を作らないゲーム",W/2,120);
    layoutButtons();
    drawBtn(btns.start,"START");
    drawBtn(btns.mode,`MODE: ${MODES[modeIndex]}`);
    drawBtn(btns.name,`NAME: ${playerName||"未設定"}`);
  }

  if(state===STATE.PLAY){
    ctx.drawImage(imgs.player,player.x,player.y,SIZE,SIZE);
    enemies.forEach(e=>ctx.drawImage(e.img,e.x,e.y,SIZE,SIZE));
    ctx.fillText(`Time ${survive}s`,20,30);
    ctx.fillText(`Level ${level}`,20,60);
  }

  if(state===STATE.GAMEOVER){
    ctx.textAlign="center";
    ctx.fillText("GAME OVER",W/2,120);
    ranking.forEach((r,i)=>{
      ctx.fillStyle=r.name===DEVELOPER_NAME?"red":"black";
      const tag=r.name===DEVELOPER_NAME?" (開発者)":"";
      ctx.fillText(`${i+1}. ${r.name}${tag} : ${r.score}s`,
        W/2,200+i*30);
    });
    ctx.fillStyle="#000";
    ctx.fillText("タップで戻る",W/2,420);
  }
}

// =====================
// Loop
// =====================
(function loop(){
  if(state===STATE.PLAY)update();
  draw();
  requestAnimationFrame(loop);
})();
