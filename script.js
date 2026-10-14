const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const sprites = {
  trex: new Image(),
  sauropod: new Image(),
  cactus: new Image(),
};
sprites.trex.src = 'assets/trex.svg';
sprites.sauropod.src = 'assets/sauropod.svg';
sprites.cactus.src = 'assets/cactus.svg';

const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const healthBar = document.getElementById('healthBar');
const energyBar = document.getElementById('energyBar');
const weaponLabel = document.getElementById('weaponLabel');
const bestScoreKey = 'dinoBestScore';

const groundY = canvas.height - 60;
const world = {
  score: 0,
  bestScore: Number(localStorage.getItem(bestScoreKey) || 0),
  lastTime: 0,
  obstacleTimer: 0,
  pickupTimer: 0,
  isOver: false,
  isPaused: false,
  combo: 1,
};

const weapons = [
  { name: 'Súng thường', damage: 25, cooldown: 250, speed: 9, color: '#7dd3fc', energyCost: 0 },
  { name: 'Laser', damage: 42, cooldown: 170, speed: 12, color: '#fbbf24', energyCost: 12 },
  { name: 'Bom', damage: 60, cooldown: 500, speed: 6, color: '#fb7185', energyCost: 18 },
];

const state = {
  player: {
    x: 90,
    y: groundY - 52,
    width: 52,
    height: 52,
    vy: 0,
    speed: 260,
    onGround: true,
    health: 100,
    energy: 100,
    weaponIndex: 0,
    facing: 1,
    shootCooldown: 0,
    invuln: 0,
  },
  projectiles: [],
  enemies: [],
  pickups: [],
  particles: [],
  floatingTexts: [],
};

window.__gameDebug = { state, weapons, sprites };

const keys = {};

document.addEventListener('keydown', (event) => {
  keys[event.code] = true;

  if (event.code === 'KeyH' && !event.repeat && !world.isOver) {
    world.isPaused = !world.isPaused;
    keys.KeyA = false;
    keys.KeyD = false;
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    keys.KeyW = false;
    keys.Space = false;
    return;
  }

  if (event.code === 'Space' || event.code === 'KeyW') {
    event.preventDefault();
    if (state.player.onGround && !world.isOver && !world.isPaused) {
      state.player.vy = -560;
      state.player.onGround = false;
    }
  }

  if (event.code === 'Digit1') state.player.weaponIndex = 0;
  if (event.code === 'Digit2') state.player.weaponIndex = 1;
  if (event.code === 'Digit3') state.player.weaponIndex = 2;

  if (event.code === 'KeyJ') shoot();
  if (event.code === 'KeyR' && world.isOver) resetGame();
});

document.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

function resetGame() {
  world.score = 0;
  world.combo = 1;
  world.isOver = false;
  world.isPaused = false;
  state.player.x = 90;
  state.player.y = groundY - 52;
  state.player.vy = 0;
  state.player.speed = 260;
  state.player.health = 100;
  state.player.energy = 100;
  state.player.weaponIndex = 0;
  state.projectiles = [];
  state.enemies = [];
  state.pickups = [];
  state.particles = [];
  state.floatingTexts = [];
  world.obstacleTimer = 0;
  world.pickupTimer = 1000;
  updateHud();
}

function addFloatingText(x, y, text, color) {
  state.floatingTexts.push({ x, y, text, color, life: 900, vy: -22 });
}

function saveBestScore() {
  localStorage.setItem(bestScoreKey, String(Math.floor(world.bestScore)));
}

function shoot() {
  if (world.isOver || world.isPaused) return;

  const weapon = weapons[state.player.weaponIndex];
  const now = performance.now();
  if (state.player.shootCooldown > now) return;
  if (state.player.energy < weapon.energyCost) return;

  state.player.energy = Math.max(0, state.player.energy - weapon.energyCost);
  state.player.shootCooldown = now + weapon.cooldown;

  const projectile = {
    x: state.player.x + state.player.width + 8,
    y: state.player.y + 20,
    r: weapon.name === 'Bom' ? 12 : 7,
    dx: weapon.speed * state.player.facing,
    dy: 0,
    damage: weapon.damage,
    color: weapon.color,
  };

  state.projectiles.push(projectile);
  updateHud();
}

