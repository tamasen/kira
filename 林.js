// =====================
// Firebase
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
  screenWidth = window.innerWidth;
  screenHeight = window.innerHeight;
  canvas.width = screenWidth;
  canvas.height = screenHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// =====================
// images
// =====================
const playerImg = new Image();
const enemyImg = new Image();
const bossImg = new Image();

playerImg.src = "player.png";
enemyImg.src = "enemy.png";
bossImg.src = "boss.png";

// =====================
// state & mode
// =====================
const STATE = { TITLE:0, PLAY:1, GAMEOVER:2 };
let gameState = STATE.TITLE;

const MODE = ["林", "森（四面楚歌）", "森（一騎当千）"];
let modeIndex = 0;

// =====================
// game objects
// =====================
const SIZE = 80;
const player = { x:0, y:0, speed:4 };
const enemies = [];

// =====================
// score
// =====================
let startTime = 0;
let surviveTime = 0;
let level = 1;

// =====================
// input
// =====================
const keys = {};
window.addEventListener("keydown", e=>{
  keys[e.key] = true;

  if (gameState === STATE.TITLE) {
    if (e.key === "Enter") startGame();
    if (e.key === "ArrowLeft") modeIndex = (modeIndex + MODE.length - 1) % MODE.length;
    if (e.key === "ArrowRight") modeIndex = (modeIndex + 1) % MODE.length;
  }
});
window.addEventListener("keyup", e=> keys[e.key] = false);

canvas.addEventListener("click", e=>{
  const x = e.clientX;
  const y = e.clientY;

  if (gameState === STATE.TITLE) {
    if (y > screenHeight/2 && y < screenHeight/2 + 60) {
      startGame();
    }
  } else if (gameState === STATE.GAMEOVER) {
    gameState = STATE.TITLE;
  }
});

// =====================
// start game
// =====================
function startGame(){
  gameState = STATE.PLAY;
  enemies.length = 0;

  player.x = screenWidth/2 - SIZE/2;
  player.y = screenHeight/2 - SIZE/2;
  player.speed = 4;

  level = 1;
  startTime = performance.now();

  if (MODE[modeIndex] === "林") {
    enemies.push({ x:100, y:100, size:SIZE, speed:2, img:enemyImg });
  } else if (MODE[modeIndex] === "森（四面楚歌）") {
    enemies.push({ x:screenWidth-120, y:120, size:SIZE, speed:2.5, img:enemyImg });
  } else {
    player.speed = 6;
    enemies.push({ x:100, y:100, size:SIZE, speed: player.speed*1.2, img:bossImg });
  }
}

// =====================
// update
// =====================
function update(){
  if (keys["ArrowUp"]) player.y -= player.speed;
  if (keys["ArrowDown"]) player.y += player.speed;
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  enemies.forEach(e=>{
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy);
    e.x += (dx/d)*e.speed;
    e.y += (dy/d)*e.speed;

    if (
      player.x < e.x + e.size &&
      player.x + SIZE > e.x &&
      player.y < e.y + e.size &&
      player.y + SIZE > e.y
    ) {
      gameState = STATE.GAMEOVER;
    }
  });

  surviveTime = Math.floor((performance.now() - startTime)/1000);
}

// =====================
// draw
// =====================
function draw(){
  ctx.clearRect(0,0,screenWidth,screenHeight);
  ctx.fillStyle="#000";
  ctx.textAlign="center";

  if (gameState === STATE.TITLE) {
    ctx.font="40px sans-serif";
    ctx.fillText("林を作らないゲーム", screenWidth/2, 150);

    ctx.font="24px sans-serif";
    ctx.fillText("MODE", screenWidth/2, 240);
    ctx.fillText(`◀ ${MODE[modeIndex]} ▶`, screenWidth/2, 280);

    ctx.fillRect(screenWidth/2 - 100, screenHeight/2, 200, 60);
    ctx.fillStyle="#fff";
    ctx.fillText("START", screenWidth/2, screenHeight/2 + 42);
  }

  if (gameState === STATE.PLAY) {
    ctx.drawImage(playerImg, player.x, player.y, SIZE, SIZE);
    enemies.forEach(e=>ctx.drawImage(e.img, e.x, e.y, e.size, e.size));

    ctx.fillStyle="#000";
    ctx.textAlign="left";
    ctx.fillText(`Time: ${surviveTime}s`, 20, 30);
  }

  if (gameState === STATE.GAMEOVER) {
    ctx.font="36px sans-serif";
    ctx.fillText("GAME OVER", screenWidth/2, 200);
    ctx.font="20px sans-serif";
    ctx.fillText("クリックでタイトルへ", screenWidth/2, 260);
  }
}

// =====================
// loop
// =====================
function loop(){
  if (gameState === STATE.PLAY) update();
  draw();
  requestAnimationFrame(loop);
}
loop();
