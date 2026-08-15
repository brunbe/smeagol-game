// ─── Sméagol's Precious – Game Logic ─────────────────────────────────────────

const canvas  = document.getElementById('gameCanvas');
const ctx     = canvas.getContext('2d');

const W = canvas.width;   // 600
const H = canvas.height;  // 400
const TILE = 40;
const COLS = W / TILE;    // 15
const ROWS = H / TILE;    // 10

// ── DOM refs ──────────────────────────────────────────────────────────────────
const scoreEl   = document.getElementById('score');
const livesEl   = document.getElementById('lives');
const levelEl   = document.getElementById('level');
const messageEl = document.getElementById('message');
const msgTitle  = document.getElementById('message-title');
const msgBody   = document.getElementById('message-body');
const msgBtn    = document.getElementById('message-btn');

// ── Game state ────────────────────────────────────────────────────────────────
let state, score, lives, level, rings, enemies, player, keys, animFrame;

function initGame() {
  score  = 0;
  lives  = 3;
  level  = 1;
  keys   = {};
  startLevel();
  hideMessage();
}

function startLevel() {
  levelEl.textContent = level;
  scoreEl.textContent = score;
  livesEl.textContent = lives;

  player = {
    x: TILE,
    y: TILE,
    w: TILE - 4,
    h: TILE - 4,
    vx: 0,
    vy: 0,
    speed: 3,
    moving: false,
    frame: 0,
    frameTick: 0,
  };

  // Place rings on every empty cell except player start and border edges
  rings = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (row === 0 && col === 0) continue; // player start
      rings.push({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2, collected: false });
    }
  }

  // Enemies – each level adds one more, starting at 2
  enemies = [];
  const enemyCount = 1 + level;
  const safePositions = [
    { col: COLS - 2, row: ROWS - 2 },
    { col: COLS - 2, row: 1 },
    { col: 1,        row: ROWS - 2 },
    { col: Math.floor(COLS / 2), row: Math.floor(ROWS / 2) },
    { col: Math.floor(COLS / 2), row: 1 },
  ];
  for (let i = 0; i < Math.min(enemyCount, safePositions.length); i++) {
    const sp = safePositions[i];
    enemies.push({
      x: sp.col * TILE + TILE / 2,
      y: sp.row * TILE + TILE / 2,
      w: TILE - 4,
      h: TILE - 4,
      angle: Math.random() * Math.PI * 2,
      speed: 1.2 + level * 0.3,
      changeTimer: 0,
    });
  }

  state = 'playing';
}

// ── Input ─────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => { keys[e.key] = true; });
document.addEventListener('keyup',   e => { keys[e.key] = false; });

// ── Update ────────────────────────────────────────────────────────────────────
function update() {
  if (state !== 'playing') return;

  // Player movement
  player.vx = 0;
  player.vy = 0;
  if (keys['ArrowLeft']  || keys['a'] || keys['A']) player.vx = -player.speed;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) player.vx =  player.speed;
  if (keys['ArrowUp']    || keys['w'] || keys['W']) player.vy = -player.speed;
  if (keys['ArrowDown']  || keys['s'] || keys['S']) player.vy =  player.speed;

  player.moving = player.vx !== 0 || player.vy !== 0;

  // Diagonal normalise
  if (player.vx !== 0 && player.vy !== 0) {
    player.vx *= Math.SQRT1_2;
    player.vy *= Math.SQRT1_2;
  }

  player.x = Math.max(2, Math.min(W - player.w - 2, player.x + player.vx));
  player.y = Math.max(2, Math.min(H - player.h - 2, player.y + player.vy));

  // Animate player sprite
  if (player.moving) {
    player.frameTick++;
    if (player.frameTick >= 8) { player.frame = (player.frame + 1) % 4; player.frameTick = 0; }
  }

  // Ring collection
  for (const ring of rings) {
    if (ring.collected) continue;
    const rx = ring.x - player.x - player.w / 2;
    const ry = ring.y - player.y - player.h / 2;
    if (Math.abs(rx) < TILE * 0.6 && Math.abs(ry) < TILE * 0.6) {
      ring.collected = true;
      score++;
      scoreEl.textContent = score;
    }
  }

  // Check level complete
  if (rings.every(r => r.collected)) {
    level++;
    if (level > 5) {
      showMessage('🎉 You Won!', `Sméagol has reclaimed the Precious! Final score: ${score}`, true);
      state = 'won';
    } else {
      showMessage(`Level ${level - 1} Complete!`, `My Precious… collecting them all! Onwards to level ${level}!`, false, () => startLevel());
      state = 'levelup';
    }
    return;
  }

  // Enemy movement – random walk that bounces off walls
  for (const en of enemies) {
    en.changeTimer--;
    if (en.changeTimer <= 0) {
      en.angle = Math.random() * Math.PI * 2;
      en.changeTimer = 40 + Math.random() * 60;
    }
    en.x += Math.cos(en.angle) * en.speed;
    en.y += Math.sin(en.angle) * en.speed;

    // Bounce off walls
    if (en.x < TILE / 2)     { en.x = TILE / 2;     en.angle = Math.PI - en.angle; }
    if (en.x > W - TILE / 2) { en.x = W - TILE / 2; en.angle = Math.PI - en.angle; }
    if (en.y < TILE / 2)     { en.y = TILE / 2;     en.angle = -en.angle; }
    if (en.y > H - TILE / 2) { en.y = H - TILE / 2; en.angle = -en.angle; }

    // Collision with player
    const dx = en.x - (player.x + player.w / 2);
    const dy = en.y - (player.y + player.h / 2);
    if (Math.sqrt(dx * dx + dy * dy) < TILE * 0.7) {
      lives--;
      livesEl.textContent = lives;
      if (lives <= 0) {
        showMessage('💀 Game Over', `"We wants it, we needs it… but we losssed it." Score: ${score}`, true);
        state = 'gameover';
      } else {
        // Reset player position
        player.x = TILE;
        player.y = TILE;
        showMessage(`Caught by the Eye!`, `${lives} ${lives === 1 ? 'life' : 'lives'} remaining. Watch out!`, false, () => { state = 'playing'; });
        state = 'paused';
      }
      return;
    }
  }
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, W, H);

  // Background grid (subtle swamp tiles)
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#111108' : '#0e0e06';
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
    }
  }

  // Rings
  for (const ring of rings) {
    if (ring.collected) continue;
    drawRing(ring.x, ring.y);
  }

  // Enemies (Eye of Sauron style)
  for (const en of enemies) {
    drawEye(en.x, en.y);
  }

  // Player (Sméagol)
  drawSmeagol(player.x + player.w / 2, player.y + player.h / 2, player.frame, player.moving);
}

