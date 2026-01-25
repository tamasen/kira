// =====================
// 定数・設定
// =====================
const DEVELOPER_NAME = "たません";
const STATE = { TITLE:0, PLAY:1, GAMEOVER:2 };
const MODES = ["林","森（四面楚歌）","森（一騎当千）"];
const SIZE_PLAYER = 80;
const SIZE_ENEMY = 80;
const SIZE_BOSS = 100;
const ITEM_SIZE = 40;

// =====================
// Canvas初期化
// =====================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let screenWidth, screenHeight;

function resizeCanvas() {
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
// 画像読み込み
// =====================
const playerImg = new Image();
const enemyImg = new Image();
const bossImg   = new Image();
const itemImg   = new Image();
playerImg.src = "player.png";
enemyImg.src  = "enemy.png";
bossImg.src   = "boss.png";
itemImg.src   = "item_speed.png";

// =====================
// ゲーム状態
// =====================
let gameState = STATE.TITLE;
let modeIndex = 0;
let playerName = localStorage.getItem("playerName") || "";

// =====================
// ゲームオブジェクト
// =====================
let player = { x:0, y:0, speed:4, size:SIZE_PLAYER };
let enemies = [];
let items = [];
let surviveTime = 0;
let level = 1;
let startTime = 0;
let ranking = [];

// =====================
// 入力管理
// =====================
const keys = {};
let isTouching = false, touchX=0, touchY=0;

window.addEventListener("keydown", e=>keys[e.key]=true);
window.addEventListener("keyup", e=>keys[e.key]=false);

canvas.addEventListener("touchstart", e=>{
  e.preventDefault();
  const t = e.touches[0];
  isTouching = true;
  touchX = t.clientX;
  touchY = t.clientY;
},{passive:false});

canvas.addEventListener("touchmove", e=>{
  e.preventDefault();
  if(!isTouching) return;
  const t = e.touches[0];
  touchX = t.clientX;
  touchY = t.clientY;
},{passive:false});

canvas.addEventListener("touchend", e=>{ isTouching=false; });
canvas.addEventListener("click", e=>handleClick(e.clientX,e.clientY));

// =====================
// ユーティリティ
// =====================
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
const hit = (a,b,sA=SIZE_PLAYER,sB=SIZE_PLAYER)=>(
  a.x < b.x + sB &&
  a.x + sA > b.x &&
  a.y < b.y + sB &&
  a.y + sA > b.y
);

// =====================
// ボタン管理
// =====================
const buttons = {
  start:{x:0,y:0,w:220,h:60},
  mode: {x:0,y:0,w:220,h:60},
  name: {x:0,y:0,w:220,h:60}
};

function drawButton(btn,text){
  ctx.fillStyle="#fff";
  ctx.fillRect(btn.x,btn.y,btn.w,btn.h);
  ctx.strokeStyle="#000";
  ctx.strokeRect(btn.x,btn.y,btn.w,btn.h);
  ctx.fillStyle="#000";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.font="20px sans-serif";
  ctx.fillText(text,btn.x+btn.w/2,btn.y+btn.h/2);
}

function inside(btn,x,y){
  return x>=btn.x && x<=btn.x+btn.w && y>=btn.y && y<=btn.y+btn.h;
}

// =====================
// クリック処理
// =====================
function handleClick(x,y){
  if(gameState===STATE.TITLE){
    if(inside(buttons.start,x,y)) startGame();
    else if(inside(buttons.mode,x,y)) modeIndex=(modeIndex+1)%MODES.length;
    else if(inside(buttons.name,x,y)) changeName();
  } else if(gameState===STATE.GAMEOVER){
    gameState = STATE.TITLE;
  }
}

// =====================
// 名前変更
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
// ゲーム開始
// =====================
function startGame(){
  gameState = STATE.PLAY;
  enemies = [];
  items = [];
  player.x = screenWidth/2 - player.size/2;
  player.y = screenHeight/2 - player.size/2;
  player.speed = 4;
  surviveTime = 0;
  level = 1;
  startTime = performance.now();

  const mode = MODES[modeIndex];
  if(mode==="林"){
    enemies.push({x:100,y:100,speed:2,img:enemyImg,size:SIZE_ENEMY});
  } else if(mode==="森（四面楚歌）"){
    enemies.push({x:100,y:100,speed:2.5,img:enemyImg,size:70});
  } else {
    player.speed = 1;
    enemies.push({x:100,y:100,speed:player.speed*1.2,img:bossImg,size:SIZE_BOSS});
  }
}

// =====================
// アイテム生成
// =====================
function spawnItem(){
  if(MODES[modeIndex]!=="森（一騎当千）") return;
  if(items.length>=5) return;
  const x = Math.random()*(screenWidth-ITEM_SIZE);
  const y = Math.random()*(screenHeight-ITEM_SIZE);
  items.push({x,y});
}

// =====================
// プレイヤー更新
// =====================
function updatePlayer(){
  if(keys["ArrowUp"]||keys["w"]) player.y-=player.speed;
  if(keys["ArrowDown"]||keys["s"]) player.y+=player.speed;
  if(keys["ArrowLeft"]||keys["a"]) player.x-=player.speed;
  if(keys["ArrowRight"]||keys["d"]) player.x+=player.speed;

  if(isTouching){
    const dx = touchX-(player.x+player.size/2);
    const dy = touchY-(player.y+player.size/2);
    const d = Math.hypot(dx,dy);
    if(d>1){
      player.x += (dx/d)*player.speed;
      player.y += (dy/d)*player.speed;
    }
  }

  player.x = clamp(player.x,0,screenWidth-player.size);
  player.y = clamp(player.y,0,screenHeight-player.size);
}

// =====================
// 敵更新
// =====================
function updateEnemies(){
  const mode = MODES[modeIndex];
  enemies.forEach(e=>{
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx,dy);
    const spd = (mode==="森（一騎当千）") ? Math.max(player.speed*0.9,0.1) : e.speed;
    e.x += (dx/d)*spd;
    e.y += (dy/d)*spd;

    if(hit(player,e,player.size,e.size)) gameOver();
  });

  // 四面楚歌：5秒ごとに増える
  if(mode==="森（四面楚歌）"){
    if(surviveTime>0 && surviveTime%5===0 && enemies.length-1 < Math.floor(surviveTime/5)){
      enemies.push({
        x:Math.random()*(screenWidth-70),
        y:Math.random()*(screenHeight-70),
        speed:2.5,img:enemyImg,size:70
      });
    }
  }
}