function spawnEnemy() {
  const difficulty = Math.min(10, Math.floor(world.score / 150));
  const type = Math.random() < 0.6 ? 'sauropod' : 'cactus';
  const enemy = {
    x: canvas.width + 40,
    y: type === 'sauropod' ? 180 + Math.random() * 150 : groundY - 40,
    width: type === 'sauropod' ? 34 : 38,
    height: type === 'sauropod' ? 34 : 40,
    speed: 170 + Math.random() * 80 + difficulty * 26,
    health: type === 'sauropod' ? 45 : 60,
    color: type === 'sauropod' ? '#fca5a5' : '#cbd5e1',
    type,
  };
  state.enemies.push(enemy);
}

function spawnPickup() {
  state.pickups.push({
    x: canvas.width + 20,
    y: 110 + Math.random() * 240,
    size: 14,
    value: 30,
    color: '#facc15',
    speed: 180,
  });
}

function updateHud() {
  scoreEl.textContent = Math.floor(world.score);
  bestScoreEl.textContent = Math.floor(world.bestScore);
  healthBar.style.width = `${state.player.health}%`;
  energyBar.style.width = `${state.player.energy}%`;
  weaponLabel.textContent = weapons[state.player.weaponIndex].name;
}

function handleInput(dt) {
  const move = (keys.KeyA || keys.ArrowLeft ? -1 : 0) + (keys.KeyD || keys.ArrowRight ? 1 : 0);
  state.player.x += move * state.player.speed * dt;
  state.player.x = Math.max(20, Math.min(canvas.width - state.player.width - 20, state.player.x));

  if (move !== 0) state.player.facing = move;

  if ((keys.KeyW || keys.Space) && state.player.onGround && !world.isOver) {
    state.player.vy = -560;
    state.player.onGround = false;
  }
}

