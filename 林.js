// =========================
// Firebase
// =========================
const db = window.db;
const DEVELOPER_NAME = "たません";

// =========================
// Canvas
// =========================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W,H,DPR;
function resize(){
  DPR = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W*DPR;
  canvas.height = H*DPR;
  canvas.style.width = W+"px";
  canvas.style.height = H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
resize();
window.addEventListener("resize",resize);

// =========================
// Images
// =========================
const img = {
  player: new Image(),
  enemy: new Image(),
  boss: new Image(),
  item: new Image()
};
img.player.src="player.png";
img.enemy.src ="enemy.png";
img.boss.src  ="boss.png";
img.item.src  ="item_speed.png";

// =========================
// State / Mode
// =========================
const STATE={TITLE:0,PLAY:1,OVER:2};
let state=STATE.TITLE;

const MODES=["林","森（四面楚歌）","森（一騎当千）"];
let modeIndex=0;

// =========================
// Player / Objects
// =========================
const player={x:0,y:0,size:80,speed:4};
let enemies=[];
let items=[];

// =========================
// Time / Score
// =========================
let startTime=0;
let survive=0;
let level=1;
let ranking=[];

// =========================
// Name
// =========================
let playerName=localStorage.getItem("playerName")||"";

// =========================
// Input
// =========================
const keys={};
let touching=false,tx=0,ty=0;

addEventListener("keydown",e=>keys[e.key]=true);
addEventListener("keyup",e=>keys[e.key]=false);

canvas.addEventListener("click",e=>click(e.clientX,e.clientY));
canvas.addEventListener("touchstart",e=>{
  e.preventDefault();

  const t = e.touches[0];
  const x = t.clientX;
  const y = t.clientY;

  // ★ ボタン判定も実行
  click(x, y);

  touching = true;
  tx = x;
  ty = y;
},{passive:false});

canvas.addEventListener("touchend",()=>touching=false);

// =========================
// Utils
// =========================
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const hit=(a,b)=>(
  a.x<a.size+b.x&&a.x+a.size>b.x&&
  a.y<a.size+b.y&&a.y+a.size>b.y
);

// =========================
// Buttons
// =========================
const BTN={w:240,h:60};
const btns={
  start:{},mode:{},name:{}
};

function layoutButtons(){
  const cx=W/2-BTN.w/2;
  btns.start={x:cx,y:200,w:BTN.w,h:BTN.h};
  btns.mode ={x:cx,y:280,w:BTN.w,h:BTN.h};
  btns.name ={x:cx,y:360,w:BTN.w,h:BTN.h};
}
layoutButtons();

function drawBtn(b,t){
  ctx.strokeRect(b.x,b.y,b.w,b.h);
  ctx.textAlign="center";
  ctx.fillText(t,b.x+b.w/2,b.y+38);
}
const inside=(b,x,y)=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;

// =========================
// Click
// =========================
function click(x,y){
  if(state===STATE.TITLE){
    if(inside(btns.start,x,y)) start();
    if(inside(btns.mode ,x,y)) modeIndex=(modeIndex+1)%3;
    if(inside(btns.name ,x,y)) changeName();
  }else if(state===STATE.OVER){
    state=STATE.TITLE;
  }
}

// =========================
// Name Change
// =========================
async function changeName(){
  const n=prompt("名前を入力");
  if(!n)return;
  const snap=await db.collection("scores").where("name","==",n).get();
  if(!snap.empty&&n!==playerName){
    alert("その名前は使われています");
    return;
  }
  playerName=n;
  localStorage.setItem("playerName",n);
}

// =========================
// Start
// =========================
function start(){
  state=STATE.PLAY;
  enemies=[];
  items=[];
  player.x=W/2-40;
  player.y=H/2-40;
  startTime=performance.now();
  survive=0;
  level=1;

  if(MODES[modeIndex]==="林"){
    player.speed=4;
    enemies.push({x:0,y:0,size:80,speed:2,img:img.enemy});
  }
  if(MODES[modeIndex]==="森（四面楚歌）"){
    player.speed=4;
    enemies.push({x:W-80,y:0,size:70,speed:2.5,img:img.enemy});
  }
  if(MODES[modeIndex]==="森（一騎当千）"){
    player.speed=4;
    level=999;
    enemies.push({x:0,y:0,size:100,speed:0,img:img.boss});
  }
}

// =========================
// Update
// =========================
function update(){
  survive=Math.floor((performance.now()-startTime)/1000);

  // Level
  if(MODES[modeIndex]==="林"){
    level=Math.floor(survive/5)+1;
    enemies[0].speed=2+level*0.3;
  }

  if(MODES[modeIndex]==="森（四面楚歌）"){
    if(survive%5===0&&enemies.length<survive/5+1){
      enemies.push({x:W-70,y:0,size:70,speed:2.5,img:img.enemy});
    }
  }

  if(MODES[modeIndex]==="森（一騎当千）"){
    if(survive%3===0&&items.length<5){
      items.push({x:Math.random()*(W-40),y:Math.random()*(H-40),size:40});
    }
    enemies[0].speed=player.speed*0.9;
  }

  // Player move
  if(keys.ArrowUp||keys.w)player.y-=player.speed;
  if(keys.ArrowDown||keys.s)player.y+=player.speed;
  if(keys.ArrowLeft||keys.a)player.x-=player.speed;
  if(keys.ArrowRight||keys.d)player.x+=player.speed;

  if(touching){
    const dx=tx-(player.x+40);
    const dy=ty-(player.y+40);
    const d=Math.hypot(dx,dy);
    if(d>1){
      player.x+=dx/d*player.speed;
      player.y+=dy/d*player.speed;
    }
  }

  player.x=clamp(player.x,0,W-player.size);
  player.y=clamp(player.y,0,H-player.size);

  // Enemies
  enemies.forEach(e=>{
    const dx=player.x-e.x;
    const dy=player.y-e.y;
    const d=Math.hypot(dx,dy)||1;
    e.x+=dx/d*e.speed;
    e.y+=dy/d*e.speed;
    if(hit(player,e)) gameOver();
  });

  // Items
  items=items.filter(it=>{
    if(hit(player,it)){
      player.speed+=0.5;
      return false;
    }
    return true;
  });
}

// =========================
// GameOver
// =========================
async function gameOver(){
  state=STATE.OVER;
  if(playerName){
    await db.collection("scores").add({name:playerName,score:survive});
  }
  const snap=await db.collection("scores")
    .orderBy("score","desc").limit(5).get();
  ranking=snap.docs.map(d=>d.data());
}

// =========================
// Draw
// =========================
function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.font="20px sans-serif";
  ctx.fillStyle="#000";

  if(state===STATE.TITLE){
    ctx.textAlign="center";
    ctx.fillText("林を作らないゲーム",W/2,120);
    layoutButtons();
    drawBtn(btns.start,"START");
    drawBtn(btns.mode,`MODE: ${MODES[modeIndex]}`);
    drawBtn(btns.name,`NAME: ${playerName||"未設定"}`);
  }

  if(state===STATE.PLAY){
    ctx.drawImage(img.player,player.x,player.y,player.size,player.size);
    enemies.forEach(e=>ctx.drawImage(e.img,e.x,e.y,e.size,e.size));
    items.forEach(i=>ctx.drawImage(img.item,i.x,i.y,i.size,i.size));
    ctx.fillText(`Time ${survive}s`,20,30);
    ctx.fillText(`Lv ${level}`,20,60);
  }

  if(state===STATE.OVER){
    ctx.textAlign="center";
    ctx.fillText("GAME OVER",W/2,120);
    ranking.forEach((r,i)=>{
      ctx.fillStyle=r.name===DEVELOPER_NAME?"red":"black";
      ctx.fillText(
        `${i+1}. ${r.name}${r.name===DEVELOPER_NAME?"(開発者)":""} ${r.score}s`,
        W/2,200+i*30
      );
    });
    ctx.fillStyle="#000";
    ctx.fillText("タップで戻る",W/2,420);
  }
}

// =========================
// Loop
// =========================
(function loop(){
  if(state===STATE.PLAY)update();
  draw();
  requestAnimationFrame(loop);
})();
