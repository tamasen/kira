// =====================
// canvas
// =====================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// =====================
// screen size
// =====================
let screenWidth = 0;
let screenHeight = 0;

// =====================
// resize
// =====================
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;

  screenWidth  = window.innerWidth;
  screenHeight = window.innerHeight;

  canvas.width  = screenWidth  * dpr;
  canvas.height = screenHeight * dpr;

  canvas.style.width  = screenWidth + "px";
  canvas.style.height = screenHeight + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// =====================
// images
// =====================
const playerImg = new Image();
const enemyImg  = new Image();
playerImg.src = "player.png";
enemyImg.src  = "enemy.png";

// =====================
// game state
// =====================
const STATE = {
  TITLE: "title",
  PLAY: "play",
  GAMEOVER: "gameover"
};
let gameState = STATE.TITLE;

// =====================
// objects
// =====================
const SIZE = 100;

const player = {
  x: 0,
  y: 0,
  speed: 4
};

const enemy = {
  x: 0,
  y: 0,
  baseSpeed: 1.8,
  speed: 1.8
};

// =====================
// score & level
// =====================
let startTime = 0;
let surviveTime = 0;
let level = 1;

// =====================
// input
// =====================
const keys = {};
window.addEventListener("keydown", e => {
  if (e.key.startsWith("Arrow")) e.preventDefault();
  keys[e.key] = true;

  if (e.key === "Enter" && gameState !== STATE.PLAY) {
    startGame();
  }
});
window.addEventListener("keyup", e => {
  if (e.key.startsWith("Arrow")) e.preventDefault();
  keys[e.key] = false;
});

canvas.addEventListener("click", () => {
  if (gameState !== STATE.PLAY) startGame();
});

// =====================
// utils
// =====================
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function isHit(a, b) {
  return (
    a.x < b.x + SIZE &&
    a.x + SIZE > b.x &&
    a.y < b.y + SIZE &&
    a.y + SIZE > b.y
  );
}

// =====================
// start
// =====================
function startGame() {
  gameState = STATE.PLAY;

  player.x = screenWidth / 2 - SIZE / 2;
  player.y = screenHeight / 2 - SIZE / 2;

  enemy.x = screenWidth / 4;
  enemy.y = screenHeight / 4;

  enemy.speed = enemy.baseSpeed;
  startTime = performance.now();
  surviveTime = 0;
  level = 1;
}

// =====================
// update
// =====================
function updatePlayer() {
  if (keys["ArrowUp"])    player.y -= player.speed;
  if (keys["ArrowDown"])  player.y += player.speed;
  if (keys["ArrowLeft"])  player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  player.x = clamp(player.x, 0, screenWidth  - SIZE);
  player.y = clamp(player.y, 0, screenHeight - SIZE);
}

function updateEnemy() {
  surviveTime = Math.floor((performance.now() - startTime) / 1000);

  // ★ レベル計算（5秒ごと）
  level = Math.floor(surviveTime / 5) + 1;
  enemy.speed = enemy.baseSpeed + level * 0.3;

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 0) {
    enemy.x += (dx / dist) * enemy.speed;
    enemy.y += (dy / dist) * enemy.speed;
  }
}

// =====================
// draw
// =====================
function drawTitle() {
  ctx.clearRect(0, 0, screenWidth, screenHeight);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";

  ctx.font = "48px sans-serif";
  ctx.fillText("林を作らないゲーム", screenWidth / 2, screenHeight / 2 - 120);

  ctx.font = "24px sans-serif";
  ctx.fillText("クリック or Enterでスタート", screenWidth / 2, screenHeight / 2 + 40);
}

function drawGame() {
  ctx.clearRect(0, 0, screenWidth, screenHeight);

  ctx.drawImage(playerImg, player.x, player.y, SIZE, SIZE);
  ctx.drawImage(enemyImg, enemy.x, enemy.y, SIZE, SIZE);

  ctx.fillStyle = "#000";
  ctx.font = "20px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`TIME: ${surviveTime}s`, 20, 30);
  ctx.fillText(`LEVEL: ${level}`, 20, 55);
}

function drawGameOver() {
  ctx.clearRect(0, 0, screenWidth, screenHeight);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";

  ctx.font = "48px sans-serif";
  ctx.fillText("林", screenWidth / 2, screenHeight / 2 - 120);

  ctx.font = "28px sans-serif";
  ctx.fillText(`生存時間: ${surviveTime} 秒`, screenWidth / 2, screenHeight / 2 - 20);
  ctx.fillText(`到達レベル: ${level}`, screenWidth / 2, screenHeight / 2 + 20);

  ctx.font = "24px sans-serif";
  ctx.fillText("クリック or Enterで再スタート", screenWidth / 2, screenHeight / 2 + 80);
}

// =====================
// loop
// =====================
function gameLoop() {
  if (gameState === STATE.TITLE) {
    drawTitle();
  }
  else if (gameState === STATE.PLAY) {
    updatePlayer();
    updateEnemy();
    drawGame();

    if (isHit(player, enemy)) {
      gameState = STATE.GAMEOVER;
    }
  }
  else {
    drawGameOver();
  }

  requestAnimationFrame(gameLoop);
}

playerImg.onload = gameLoop;