function update(dt) {
  if (world.isOver || world.isPaused) return;

  state.player.vy += 1400 * dt;
  state.player.y += state.player.vy * dt;

  if (state.player.y + state.player.height >= groundY) {
    state.player.y = groundY - state.player.height;
    state.player.vy = 0;
    state.player.onGround = true;
  }

  handleInput(dt);

  for (const projectile of state.projectiles) {
    projectile.x += projectile.dx * dt * 60;
    projectile.y += projectile.dy * dt * 60;
  }

  state.projectiles = state.projectiles.filter((p) => p.x < canvas.width + 60 && p.y > -40 && p.y < canvas.height + 40);

  world.obstacleTimer -= dt * 1000;
  if (world.obstacleTimer <= 0) {
    spawnEnemy();
    const difficulty = Math.min(10, Math.floor(world.score / 150));
    world.obstacleTimer = Math.max(420, 1400 - difficulty * 95 - Math.min(180, world.score * 0.25));
  }

  world.pickupTimer -= dt * 1000;
  if (world.pickupTimer <= 0) {
    spawnPickup();
    world.pickupTimer = 7000 + Math.random() * 5000;
  }

  for (const enemy of state.enemies) {
    enemy.x -= enemy.speed * dt;
  }

  for (const pickup of state.pickups) {
    pickup.x -= pickup.speed * dt;
  }

  for (const projectile of [...state.projectiles]) {
    for (const enemy of [...state.enemies]) {
      const dx = projectile.x - (enemy.x + enemy.width / 2);
      const dy = projectile.y - (enemy.y + enemy.height / 2);
      const hit = Math.abs(dx) < (projectile.r + enemy.width / 2) && Math.abs(dy) < (projectile.r + enemy.height / 2);

      if (hit) {
        enemy.health -= projectile.damage;
        projectile.x = -1000;
        if (enemy.health <= 0) {
          const reward = 25 + world.combo * 10;
          world.score += reward;
          world.combo = Math.min(world.combo + 1, 8);
          addFloatingText(enemy.x + enemy.width / 2, enemy.y, `+${reward}`, '#fbbf24');
          spawnBurst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#fca5a5');
          state.enemies = state.enemies.filter((e) => e !== enemy);
        }
      }
    }
  }

  for (const pickup of [...state.pickups]) {
    const px = pickup.x + pickup.size / 2;
    const py = pickup.y + pickup.size / 2;
    const playerCenterX = state.player.x + state.player.width / 2;
    const playerCenterY = state.player.y + state.player.height / 2;
    const dx = px - playerCenterX;
    const dy = py - playerCenterY;

    if (Math.abs(dx) < (pickup.size + state.player.width) / 2 && Math.abs(dy) < (pickup.size + state.player.height) / 2) {
      state.player.energy = Math.min(100, state.player.energy + pickup.value);
      world.score += 12;
      addFloatingText(px, py - 8, '+12', '#93c5fd');
      state.pickups = state.pickups.filter((item) => item !== pickup);
      spawnBurst(px, py, '#facc15');
    }
  }

  for (const enemy of [...state.enemies]) {
    const overlap = !(
      state.player.x + state.player.width < enemy.x ||
      state.player.x > enemy.x + enemy.width ||
      state.player.y + state.player.height < enemy.y ||
      state.player.y > enemy.y + enemy.height
    );

    if (overlap) {
      if (state.player.invuln <= 0) {
        state.player.health = Math.max(0, state.player.health - 15);
        state.player.invuln = 700;
        world.combo = 1;
        addFloatingText(state.player.x + state.player.width / 2, state.player.y - 8, '-15', '#f87171');
        spawnBurst(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, '#fb7185');
      }
      enemy.x = canvas.width + 50;
    }
  }

  if (state.player.invuln > 0) state.player.invuln -= dt * 1000;

  if (state.player.health <= 0) {
    world.isOver = true;
    world.bestScore = Math.max(world.bestScore, Math.floor(world.score));
    saveBestScore();
  }

  state.player.energy = Math.min(100, state.player.energy + dt * 8);
  state.projectiles = state.projectiles.filter((p) => p.x > -100);
  state.enemies = state.enemies.filter((enemy) => enemy.x + enemy.width > -50);
  state.pickups = state.pickups.filter((pickup) => pickup.x + pickup.size > -30);

  for (const text of state.floatingTexts) {
    text.y += text.vy * dt;
    text.life -= dt * 1000;
  }

  state.floatingTexts = state.floatingTexts.filter((text) => text.life > 0);

  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt * 1000;
  }

  state.particles = state.particles.filter((p) => p.life > 0);
  world.score += dt * (8 + world.combo * 1.2);
  const scoreRecord = Math.floor(world.score);
  if (scoreRecord > world.bestScore) {
    world.bestScore = scoreRecord;
    saveBestScore();
  }
  updateHud();
}

function spawnBurst(x, y, color) {
  for (let i = 0; i < 12; i++) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 220,
      vy: (Math.random() - 0.5) * 220,
      life: 500 + Math.random() * 300,
      color,
      radius: 3 + Math.random() * 3,
    });
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#0b1120');
  sky.addColorStop(0.35, '#14253a');
  sky.addColorStop(1, '#1b2d42');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 22; i++) {
    const x = (i * 70 + (world.score * 0.5) % 70) % (canvas.width + 80);
    ctx.fillRect(x, 40 + (i % 6) * 26, 2, 2);
  }

  ctx.fillStyle = '#1a2d3d';
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  for (let x = 0; x < canvas.width + 30; x += 30) {
    ctx.fillStyle = '#2f4c6a';
    ctx.fillRect(x - (world.score * 2 % 30), groundY + 10, 18, 12);
  }
}

