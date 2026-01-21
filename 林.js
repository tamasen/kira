// =====================
// canvas
// =====================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// =====================
// resize
// =====================
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth  * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width  = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
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
// state
// =====================
const SIZE = 100;

const player = { x: 0, y: 0, speed: 4 };
const enemy  = { x: 0, y: 0, speed: 1.8 };

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

  if (e.key === "Enter" && (gameState !== STATE.PLAY)) {
    startGame();
  }
});
window.addEventListener("keyup", e => keys[e.key] = false);

// =====================
// touch input
// =====================
let touchActive = false;
let touchX = 0;
let touchY = 0;

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  touchActive = true;
  const t = e.touches[0];
  touchX = t.clientX;
  touchY = t.clientY;
});

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  const t = e.touches[0];
  touchX = t.clientX;
  touchY = t.clientY;
});

canvas.addEventListener("touchend", () => {
  touchActive = false;
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
  player.x = canvas.width / 2 - SIZE / 2;
  player.y = canvas.height / 2 - SIZE / 2;
  enemy.x  = canvas.width / 4;
  enemy.y  = canvas.height / 4;
  enemy.speed = 1.8;
  level = 1;
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

  if (touchActive) {
    const dx = touchX - (player.x + SIZE / 2);
    const dy = touchY - (player.y + SIZE / 2);
    const dist = Math.hypot(dx, dy);
    if (dist > 5) {
      player.x += (dx / dist) * player.speed;
      player.y += (dy / dist) * player.speed;
    }
  }

  player.x = clamp(player.x, 0, canvas.width  - SIZE);
  player.y = clamp(player.y, 0, canvas.height - SIZE);
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

// =====================
// draw
// =====================
function drawTitle() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.font = "48px sans-serif";
  ctx.fillText("林を作らないゲーム", canvas.width / 2, canvas.height / 2 - 80);
  ctx.font = "24px sans-serif";
  ctx.fillText("クリック or Enter でスタート", canvas.width / 2, canvas.height / 2 + 40);
}

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(playerImg, player.x, player.y, SIZE, SIZE);
  ctx.drawImage(enemyImg, enemy.x, enemy.y, SIZE, SIZE);

  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.font = "20px sans-serif";
  ctx.fillText(`TIME : ${surviveTime.toFixed(1)}`, 20, 40);
  ctx.fillText(`LEVEL : ${level}`, 20, 70);
}

function drawGameOver() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.font = "48px sans-serif";
  ctx.fillText("林", canvas.width / 2, canvas.height / 2 - 80);
  ctx.font = "24px sans-serif";
  ctx.fillText(`生存時間 : ${surviveTime.toFixed(1)} 秒`, canvas.width / 2, canvas.height / 2);
  ctx.fillText("クリック or Enter で再スタート", canvas.width / 2, canvas.height / 2 + 60);
}

// =====================
// loop
// =====================
function gameLoop() {
  if (gameState === STATE.TITLE) {
    drawTitle();
  }

  if (gameState === STATE.PLAY) {
    surviveTime = (performance.now() - startTime) / 1000;
    level = Math.floor(surviveTime / 10) + 1;
    enemy.speed = 1.8 + level * 0.3;

    updatePlayer();
    updateEnemy();
    drawGame();

    if (isHit(player, enemy)) {
      gameState = STATE.GAMEOVER;
    }
  }

  if (gameState === STATE.GAMEOVER) {
    drawGameOver();
  }

  requestAnimationFrame(gameLoop);
}

// =====================
// start safely
// =====================
let started = false;
function safeStart() {
  if (!started) {
    started = true;
    gameLoop();
  }
}
playerImg.onload = safeStart;
enemyImg.onload  = safeStart;
setTimeout(safeStart, 500);