// =====================
// アイテム更新
// =====================
function updateItems(){
  if(MODES[modeIndex]!=="森（一騎当千）") return;
  for(let i=items.length-1;i>=0;i--){
    if(hit(player,items[i],player.size,ITEM_SIZE)){
      player.speed += 0.5;
      items.splice(i,1);
    }
  }
}

// =====================
// 更新
// =====================
function update(){
  surviveTime = Math.floor((performance.now()-startTime)/1000);
  updatePlayer();
  updateEnemies();
  updateItems();

  if(MODES[modeIndex]==="林"){
    level = Math.floor(surviveTime/5)+1;
    enemies[0].speed = 2 + level*0.3;
  }
}

// =====================
// ゲームオーバー
// =====================
async function gameOver(){
  if(gameState!==STATE.PLAY) return;
  gameState = STATE.GAMEOVER;

  if(playerName){
    await db.collection("scores").add({name:playerName,score:surviveTime});
  }

  const snap = await db.collection("scores")
    .orderBy("score","desc")
    .limit(5)
    .get();
  ranking = snap.docs.map(d=>d.data());
}

// =====================
// 描画
// =====================
function draw(){
  ctx.clearRect(0,0,screenWidth,screenHeight);
  ctx.font="20px sans-serif";
  ctx.textBaseline="top";

  if(gameState===STATE.TITLE){
    ctx.textAlign="center";
    ctx.fillText("林を作らないゲーム",screenWidth/2,80);

    buttons.start.x=screenWidth/2-110; buttons.start.y=180;
    buttons.mode.x=screenWidth/2-110; buttons.mode.y=260;
    buttons.name.x=screenWidth/2-110; buttons.name.y=340;

    drawButton(buttons.start,"START");
    drawButton(buttons.mode,`MODE: ${MODES[modeIndex]}`);
    drawButton(buttons.name,`NAME: ${playerName||"未設定"}`);
  }

  if(gameState===STATE.PLAY){
    ctx.drawImage(playerImg,player.x,player.y,player.size,player.size);
    enemies.forEach(e=>ctx.drawImage(e.img,e.x,e.y,e.size,e.size));
    items.forEach(it=>ctx.drawImage(itemImg,it.x,it.y,ITEM_SIZE,ITEM_SIZE));

    ctx.fillStyle="#000";
    ctx.fillText(`Time: ${surviveTime}s`,20,20);
    ctx.fillText(`Level: ${level}`,20,50);
  }

  if(gameState===STATE.GAMEOVER){
    ctx.textAlign="center";
    ctx.fillText("GAME OVER",screenWidth/2,80);

    ranking.forEach((r,i)=>{
      ctx.fillStyle = r.name===DEVELOPER_NAME?"red":"black";
      const tag = r.name===DEVELOPER_NAME?" (開発者)":"";
      ctx.fillText(`${i+1}. ${r.name}${tag} : ${r.score}s`,screenWidth/2,150+i*30);
    });
    ctx.fillStyle="#000";
    ctx.fillText("タップで戻る",screenWidth/2,400);
  }
}

// =====================
// ループ
// =====================
function loop(){
  if(gameState===STATE.PLAY) update();
  draw();
  requestAnimationFrame(loop);
}
loop();

// =====================
// アイテム定期生成（森一騎当千）
// =====================
setInterval(()=>{
  if(gameState===STATE.PLAY && MODES[modeIndex]==="森（一騎当千）"){
    spawnItem();
  }
},3000);
