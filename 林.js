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

// =====================
// resize
// =====================
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
const enemyImg = new Image();
const bossImg = new Image();
const itemImg = new Image();
playerImg.src = "player.png";
enemyImg.src = "enemy.png";
bossImg.src = "boss.png";
itemImg.src = "item.png";

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
const ITEM_SIZE = 50;

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
let lastEnemyAdd = 0;
let lastItemAdd = 0;

let playerName = localStorage.getItem("playerName") || "";

// =====================
// input（スマホ完全対応）
// =====================
let targetX = 0, targetY = 0;

canvas.addEventListener("click", e=>{
  handleInput(e.clientX, e.clientY);
});
canvas.addEventListener("touchend", e=>{
  const t = e.changedTouches[0];
  handleInput(t.clientX, t.clientY);
});

function handleInput(x,y){
  if(gameState===STATE.TITLE || gameState===STATE.GAMEOVER){
    handleClick(x,y);
  }else{
    targetX = x;
    targetY = y;
  }
}

// =====================
// utils
// =====================
const hit = (a,b,sa=SIZE,sb=SIZE)=>(
  a.x < b.x + sb &&
  a.x + sa > b.x &&
  a.y < b.y + sb &&
  a.y + sa > b.y
);

// =====================
// buttons
// =====================
const buttons = {
  start:{x:0,y:0,w:240,h:60},
  mode:{x:0,y:0,w:240,h:60},
  name:{x:0,y:0,w:240,h:60}
};

function drawButton(b,t){
  ctx.fillStyle="#fff";
  ctx.fillRect(b.x,b.y,b.w,b.h);
  ctx.strokeStyle="#000";
  ctx.strokeRect(b.x,b.y,b.w,b.h);
  ctx.fillStyle="#000";
  ctx.textAlign="center";
  ctx.fillText(t,b.x+b.w/2,b.y+38);
}
function inside(b,x,y){
  return x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;
}

// =====================
// click
// =====================
function handleClick(x,y){
  if(gameState===STATE.TITLE){
    if(inside(buttons.start,x,y)) startGame();
    if(inside(buttons.mode,x,y)) modeIndex=(modeIndex+1)%MODES.length;
    if(inside(buttons.name,x,y)) changeName();
  }else if(gameState===STATE.GAMEOVER){
    gameState = STATE.TITLE;
  }
}

// =====================
// name change（重複禁止）
// =====================
async function changeName(){
  const name = prompt("名前を入力");
  if(!name) return;

  const snap = await db.collection("scores").where("name","==",name).get();
  if(!snap.empty && name!==playerName){
    alert("その名前は使われています");
    return;
  }
  playerName = name;
  localStorage.setItem("playerName",playerName);
}

// =====================
// start game
// =====================
function startGame(){
  gameState = STATE.PLAY;
  enemies = [];
  items = [];
  player.x = screenWidth/2 - SIZE/2;
  player.y = screenHeight/2 - SIZE/2;
  targetX = player.x;
  targetY = player.y;
  player.speed = 4;
  level = 1;
  startTime = performance.now();
  lastEnemyAdd = 0;
  lastItemAdd = 0;

  if(MODES[modeIndex]==="林"){
    enemies.push({x:100,y:100,speed:2,img:enemyImg});
  }
  if(MODES[modeIndex]==="森（四面楚歌）"){
    enemies.push({x:100,y:100,speed:2.2,img:enemyImg});
  }
  if(MODES[modeIndex]==="森（一騎当千）"){
    player.speed = 6;
    enemies.push({x:100,y:100,speed:player.speed*1.2,img:bossImg,size:120});
  }
}

// =====================
// update
// =====================
function update(){
  surviveTime = Math.floor((performance.now()-startTime)/1000);

  // player move
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const d = Math.hypot(dx,dy);
  if(d>1){
    player.x += dx/d * player.speed;
    player.y += dy/d * player.speed;
  }

  // 四面楚歌：敵増殖
  if(MODES[modeIndex]==="森（四面楚歌）" && surviveTime-lastEnemyAdd>=5){
    enemies.push({
      x:Math.random()*screenWidth,
      y:Math.random()*screenHeight,
      speed:2.2+level*0.2,
      img:enemyImg
    });
    lastEnemyAdd = surviveTime;
    level++;
  }

  // 一騎当千：アイテム
  if(MODES[modeIndex]==="森（一騎当千）" && surviveTime-lastItemAdd>=6){
    items.push({
      x:Math.random()*(screenWidth-ITEM_SIZE),
      y:Math.random()*(screenHeight-ITEM_SIZE)
    });
    lastItemAdd = surviveTime;
  }

  // enemies move
  enemies.forEach(e=>{
    const dx = player.x-e.x;
    const dy = player.y-e.y;
    const d = Math.hypot(dx,dy);
    e.x += dx/d*e.speed;
    e.y += dy/d*e.speed;
    if(hit(player,e,SIZE,e.size||SIZE)) gameOver();
  });

  // item hit
  items = items.filter(it=>{
    if(hit(player,it,SIZE,ITEM_SIZE)){
      player.speed += 1;
      return false;
    }
    return true;
  });
}

// =====================
// game over
// =====================
async function gameOver(){
  gameState = STATE.GAMEOVER;
  if(!playerName) return;

  await db.collection("scores").add({name:playerName,score:surviveTime});
  const snap = await db.collection("scores").orderBy("score","desc").limit(5).get();
  ranking = snap.docs.map(d=>d.data());
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

    buttons.start.x=screenWidth/2-120; buttons.start.y=180;
    buttons.mode.x =screenWidth/2-120; buttons.mode.y =260;
    buttons.name.x =screenWidth/2-120; buttons.name.y =340;

    drawButton(buttons.start,"START");
    drawButton(buttons.mode,"MODE: "+MODES[modeIndex]);
    drawButton(buttons.name,"NAME: "+(playerName||"未設定"));
  }

  if(gameState===STATE.PLAY){
    ctx.drawImage(playerImg,player.x,player.y,SIZE,SIZE);
    enemies.forEach(e=>{
      ctx.drawImage(e.img,e.x,e.y,e.size||SIZE,e.size||SIZE);
    });
    items.forEach(i=>{
      ctx.drawImage(itemImg,i.x,i.y,ITEM_SIZE,ITEM_SIZE);
    });
    ctx.fillText(`Time ${surviveTime}s`,20,30);
    ctx.fillText(`Level ${level}`,20,60);
  }

  if(gameState===STATE.GAMEOVER){
    ctx.textAlign="center";
    ctx.fillText("GAME OVER",screenWidth/2,120);
    ranking.forEach((r,i)=>{
      ctx.fillStyle=r.name===DEVELOPER_NAME?"red":"black";
      const tag=r.name===DEVELOPER_NAME?" (開発者)":"";
      ctx.fillText(`${i+1}. ${r.name}${tag} : ${r.score}s`,
        screenWidth/2,200+i*30);
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
