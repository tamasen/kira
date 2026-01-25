const db = firebase.firestore();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

const STATE = { TITLE:0, PLAY:1, GAMEOVER:2 };
let gameState = STATE.TITLE;

const MODE = ["林","森（四面楚歌）","森（一騎当千）"];
let modeIndex = 0;

const SIZE = 80;
const player = { x:0, y:0, speed:4 };
const enemies = [];

let startTime = 0;
let surviveTime = 0;
let level = 1;

let playerName = localStorage.getItem("playerName") || "";

const keys = {};
let touching = false;
let tx = 0, ty = 0;

addEventListener("keydown",e=>keys[e.key]=true);
addEventListener("keyup",e=>keys[e.key]=false);

canvas.addEventListener("click",e=>pointer(e.clientX,e.clientY));
canvas.addEventListener("touchstart",e=>{
  e.preventDefault();
  touching=true;
  tx=e.touches[0].clientX;
  ty=e.touches[0].clientY;
  pointer(tx,ty);
},{passive:false});
canvas.addEventListener("touchmove",e=>{
  e.preventDefault();
  tx=e.touches[0].clientX;
  ty=e.touches[0].clientY;
},{passive:false});
canvas.addEventListener("touchend",()=>touching=false);

function pointer(x,y){
  if(gameState===STATE.TITLE){
    if(y>350&&y<420){ changeName(); return; }
    if(y>250&&y<310){ modeIndex=(modeIndex+1)%3; return; }
    if(y>180&&y<230){ startGame(); }
  }else if(gameState===STATE.GAMEOVER){
    gameState=STATE.TITLE;
  }
}

function changeName(){
  let n = prompt("名前を入力",playerName);
  if(!n)return;
  playerName=n;
  localStorage.setItem("playerName",playerName);
}

function startGame(){
  gameState=STATE.PLAY;
  enemies.length=0;
  player.x=canvas.width/2;
  player.y=canvas.height/2;
  player.speed=4;
  level=1;
  startTime=performance.now();

  if(MODE[modeIndex]==="林"){
    enemies.push({x:100,y:100,speed:2});
  }else if(MODE[modeIndex]==="森（四面楚歌）"){
    enemies.push({x:100,y:100,speed:2});
  }else{
    player.speed=6;
    level=7;
    enemies.push({x:100,y:100,speed:player.speed*1.2});
  }
}

function update(){
  if(keys.ArrowUp)player.y-=player.speed;
  if(keys.ArrowDown)player.y+=player.speed;
  if(keys.ArrowLeft)player.x-=player.speed;
  if(keys.ArrowRight)player.x+=player.speed;

  if(touching){
    const dx=tx-player.x;
    const dy=ty-player.y;
    const d=Math.hypot(dx,dy);
    if(d>1){
      player.x+=dx/d*player.speed;
      player.y+=dy/d*player.speed;
    }
  }

  enemies.forEach(e=>{
    const dx=player.x-e.x;
    const dy=player.y-e.y;
    const d=Math.hypot(dx,dy);
    let s=e.speed;
    if(MODE[modeIndex]==="森（一騎当千）") s=player.speed*1.2;
    e.x+=dx/d*s;
    e.y+=dy/d*s;
    if(d<SIZE) gameOver();
  });

  surviveTime=Math.floor((performance.now()-startTime)/1000);
  if(MODE[modeIndex]==="林"){
    level=Math.floor(surviveTime/5)+1;
    enemies[0].speed=2+level*0.3;
  }
}

async function gameOver(){
  gameState=STATE.GAMEOVER;
  await db.collection("scores").add({
    name:playerName||"NO NAME",
    score:surviveTime
  });
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.textAlign="center";

  if(gameState===STATE.TITLE){
    ctx.font="30px sans-serif";
    ctx.fillText("林を作らないゲーム",canvas.width/2,120);

    ctx.font="20px sans-serif";
    ctx.fillText("START",canvas.width/2,210);
    ctx.fillText("MODE : "+MODE[modeIndex],canvas.width/2,280);
    ctx.fillText("名前："+(playerName||"未設定"),canvas.width/2,380);
    ctx.fillText("（タップして変更）",canvas.width/2,410);
  }

  if(gameState===STATE.PLAY){
    ctx.fillRect(player.x-SIZE/2,player.y-SIZE/2,SIZE,SIZE);
    enemies.forEach(e=>{
      ctx.fillRect(e.x-SIZE/2,e.y-SIZE/2,SIZE,SIZE);
    });
    ctx.fillText(`Time ${surviveTime}`,80,30);
    ctx.fillText(`Lv ${level}`,80,60);
  }

  if(gameState===STATE.GAMEOVER){
    ctx.fillText("GAME OVER",canvas.width/2,200);
    ctx.fillText("タップでタイトルへ",canvas.width/2,260);
  }
}

function loop(){
  if(gameState===STATE.PLAY) update();
  draw();
  requestAnimationFrame(loop);
}
loop();
