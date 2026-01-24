// =====================
// Firebase (HTMLで初期化済み前提)
// =====================
const db = firebase.firestore();

// =====================
// canvas
// =====================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// =====================
// resize
// =====================
let screenWidth, screenHeight;
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  screenWidth = window.innerWidth;
  screenHeight = window.innerHeight;
  canvas.width = screenWidth * dpr;
  canvas.height = screenHeight * dpr;
  canvas.style.width = screenWidth + "px";
  canvas.style.height = screenHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
itemImg.src = "item_speed.png";

// =====================
// state & mode
// =====================
const STATE = { TITLE:0, PLAY:1, GAMEOVER:2 };
let gameState = STATE.TITLE;

const MODE = ["林", "森（四面楚歌）", "森（一騎当千）"];
let modeIndex = 0;

// =====================
// constants / objects
// =====================
const SIZE = 100;
const player = { x:0, y:0, speed:4 };
const enemies = [];
const items = [];

// =====================
// score & ranking
// =====================
let startTime = 0;
let surviveTime = 0;
let level = 1;
let lastSpawn = 0;

let playerName = localStorage.getItem("playerName") || "";
let ranking = [];

// =====================
// input
// =====================
const keys = {};
let isTouching = false;
let touchX = 0, touchY = 0;

window.addEventListener("keydown", e=>{
  keys[e.key] = true;
  if (e.key === "Enter" && gameState === STATE.TITLE) startGame();
});
window.addEventListener("keyup", e=>{ keys[e.key] = false; });

canvas.addEventListener("click", e=>{
  handlePointer(e.clientX, e.clientY, false);
});

canvas.addEventListener("touchstart", e=>{
  e.preventDefault();
  const t = e.touches[0];
  handlePointer(t.clientX, t.clientY, true);
  if (gameState === STATE.PLAY) {
    isTouching = true;
    touchX = t.clientX;
    touchY = t.clientY;
  }
},{passive:false});

canvas.addEventListener("touchmove", e=>{
  e.preventDefault();
  if (!isTouching) return;
  const t = e.touches[0];
  touchX = t.clientX;
  touchY = t.clientY;
},{passive:false});

canvas.addEventListener("touchend", ()=>{
  isTouching = false;
},{passive:false});

// =====================
// utils
// =====================
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const hit = (a, b) => (
  a.x < b.x + b.size &&
  a.x + SIZE > b.x &&
  a.y < b.y + b.size &&
  a.y + SIZE > b.y
);

// =====================
// pointer
// =====================
function handlePointer(px, py){
  if (gameState === STATE.TITLE) {
    startGame();
  } else if (gameState === STATE.GAMEOVER) {
    gameState = STATE.TITLE;
  }
}

// =====================
// start game
// =====================
function startGame(){
  gameState = STATE.PLAY;
  enemies.length = 0;
  items.length = 0;

  player.x = screenWidth/2 - SIZE/2;
  player.y = screenHeight/2 - SIZE/2;
  player.speed = 4;

  level = 1;
  startTime = performance.now();
  lastSpawn = performance.now();

  const mode = MODE[modeIndex];
  if (mode === "林") {
    enemies.push({ x:100, y:100, size:SIZE, img: enemyImg, speed: 1.8 });
  } else if (mode === "森（四面楚歌）") {
    enemies.push({ x:screenWidth-120, y:120, size:SIZE, img: enemyImg, speed: 2.2 });
  } else {
    player.speed = 6;
    level = 7;
    enemies.push({ x:100, y:100, size:SIZE, img: bossImg, speed: player.speed * 1.2 });
  }
}

// =====================
// update
// =====================
function updatePlayer(){
  if (keys["ArrowUp"]) player.y -= player.speed;
  if (keys["ArrowDown"]) player.y += player.speed;
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  if (isTouching) {
    const dx = touchX - (player.x + SIZE/2);
    const dy = touchY - (player.y + SIZE/2);
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      player.x += (dx / d) * player.speed;
      player.y += (dy / d) * player.speed;
    }
  }

  player.x = clamp(player.x, 0, screenWidth - SIZE);
  player.y = clamp(player.y, 0, screenHeight - SIZE);
}

function updateEnemies(){
  enemies.forEach(e=>{
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy);
    let spd = e.speed;
    if (MODE[modeIndex] === "森（一騎当千）") spd = player.speed * 1.2;
    e.x += (dx/d)*spd;
    e.y += (dy/d)*spd;

    if (hit(player, e)) gameOver();
  });
}

function updateLogic(){
  surviveTime = Math.floor((performance.now() - startTime)/1000);

  if (MODE[modeIndex] === "林") {
    level = Math.floor(surviveTime/5)+1;
    enemies[0].speed = 1.8 + level*0.3;
  }
}

// =====================
// GAME OVER + Firebase
// =====================
async function gameOver(){
  gameState = STATE.GAMEOVER;

  if (!playerName) {
    playerName = prompt("名前を入力してください");
    if (!playerName) playerName = "NO NAME";
    localStorage.setItem("playerName", playerName);
  }

  await db.collection("scores").add({
    name: playerName,
    score: surviveTime,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  const snap = await db.collection("scores")
    .orderBy("score","desc")
    .limit(5)
    .get();

  ranking = snap.docs.map(d=>d.data());
}

// =====================
// draw
// =====================
function draw(){
  ctx.clearRect(0,0,screenWidth,screenHeight);

  if (gameState === STATE.PLAY) {
    ctx.drawImage(playerImg, player.x, player.y, SIZE, SIZE);
    enemies.forEach(e=>ctx.drawImage(e.img, e.x, e.y, e.size, e.size));

    ctx.fillStyle="#000";
    ctx.fillText(`Time ${surviveTime}s`,20,30);
    ctx.fillText(`Level ${level}`,20,60);
  }

  if (gameState === STATE.GAMEOVER) {
    ctx.textAlign="center";
    ctx.fillText("GAME OVER",screenWidth/2,160);
    ranking.forEach((r,i)=>{
      ctx.fillText(`${i+1}. ${r.name} : ${r.score}s`,screenWidth/2,220+i*30);
    });
    ctx.fillText("タップでタイトルへ",screenWidth/2,400);
  }
}

// =====================
// loop
// =====================
function loop(){
  if (gameState === STATE.PLAY){
    updatePlayer();
    updateLogic();
    updateEnemies();
  }
  draw();
  requestAnimationFrame(loop);
}

// =====================
// start
// =====================
loop();