function drawPlayerShadow(x, y, w, h) {
  ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 10, w / 2.1, 9, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  const { x, y, width, height } = state.player;
  drawPlayerShadow(x, y, width, height);

  if (sprites.trex.complete && sprites.trex.naturalWidth > 0) {
    ctx.save();
    if (state.player.facing === 1) {
      ctx.translate(x * 2 + width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(sprites.trex, x - 9, y - 12, width + 18, height + 18);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.scale(state.player.facing, 1);
  ctx.translate(-(x + width / 2), -(y + height / 2));

  const bodyGrad = ctx.createLinearGradient(x, y, x + width, y + height);
  bodyGrad.addColorStop(0, '#8cf8a0');
  bodyGrad.addColorStop(1, '#34d399');

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(x + 22, y + 18, 22, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + 12, y + 22);
  ctx.lineTo(x - 12, y + 8);
  ctx.lineTo(x - 2, y + 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x + 32, y + 12, 3.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#65a30d';
  ctx.fillRect(x + 8, y + 28, 8, 14);
  ctx.fillRect(x + 28, y + 28, 8, 14);

  ctx.fillStyle = '#bbf7d0';
  ctx.fillRect(x + 18, y + 2, 12, 12);
  ctx.fillRect(x + 28, y + 6, 8, 8);

  ctx.fillStyle = '#166534';
  ctx.fillRect(x + 8, y + 42, 8, 10);
  ctx.fillRect(x + 28, y + 42, 8, 10);

  ctx.restore();
}

function drawEnemy(enemy) {
  const sprite = enemy.type === 'sauropod' ? sprites.sauropod : sprites.cactus;
  if (sprite.complete && sprite.naturalWidth > 0) {
    if (enemy.type === 'sauropod') {
      ctx.drawImage(sprite, enemy.x - 8, enemy.y - 8, enemy.width + 16, enemy.height + 16);
    } else {
      ctx.drawImage(sprite, enemy.x - 3, enemy.y - 5, enemy.width + 6, enemy.height + 8);
    }
    return;
  }

  if (enemy.type === 'sauropod') {
    ctx.save();
    ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.lineTo(-28, -14);
    ctx.lineTo(-18, -10);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(18, -2);
    ctx.lineTo(28, -14);
    ctx.lineTo(18, -10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#111827';
    ctx.fillRect(-4, -3, 8, 6);
    ctx.restore();
    return;
  }

  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(enemy.x + 12, enemy.y);
  ctx.lineTo(enemy.x + enemy.width, enemy.y + 8);
  ctx.lineTo(enemy.x + enemy.width - 2, enemy.y + enemy.height);
  ctx.lineTo(enemy.x, enemy.y + enemy.height - 6);
  ctx.lineTo(enemy.x + 4, enemy.y + 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.moveTo(enemy.x + 10, enemy.y + 20);
  ctx.lineTo(enemy.x + 30, enemy.y + 4);
  ctx.lineTo(enemy.x + 36, enemy.y + 22);
  ctx.closePath();
  ctx.fill();
}

function drawPickup(pickup) {
  const cx = pickup.x + pickup.size / 2;
  const cy = pickup.y + pickup.size / 2;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + pickup.size / 2 + 4, pickup.size / 1.6, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(cx, pickup.y);
  ctx.lineTo(pickup.x + pickup.size, cy);
  ctx.lineTo(cx, pickup.y + pickup.size);
  ctx.lineTo(pickup.x, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff7b0';
  ctx.fillRect(cx - 3, pickup.y + 5, 6, pickup.size - 10);
}

function drawProjectiles() {
  for (const p of state.projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.radius, p.radius);
  }
}

function drawFloatingTexts() {
  for (const text of state.floatingTexts) {
    ctx.fillStyle = text.color;
    ctx.font = '700 18px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(text.text, text.x, text.y);
  }
}

function drawGameOver() {
  if (!world.isOver) return;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 42px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 18);
  ctx.font = '500 20px Inter';
  ctx.fillText('Nhấn R để chơi lại', canvas.width / 2, canvas.height / 2 + 24);
}

function drawPaused() {
  if (!world.isPaused) return;

  ctx.fillStyle = 'rgba(8, 15, 28, 0.76)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 42px Inter';
  ctx.fillText('TẠM DỪNG', canvas.width / 2, canvas.height / 2 - 12);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 18px Inter';
  ctx.fillText('Nhấn H để tiếp tục', canvas.width / 2, canvas.height / 2 + 28);
}

function render() {
  drawBackground();
  drawProjectiles();
  for (const pickup of state.pickups) drawPickup(pickup);
  for (const enemy of state.enemies) drawEnemy(enemy);
  drawPlayer();
  drawFloatingTexts();
  drawParticles();
  drawPaused();
  drawGameOver();
}

function loop(timestamp) {
  const dt = Math.min((timestamp - world.lastTime) / 1000 || 0.016, 0.025);
  world.lastTime = timestamp;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

resetGame();
requestAnimationFrame(loop);
