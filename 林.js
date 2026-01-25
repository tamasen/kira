// =====================
// Firebase
// =====================
const db = firebase.firestore();
const DEVELOPER_NAME = "たません";

// =====================
// Canvas
// =====================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let sw, sh;
function resize(){
  const dpr = window.devicePixelRatio || 1;
  sw = innerWidth;
  sh = innerHeight;
  canvas.width = sw * dpr;
  canvas.height = sh * dpr;
  canvas.style.width = sw + "px";
  canvas.style.height = sh + "px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
resize();
addEventListener("resize", resize);

// =====================
// Images
// =====================
const playerImg = new Image(); playerImg.src="player.png";
const enemyImg  = new Image(); enemyImg.src ="enemy.png";
const bossImg   = new Image(); bossImg.src  ="boss.png";

// =====================
// Constants
// =====================
const SIZE = 80;
const STATE = { TITLE:0, PLAY:1, GAMEOVER:2 };
const MODES = ["林","森（四面楚歌）","森（一騎当千）"];

// =====================
// Game state
// =====================
let gameState = STATE.TITLE;
let modeIndex = 0;

// =====================
// Objects
// =====================
const player = { x:0, y:0, speed:4 };
let enemies = [];

// =====================
// Score
// =====================
let startTime = 0;
let surviveTime = 0;
let level = 1;
let ranking = [];

// =====================
// Player name
// =====================
let playerName = localStorage.getItem("playerName") || "";

// =====================
// Input
// =====================
const keys = {};
let touching = false;
let tx=0, ty=0;

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
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hit=(a,b)=>(
  a.x<b.x+SIZE && a.x+SIZE>b.x &&
  a.y<b.y+SIZE && a.y+SIZE>b.y
);

// =====================
// Buttons（四角）
// =====================
const buttons={
  start:{w:220,h:60},
  mode :{w:220,h:60},
  name :{w:220,h:60}
};

function drawButton(b,x,y,text){
  b.x=x; b.y=y;
  ctx.fillStyle="#fff";
  ctx.fillRect(x,y,b.w,b.h);
  ctx.strokeStyle="#000";
  ctx.strokeRect(x,y,b.w,b.h);
  ctx.fillStyle="#000";
  ctx.textAlign="center";
  ctx.fillText(text,x+b.w/2,y+38);
}

const inside=(b,x,y)=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;

// =====================
// Click
// =====================
function handleClick(x,y){
  if(gameState===STATE.TITLE){
    if(inside(buttons.start,x,y)) startGame();
    if(inside(buttons.mode ,x,y)) modeIndex=(modeIndex+1)%MODES.length;
    if(inside(buttons.name ,x,y)) changeName();
  }else if(gameState===STATE.GAMEOVER){
    gameState=STATE.TITLE;
  }
}

// =====================
// Name change（重複禁止）
// =====================
async function changeName(){
  const name = prompt("名前を入力");
  if(!name) return;

  const snap = await db.collection("scores")
    .where("name","==",name).get();

  if(!snap.empty && name!==playerName){
    alert("その名前は使われています");
    return;
  }

  playerName = name;
  localStorage.setItem("playerName",name);
}

// =====================
// Start game
// =====================
function startGame(){
  gameState=STATE.PLAY;
  enemies=[];
  player.x=sw/2-SIZE/2;
  player.y=sh/2-SIZE/2;
  player.speed=4;
  level=1;
  startTime=performance.now();

  const m=MODES[modeIndex];
  if(m==="林"){
    enemies.push({x:100,y:100,base:2,img:enemyImg});
  }else if(m==="森（四面楚歌）"){
    enemies.push({x:100,y:100,base:2.5,img:enemyImg});
  }else{
    player.speed=6;
    level=999;
    enemies.push({x:100,y:100,base:0,img:bossImg});
  }
}

// =====================
// Update
// =====================
function updatePlayer(){
  if(keys.ArrowUp||keys.w) player.y-=player.speed;
  if(keys.ArrowDown||keys.s) player.y+=player.speed;
  if(keys.ArrowLeft||keys.a) player.x-=player.speed;
  if(keys.ArrowRight||keys.d) player.x+=player.speed;

  if(touching){
    const dx=tx-(player.x+SIZE/2);
    const dy=ty-(player.y+SIZE/2);
    const d=Math.hypot(dx,dy);
    if(d>1){
      player.x+=(dx/d)*player.speed;
      player.y+=(dy/d)*player.speed;
    }
  }

  player.x=clamp(player.x,0,sw-SIZE);
  player.y=clamp(player.y,0,sh-SIZE);
}

function update(){
  updatePlayer();
  surviveTime=Math.floor((performance.now()-startTime)/1000);

  if(MODES[modeIndex]==="林"){
    level=Math.floor(surviveTime/5)+1;
  }

  enemies.forEach(e=>{
    const dx=player.x-e.x;
    const dy=player.y-e.y;
    const d=Math.hypot(dx,dy)||1;

    let spd=e.base;
    if(MODES[modeIndex]==="林") spd=2+level*0.3;
    if(MODES[modeIndex]==="森（一騎当千）") spd=player.speed*0.9;

    e.x+=(dx/d)*spd;
    e.y+=(dy/d)*spd;

    if(hit(player,e)) gameOver();
  });
}

// =====================
// Game over
// =====================
async function gameOver(){
  gameState=STATE.GAMEOVER;
  if(!playerName) return;

  await db.collection("scores").add({
    name:playerName,
    score:surviveTime
  });

  const snap=await db.collection("scores")
    .orderBy("score","desc").limit(5).get();

  ranking=snap.docs.map(d=>d.data());
}

// =====================
// Draw
// =====================
function draw(){
  ctx.clearRect(0,0,sw,sh);
  ctx.font="20px sans-serif";

  if(gameState===STATE.TITLE){
    ctx.textAlign="center";
    ctx.fillText("林を作らないゲーム",sw/2,120);

    drawButton(buttons.start,sw/2-110,180,"START");
    drawButton(buttons.mode ,sw/2-110,260,`MODE: ${MODES[modeIndex]}`);
    drawButton(buttons.name ,sw/2-110,340,`NAME: ${playerName||"未設定"}`);
  }

  if(gameState===STATE.PLAY){
    ctx.drawImage(playerImg,player.x,player.y,SIZE,SIZE);
    enemies.forEach(e=>ctx.drawImage(e.img,e.x,e.y,SIZE,SIZE));
    ctx.fillText(`Time ${surviveTime}s`,20,30);
    ctx.fillText(`Level ${level}`,20,60);
  }

  if(gameState===STATE.GAMEOVER){
    ctx.textAlign="center";
    ctx.fillText("GAME OVER",sw/2,120);
    ranking.forEach((r,i)=>{
      ctx.fillStyle=r.name===DEVELOPER_NAME?"red":"black";
      const tag=r.name===DEVELOPER_NAME?" (開発者)":"";
      ctx.fillText(`${i+1}. ${r.name}${tag} : ${r.score}s`,
        sw/2,200+i*30);
    });
    ctx.fillStyle="#000";
    ctx.fillText("タップで戻る",sw/2,420);
  }
}

// =====================
// Loop
// =====================
function loop(){
  if(gameState===STATE.PLAY) update();
  draw();
  requestAnimationFrame(loop);
}
loop();
