// =====================
// canvas
// =====================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// =====================
// logical screen size
// =====================
let screenWidth;
let screenHeight;

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
// constants
// =====================
const SIZE = 100;

// =====================
// characters
// =====================
const player = { x: 0, y: 0, speed: 4 };
const enemy  = { x: 0, y: 0, speed: 1.8 };

// =====================
// score & difficulty
// =====================
let startTime = 0;
let surviveTime = 0;
let level = 1;

// =====================
// keyboard input
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

// =====================
// touch follow（絶対動く版）
// =====================
let isTouching = false;
let touchX = 0;
let touchY = 0;

canvas.addEventListener("touchstart", e => {
  e.preventDefault();               // ★超重要
  const touch = e.touches[0];

  if (gameState !== STATE.PLAY) {
    startGame();                    // ★必ずここでスタート
    return;
  }

  isTouching = true;
  touchX = touch.clientX;
  touchY = touch.clientY;
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  e.preventDefault();               // ★超重要
  if (!isTouching) return;

  const touch = e.touches[0];
  touchX = touch.clientX;
  touchY = touch.clientY;
}, { passive: false });

canvas.addEventListener("touchend", e => {
  e.preventDefault();
  isTouching = false;
}, { passive: false });

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

  player.x = screenWidth  / 2 - SIZE / 2;
  player.y = screenHeight / 2 - SIZE / 2;

  enemy.x  = screenWidth  / 4;
  enemy.y  = screenHeight / 4;

  level = 1;
  enemy.speed = 1.8;
  startTime = performance.now();
}

// =====================
// update
// =====================
function updatePlayer() {
  if (keys["ArrowUp"])    player.y -= player.speed;
  if (keys["ArrowDown"])  player.y += player.speed;
  if (keys["ArrowLeft"])  player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  if (isTouching) {
    const dx = touchX - (player.x + SIZE / 2);
    const dy = touchY - (player.y + SIZE / 2);
    const dist = Math.hypot(dx, dy);

    if (dist > 1) {
      player.x += (dx / dist) * player.speed;
      player.y += (dy / dist) * player.speed;
    }
  }

  player.x = clamp(player.x, 0, screenWidth  - SIZE);
  player.y = clamp(player.y, 0, screenHeight - SIZE);
}

function updateEnemy() {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 0) {
    enemy.x += (dx / dist) * enemy.speed;
    enemy.y += (dy / dist) * enemy.speed;
  }
}

function updateScoreAndLevel() {
  surviveTime = Math.floor((performance.now() - startTime) / 1000);
  level = Math.floor(surviveTime / 5) + 1;
  enemy.speed = 1.8 + level * 0.3;
}

// =====================
// draw
// =====================
function drawTitle() {
  ctx.clearRect(0, 0, screenWidth, screenHeight);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.font = "48px sans-serif";
  ctx.fillText("林を作らないゲーム", screenWidth / 2, screenHeight / 2 - 60);
  ctx.font = "24px sans-serif";
  ctx.fillText("画面タップでスタート", screenWidth / 2, screenHeight / 2 + 40);
}

function drawGame() {
  ctx.clearRect(0, 0, screenWidth, screenHeight);
  ctx.drawImage(playerImg, player.x, player.y, SIZE, SIZE);
  ctx.drawImage(enemyImg,  enemy.x,  enemy.y,  SIZE, SIZE);

  ctx.fillStyle = "#000";
  ctx.font = "20px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Time : ${surviveTime}s`, 20, 30);
  ctx.fillText(`Level: ${level}`, 20, 60);
}

function drawGameOver() {
  ctx.clearRect(0, 0, screenWidth, screenHeight);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.font = "48px sans-serif";
  ctx.fillText("ゲームオーバー", screenWidth / 2, screenHeight / 2 - 80);
  ctx.font = "24px sans-serif";
  ctx.fillText(`生存時間: ${surviveTime} 秒`, screenWidth / 2, screenHeight / 2 - 20);
  ctx.fillText("画面タップで再スタート", screenWidth / 2, screenHeight / 2 + 40);
}

// =====================
// loop
// =====================
function gameLoop() {
  if (gameState === STATE.TITLE) drawTitle();
  else if (gameState === STATE.PLAY) {
    updatePlayer();
    updateEnemy();
    updateScoreAndLevel();
    drawGame();
    if (isHit(player, enemy)) gameState = STATE.GAMEOVER;
  }
  else drawGameOver();

  requestAnimationFrame(gameLoop);
}

// =====================
// start
// =====================
playerImg.onload = gameLoop;