function drawRing(x, y) {
  const t = Date.now() / 800;
  const glow = Math.sin(t) * 0.5 + 0.5;
  ctx.save();
  ctx.translate(x, y);

  // Outer glow
  ctx.shadowColor = `rgba(255,215,0,${0.4 + glow * 0.4})`;
  ctx.shadowBlur = 10;

  // Ring shape
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,${180 + Math.floor(glow * 75)},0,1)`;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Inner highlight
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,245,180,${0.5 + glow * 0.5})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function drawEye(x, y) {
  ctx.save();
  ctx.translate(x, y);

  const t = Date.now() / 500;
  const pulse = Math.sin(t) * 0.15 + 0.85;

  // Slit pupil glow
  ctx.shadowColor = '#ff2200';
  ctx.shadowBlur = 20 * pulse;

  // Outer eye shape
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1a0000';
  ctx.fill();
  ctx.strokeStyle = '#cc2200';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Fiery iris
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(220,60,0,${pulse})`;
  ctx.fill();

  // Slit pupil
  ctx.beginPath();
  ctx.ellipse(0, 0, 3, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#000';
  ctx.fill();

  ctx.restore();
}

function drawSmeagol(x, y, frame, moving) {
  ctx.save();
  ctx.translate(x, y);

  // Bobbing animation
  const bob = moving ? Math.sin(frame * Math.PI / 2) * 2 : 0;

  // Shadow
  ctx.beginPath();
  ctx.ellipse(0, 13 + bob, 10, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.ellipse(0, 4 + bob, 9, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#7a9a6a';
  ctx.fill();
  ctx.strokeStyle = '#4a6a3a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.arc(0, -10 + bob, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#8ab07a';
  ctx.fill();
  ctx.strokeStyle = '#4a6a3a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#d4e8ff';
  ctx.beginPath(); ctx.arc(-3.5, -11 + bob, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( 3.5, -11 + bob, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2244aa';
  ctx.beginPath(); ctx.arc(-3.5, -10.5 + bob, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( 3.5, -10.5 + bob, 1.2, 0, Math.PI * 2); ctx.fill();

  // Ears (large pointy)
  ctx.beginPath();
  ctx.moveTo(-8, -12 + bob);
  ctx.lineTo(-15, -20 + bob);
  ctx.lineTo(-5, -17 + bob);
  ctx.closePath();
  ctx.fillStyle = '#8ab07a';
  ctx.fill();
  ctx.strokeStyle = '#4a6a3a';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(8, -12 + bob);
  ctx.lineTo(15, -20 + bob);
  ctx.lineTo(5, -17 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Arms
  const armSwing = moving ? Math.sin(frame * Math.PI / 2) * 4 : 0;
  ctx.strokeStyle = '#7a9a6a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -2 + bob);
  ctx.lineTo(-14, 6 + bob + armSwing);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, -2 + bob);
  ctx.lineTo(14, 6 + bob - armSwing);
  ctx.stroke();

  ctx.restore();
}

// ── Message overlay ───────────────────────────────────────────────────────────
function showMessage(title, body, showRestart, callback) {
  msgTitle.textContent = title;
  msgBody.textContent  = body;
  msgBtn.textContent   = showRestart ? 'Play Again' : 'Continue';
  messageEl.classList.remove('hidden');

  msgBtn.onclick = () => {
    messageEl.classList.add('hidden');
    if (showRestart) {
      initGame();
      cancelAnimationFrame(animFrame);
      loop();
    } else if (callback) {
      callback();
    }
  };
}

function hideMessage() {
  messageEl.classList.add('hidden');
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function loop() {
  if (state === 'won' || state === 'gameover') {
    cancelAnimationFrame(animFrame);
    draw();
    return;
  }
  update();
  draw();
  animFrame = requestAnimationFrame(loop);
}

// ── Start ─────────────────────────────────────────────────────────────────────
initGame();
loop();
