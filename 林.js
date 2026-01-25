// =====================
// Firebase
// =====================
const db = firebase.firestore();
const DEVELOPER_NAME = "たません";

// =====================
// canvas
// =====================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let screenWidth, screenHeight;
function resizeCanvas(){
  const dpr = window.devicePixelRatio || 1;
  screenWidth = window.innerWidth;
  screenHeight = window.innerHeight;
  canvas.width = screenWidth * dpr;
  canvas.height = screenHeight * dpr;
  canvas.style.width = screenWidth + "px";
  canvas.style.height = screenHeight + "px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// =====================
// images
// =====================
const playerImg = new Image();
const enemyImg  = new Image();
const bossImg   = new Image();
const itemImg   = new Image();

playerImg.src = "player.png";
enemyImg.src  = "enemy.png";
bossImg.src   = "boss.png";
itemImg.src   = "item_speed.png";

// =====================
// state / mode
// =====================
const STATE = { TITLE:0, PLAY:1, GAMEOVER:2 };
let gameState = STATE.TITLE;

const MODES = ["林","森（四面楚歌）","森（一騎当千）"];
let modeIndex = 0;

// =====================
// objects
// =====================
const SIZE = 80;
const player = { x:0, y:0, speed:4 };
let enemies = [];
let items = [];

// =====================
// score
// =====================
let startTime = 0;
let surviveTime = 0;
let level = 1;
let ranking = [];
let playerName = localStorage.getItem("playerName") || "";

// =====================
// timers
// =====================
let lastEnemyAddTime = 0;
let lastItemTime = 0;

// =====================
// input
// =====================
const keys = {};
let isTouching = false;
let touchX=0, touchY=0;

window.addEventListener("keydown", e=>keys[e.key]=true);
window.addEventListener("keyup", e=>keys[e.key]=false);

canvas.addEventListener("click", e=>{
  handleClick(e.clientX, e.clientY);
});

canvas.addEventListener("touchstart", e=>{
  e.preventDefault();
  const t=e.touches[0];
  isTouching=true;
  touchX=t.clientX;
  touchY=t.clientY;
},{passive:false});

canvas.addEventListener("touchmove", e=>{
  e.preventDefault();
  if(!isTouching) return;
  const t=e.touches[0];
  touchX=t.clientX;
  touchY=t.clientY;
},{passive:false});

canvas.addEventListener("touchend", ()=>isTouching=false);

// =====================
// utils
// =====================
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const hit=(a,b)=>(
  a.x<b.x+SIZE&&a.x+SIZE>b.x&&
  a.y<b.y+SIZE&&a.y+SIZE>b.y
);

// =====================
// buttons
// =====================
const buttons={
  start:{x:0,y:0,w:220,h:60},
  mode:{x:0,y:0,w:220,h:60},
  name:{x:0,y:0,w:220,h:60}
};

function drawButton(btn,text){
  ctx.fillStyle="#fff";
  ctx.fillRect(btn.x,btn.y,btn.w,btn.h);
  ctx.strokeStyle="#000";
  ctx.strokeRect(btn.x,btn.y,btn.w,btn.h);
  ctx.fillStyle="#000";
  ctx.textAlign="center";
  ctx.fillText(text,btn.x+btn.w/2,btn.y+38);
}
const inside=(b,x,y)=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;

// =====================
// click
// =====================
function handleClick(x,y){
  if(gameState===STATE.TITLE){
    if(inside(buttons.start,x,y)) startGame();
    if(inside(buttons.mode,x,y)) modeIndex=(modeIndex+1)%MODES.length;
    if(inside(buttons.name,x,y)) changeName();
  }else if(gameState===STATE.GAMEOVER){
    gameState=STATE.TITLE;
  }
}

// =====================
// name change
// =====================
async function changeName(){
  const name=prompt("名前を入力");
  if(!name) return;

  const snap=await db.collection("scores")
    .where("name","==",name).get();

  if(!snap.empty && name!==playerName){
    alert("その名前は使われています");
    return;
  }
  playerName=name;
  localStorage.setItem("playerName",name);
}

// =====================
// start game
// =====================
function startGame(){
  gameState=STATE.PLAY;
  enemies=[];
  items=[];
  player.x=screenWidth/2-SIZE/2;
  player.y=screenHeight/2-SIZE/2;
  player.speed=4;
  level=1;
  startTime=performance.now();
  lastEnemyAddTime=startTime;
  lastItemTime=startTime;

  const m=MODES[modeIndex];
  if(m==="林"){
    enemies.push({x:100,y:100,speed:2,img:enemyImg});
  }else if(m==="森（四面楚歌）"){
    enemies.push({x:100,y:100,speed:2.5,img:enemyImg});
  }else{
    player.speed=6;
    level=7;
    enemies.push({x:100,y:100,speed:player.speed*1.2,img:bossImg});
  }
}

// =====================
// update
// =====================
function update(){
  // player
  if(keys["ArrowUp"]||keys["w"]) player.y-=player.speed;
  if(keys["ArrowDown"]||keys["s"]) player.y+=player.speed;
  if(keys["ArrowLeft"]||keys["a"]) player.x-=player.speed;
  if(keys["ArrowRight"]||keys["d"]) player.x+=player.speed;

  if(isTouching){
    const dx=touchX-(player.x+SIZE/2);
    const dy=touchY-(player.y+SIZE/2);
    const d=Math.hypot(dx,dy);
    if(d>1){
      player.x+=(dx/d)*player.speed;
      player.y+=(dy/d)*player.speed;
    }
  }

  player.x=clamp(player.x,0,screenWidth-SIZE);
  player.y=clamp(player.y,0,screenHeight-SIZE);

  surviveTime=Math.floor((performance.now()-startTime)/1000);

  // 林モード
  if(MODES[modeIndex]==="林"){
    level=Math.floor(surviveTime/5)+1;
    enemies[0].speed=2+level*0.3;
  }

  // 四面楚歌 敵追加
  if(MODES[modeIndex]==="森（四面楚歌）"){
    const now=performance.now();
    if(now-lastEnemyAddTime>3000 && enemies.length<10){
      enemies.push({
        x:Math.random()*(screenWidth-SIZE),
        y:Math.random()*(screenHeight-SIZE),
        speed:2.5,
        img:enemyImg
      });
      lastEnemyAddTime=now;
    }
  }

  // 一騎当千 アイテム
  if(MODES[modeIndex]==="森（一騎当千）"){
    const now=performance.now();
    if(now-lastItemTime>5000 && items.length<1){
      items.push({
        x:Math.random()*(screenWidth-SIZE),
        y:Math.random()*(screenHeight-SIZE)
      });
      lastItemTime=now;
    }
  }

  // enemies
  enemies.forEach(e=>{
    const dx=player.x-e.x;
    const dy=player.y-e.y;
    const d=Math.hypot(dx,dy)||1;
    const spd = MODES[modeIndex]==="森（一騎当千）"
      ? player.speed*1.2
      : e.speed;
    e.x+=(dx/d)*spd;
    e.y+=(dy/d)*spd;
    if(hit(player,e)) gameOver();
  });

  // items
  items = items.filter(i=>{
    if(hit(player,i)){
      player.speed+=0.5;
      return false;
    }
    return true;
  });
}

// =====================
// game over
// =====================
async function gameOver(){
  gameState=STATE.GAMEOVER;
  if(playerName){
    await db.collection("scores").add({
      name:playerName,
      score:surviveTime
    });
    const snap=await db.collection("scores")
      .orderBy("score","desc").limit(5).get();
    ranking=snap.docs.map(d=>d.data());
  }
}

// =====================
// draw
// =====================
function draw(){
  ctx.clearRect(0,0,screenWidth,screenHeight);
  ctx.font="20px sans-serif";

  if(gameState===STATE.TITLE){
    ctx.textAlign="center";
    ctx.fillText("林を作らないゲーム",screenWidth/2,120);

    buttons.start.x=screenWidth/2-110; buttons.start.y=180;
    buttons.mode.x =screenWidth/2-110; buttons.mode.y =260;
    buttons.name.x =screenWidth/2-110; buttons.name.y =340;

    drawButton(buttons.start,"START");
    drawButton(buttons.mode,`MODE: ${MODES[modeIndex]}`);
    drawButton(buttons.name,`NAME: ${playerName||"未設定"}`);
  }

  if(gameState===STATE.PLAY){
    ctx.drawImage(playerImg,player.x,player.y,SIZE,SIZE);
    enemies.forEach(e=>ctx.drawImage(e.img,e.x,e.y,SIZE,SIZE));
    items.forEach(i=>ctx.drawImage(itemImg,i.x,i.y,SIZE,SIZE));
    ctx.fillText(`Time ${surviveTime}s`,20,30);
    ctx.fillText(`Level ${level}`,20,60);
  }

  if(gameState===STATE.GAMEOVER){
    ctx.textAlign="center";
    ctx.fillText("GAME OVER",screenWidth/2,120);
    ranking.forEach((r,i)=>{
      ctx.fillStyle=r.name===DEVELOPER_NAME?"red":"black";
      const tag=r.name===DEVELOPER_NAME?" (開発者)":"";
      ctx.fillText(
        `${i+1}. ${r.name}${tag} : ${r.score}s`,
        screenWidth/2,200+i*30
      );
    });
    ctx.fillStyle="#000";
    ctx.fillText("タップで戻る",screenWidth/2,420);
  }
}

// =====================
// loop
// =====================
function loop(){
  if(gameState===STATE.PLAY) update();
  draw();
  requestAnimationFrame(loop);
}
loop();
