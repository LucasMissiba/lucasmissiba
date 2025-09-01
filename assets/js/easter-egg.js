(() => {
  const DMG = {
    light: '#f2f2f2',
    mid: '#d9d9d9',
    dark: '#8a8a8a',
    darkest: '#111111'
  };

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'egg-overlay';
    overlay.id = 'egg-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const gb = document.createElement('div');
    gb.className = 'egg-gb';
    gb.setAttribute('role', 'dialog');
    gb.setAttribute('aria-modal', 'true');
    gb.setAttribute('aria-label', 'Mini jogo estilo Game Boy');
    overlay.appendChild(gb);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'egg-close';
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.innerHTML = '✕';
    gb.appendChild(closeBtn);

    const bezel = document.createElement('div');
    bezel.className = 'bezel';
    gb.appendChild(bezel);

    const screen = document.createElement('div');
    screen.className = 'screen';
    gb.appendChild(screen);

    const canvas = document.createElement('canvas');
    canvas.className = 'egg-canvas';
    screen.appendChild(canvas);

    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.id = 'egg-hud';
    hud.textContent = 'Score: 0 • Vidas: 3';
    screen.appendChild(hud);

    const hint = document.createElement('div');
    hint.className = 'egg-hint';
    hint.textContent = 'Clique nas estrelas';
    screen.appendChild(hint);

    const logo = document.createElement('div');
    logo.className = 'logo';
    logo.textContent = 'LM BOY';
    gb.appendChild(logo);

    const controls = document.createElement('div');
    controls.className = 'controls';
    gb.appendChild(controls);

    const btnA = document.createElement('button');
    btnA.className = 'egg-btn';
    btnA.dataset.btn = 'A';
    btnA.title = 'A';
    controls.appendChild(btnA);

    const btnB = document.createElement('button');
    btnB.className = 'egg-btn';
    btnB.dataset.btn = 'B';
    btnB.title = 'B';
    controls.appendChild(btnB);

    const meta = document.createElement('div');
    meta.className = 'meta';
    gb.appendChild(meta);

    const startPill = document.createElement('span');
    startPill.className = 'egg-pill';
    startPill.dataset.btn = 'START';
    startPill.textContent = 'Start';
    meta.appendChild(startPill);

    const selectPill = document.createElement('span');
    selectPill.className = 'egg-pill';
    selectPill.dataset.btn = 'SELECT';
    selectPill.textContent = 'Select';
    meta.appendChild(selectPill);

    document.body.appendChild(overlay);

    return { overlay, gb, screen, canvas, hud, closeBtn, btnA, btnB, startPill, selectPill };
  }

  function fitCanvas(canvas) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createGame(ctx, canvas, hud, scopeEl) {
    // Shooter vertical PB
    let score = 0;
    let lives = 3;
    let running = false;
    let visible = false;
    let rafId = 0;
    let state = 'menu'; // 'menu' | 'playing' | 'gameover'

    // entidades
    const stars = [];
    const columns = [];
    const enemies = [];
    const bullets = [];

    const config = {
      starCount: 80,
      starMinSpeed: 28,
      starMaxSpeed: 90,
      playerSpeed: 280,
      bulletSpeed: 520,
      columnSpawnMs: 900,
      enemySpawnMs: 1500,
      columnSpeed: 180,
      enemySpeed: 200,
      columnWMin: 3,
      columnWMax: 6,
      columnHMin: 60,
      columnHMax: 160
    };

    const keys = new Set();

    const player = { x: 0, y: 0, w: 18, h: 22, lastShot: 0, shotCooldown: 220 };

    function randomBetween(min, max) { return Math.random() * (max - min) + min; }

    function resetPlayer() {
      player.x = Math.round(canvas.clientWidth / 2 - player.w / 2);
      player.y = Math.round(canvas.clientHeight - player.h - 16);
      player.lastShot = 0;
    }

    function ensureStars() {
      while (stars.length < config.starCount) {
        stars.push({
          x: Math.random() * canvas.clientWidth,
          y: Math.random() * canvas.clientHeight,
          s: randomBetween(config.starMinSpeed, config.starMaxSpeed),
          r: Math.random() < 0.85 ? 1 : 2
        });
      }
    }

    function spawnColumn() {
      const w = Math.round(randomBetween(config.columnWMin, config.columnWMax));
      const h = Math.round(randomBetween(config.columnHMin, config.columnHMax));
      const x = Math.round(randomBetween(8, Math.max(8, canvas.clientWidth - w - 8)));
      columns.push({ x, y: -h, w, h, vy: config.columnSpeed });
    }

    function spawnEnemy() {
      const w = 16, h = 18;
      const x = Math.round(randomBetween(10, canvas.clientWidth - w - 10));
      enemies.push({ x, y: -h, w, h, vy: config.enemySpeed, t: Math.random() * Math.PI * 2 });
    }

    function shoot(now) {
      if (now - player.lastShot < player.shotCooldown) return;
      player.lastShot = now;
      bullets.push({ x: player.x + player.w / 2 - 1, y: player.y - 6, w: 2, h: 8, vy: -config.bulletSpeed });
    }

    function setHud() { hud.textContent = `Score: ${score} • Vidas: ${lives}`; }

    function drawBackground() {
      ctx.fillStyle = '#0f0f0f';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      // estrelas
      ctx.fillStyle = '#ffffff';
      for (const st of stars) {
        ctx.fillRect(st.x | 0, st.y | 0, st.r, st.r);
      }
    }

    function drawPlayer() {
      const x = player.x, y = player.y, w = player.w, h = player.h;
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#0f0f0f';

      // Corpo com curvas (contorno branco)
      ctx.beginPath();
      ctx.moveTo(w * 0.50, 0);
      ctx.quadraticCurveTo(w * 0.28, h * 0.10, w * 0.24, h * 0.28);
      ctx.quadraticCurveTo(w * 0.22, h * 0.46, w * 0.30, h * 0.60);
      ctx.quadraticCurveTo(w * 0.20, h * 0.72, w * 0.28, h * 0.82);
      ctx.lineTo(w * 0.38, h * 0.92);
      ctx.lineTo(w * 0.50, h * 1.00);
      ctx.lineTo(w * 0.62, h * 0.92);
      ctx.quadraticCurveTo(w * 0.72, h * 0.82, w * 0.70, h * 0.60);
      ctx.quadraticCurveTo(w * 0.78, h * 0.46, w * 0.76, h * 0.28);
      ctx.quadraticCurveTo(w * 0.72, h * 0.10, w * 0.50, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Janela circular
      ctx.beginPath();
      ctx.arc(w * 0.50, h * 0.26, Math.max(1, w * 0.12), 0, Math.PI * 2);
      ctx.stroke();

      // Motores inferiores (meia-lua)
      ctx.beginPath();
      ctx.arc(w * 0.38, h * 0.94, w * 0.09, Math.PI, 0, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w * 0.62, h * 0.94, w * 0.09, Math.PI, 0, false);
      ctx.stroke();

      ctx.restore();
    }

    function drawColumns() {
      ctx.fillStyle = '#ffffff';
      for (const c of columns) ctx.fillRect(c.x | 0, c.y | 0, c.w | 0, c.h | 0);
    }

    function drawEnemies() {
      ctx.fillStyle = '#ffffff';
      for (const e of enemies) {
        ctx.beginPath();
        ctx.moveTo(e.x + e.w / 2, e.y);
        ctx.lineTo(e.x, e.y + e.h);
        ctx.lineTo(e.x + e.w, e.y + e.h);
        ctx.closePath();
        ctx.fill();
      }
    }

    function drawBullets() {
      ctx.fillStyle = '#ffffff';
      for (const b of bullets) ctx.fillRect(b.x | 0, b.y | 0, b.w | 0, b.h | 0);
    }

    function aabb(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

    let lastColSpawn = 0, lastEnemySpawn = 0;

    function update(dt, now) {
      // stars
      for (const st of stars) {
        st.y += st.s * dt;
        if (st.y > canvas.clientHeight) { st.y = -2; st.x = Math.random() * canvas.clientWidth; }
      }

      // movimento do jogador
      let dx = 0;
      if (keys.has('ArrowLeft')) dx -= 1;
      if (keys.has('ArrowRight')) dx += 1;
      player.x += dx * config.playerSpeed * dt;
      if (player.x < 4) player.x = 4;
      if (player.x + player.w > canvas.clientWidth - 4) player.x = canvas.clientWidth - player.w - 4;

      if (keys.has('Space')) shoot(now);

      // spawns
      if (now - lastColSpawn > config.columnSpawnMs) { spawnColumn(); lastColSpawn = now; }
      if (now - lastEnemySpawn > config.enemySpawnMs) { spawnEnemy(); lastEnemySpawn = now; }

      // atualiza colunas e inimigos
      for (const c of columns) c.y += c.vy * dt;
      for (const e of enemies) { e.y += e.vy * dt; e.x += Math.sin((now / 600 + e.t)) * 0.4; }

      // balas
      for (const b of bullets) b.y += b.vy * dt;

      // colisões bala x inimigos/colunas
      for (const b of bullets) {
        if (b._dead) continue;
        for (const e of enemies) {
          if (!e._dead && aabb(b, e)) { e._dead = true; b._dead = true; score += 10; break; }
        }
        if (!b._dead) {
          for (const c of columns) { if (!c._dead && aabb(b, c)) { c._dead = true; b._dead = true; score += 5; break; } }
        }
      }

      // colisões player x obstaculos
      for (const e of enemies) if (!e._dead && aabb(player, e)) { e._dead = true; lives -= 1; }
      for (const c of columns) if (!c._dead && aabb(player, c)) { c._dead = true; lives -= 1; }

      // limpeza
      function inView(o) { return o.y < canvas.clientHeight + 40 && o.y + (o.h || 0) > -40; }
      for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i]._dead || bullets[i].y + bullets[i].h < 0) bullets.splice(i, 1);
      for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i]._dead || !inView(enemies[i])) enemies.splice(i, 1);
      for (let i = columns.length - 1; i >= 0; i--) if (columns[i]._dead || !inView(columns[i])) columns.splice(i, 1);
    }

    function drawGame() {
      drawBackground();
      drawColumns();
      drawEnemies();
      drawBullets();
      drawPlayer();
    }

    function drawMenu() {
      drawBackground();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '700 18px Orbitron, system-ui, sans-serif';
      ctx.fillText('SPACE SHOOTER', canvas.clientWidth / 2, canvas.clientHeight * 0.40);
      ctx.font = '400 13px Rajdhani, system-ui, sans-serif';
      ctx.fillText('Setas: mover  •  Espaço: atirar  •  R: reset', canvas.clientWidth / 2, canvas.clientHeight * 0.55);
    }

    function drawGameOver() {
      drawBackground();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '700 20px Orbitron, system-ui, sans-serif';
      ctx.fillText('GAME OVER', canvas.clientWidth / 2, canvas.clientHeight * 0.45);
      ctx.font = '400 13px Rajdhani, system-ui, sans-serif';
      ctx.fillText('Pressione Enter para reiniciar', canvas.clientWidth / 2, canvas.clientHeight * 0.58);
    }

    function loop(prevTs) {
      if (!running || !visible) return;
      rafId = requestAnimationFrame(ts => {
        const dt = Math.min(0.033, (ts - prevTs) / 1000);
        const now = performance.now();
        ensureStars();
        if (state === 'playing') {
          update(dt, now);
          drawGame();
          setHud();
          if (lives <= 0) { state = 'gameover'; running = false; drawGameOver(); }
        } else if (state === 'menu') {
          drawMenu();
        } else if (state === 'gameover') {
          drawGameOver();
        }
        loop(ts);
      });
    }

    function reset() {
      score = 0; lives = 3;
      stars.length = 0; columns.length = 0; enemies.length = 0; bullets.length = 0;
      resetPlayer();
      setHud();
    }

    function startGame() { reset(); state = 'playing'; running = true; }

    function open() { visible = true; running = true; state = 'menu'; resetPlayer(); setHud(); cancelAnimationFrame(rafId); loop(performance.now()); }
    function close() { visible = false; running = false; cancelAnimationFrame(rafId); rafId = 0; }

    function isActive() {
      if (!visible) return false;
      if (!scopeEl) return true;
      const a = document.activeElement;
      return a === scopeEl || (a && scopeEl.contains(a));
    }

    function keyDown(e) {
      if (isActive()) {
        if (e.code === 'Space' || e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
        keys.add(e.code === 'Space' ? 'Space' : e.key);
      }
    }
    function keyUp(e) {
      if (isActive()) {
        if (e.code === 'Space' || e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault();
        keys.delete(e.code === 'Space' ? 'Space' : e.key);
      }
    }

    function keyHandler(e) {
      if (!visible) return;
      if (e.key === 'Escape') { close(); return; }
      if (state === 'menu') {
        if (e.key === 'Enter' || e.code === 'Space') startGame();
      } else if (state === 'playing') {
        if (e.key.toLowerCase() === 'r') reset();
      } else if (state === 'gameover') {
        if (e.key === 'Enter' || e.code === 'Space') startGame();
      }
    }

    window.addEventListener('keydown', keyDown, { passive: false });
    window.addEventListener('keyup', keyUp, { passive: false });
    window.addEventListener('keydown', keyHandler, { passive: false });

    return { open, close, startGame, reset, isVisible: () => visible, state: () => state };
  }

  function findTrigger() {
    let t = document.getElementById('egg-trigger');
    if (t) return t;
    // fallback: procurar pelo texto "Mudar faz Bem" na legenda
    const cands = Array.from(document.querySelectorAll('.three-caption'));
    t = cands.find(el => /mudar\s*faz\s*bem/i.test((el.textContent || '').trim())) || null;
    return t;
  }

  function setupInline(inlineHost) {
    // constrói um canvas/hud inline no container pedido
    const canvas = document.createElement('canvas');
    const hud = document.createElement('div');
    hud.className = 'hud';
    inlineHost.innerHTML = '';
    inlineHost.appendChild(canvas);
    inlineHost.appendChild(hud);
    inlineHost.hidden = false;
    inlineHost.tabIndex = 0;
    inlineHost.style.outline = 'none';

    const ctx = canvas.getContext('2d');
    const ro = new ResizeObserver(() => fitCanvas(canvas));
    ro.observe(inlineHost);
    fitCanvas(canvas);

    const game = createGame(ctx, canvas, hud, inlineHost);
    // garante foco e inicio em navegadores que pausam rAF fora de foco
    setTimeout(() => { inlineHost.focus({ preventScroll: true }); game.open(); game.startGame(); }, 0);
    return game;
  }

  function setupWithTrigger(trigger) {
    const inlineHost = document.getElementById('egg-inline');
    if (inlineHost) {
      trigger.addEventListener('click', () => setupInline(inlineHost));
      trigger.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setupInline(inlineHost); } });
      return; // usa inline, não overlay
    }

    const { overlay, canvas, hud, closeBtn, btnA, btnB, startPill, selectPill } = createOverlay();

    const ctx = canvas.getContext('2d');
    function size() { fitCanvas(canvas); }
    size();
    window.addEventListener('resize', size);

    const game = createGame(ctx, canvas, hud);

    function showOverlay() {
      overlay.classList.add('visible');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      fitCanvas(canvas);
      game.open();
    }
    function hideOverlay() {
      overlay.classList.remove('visible');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      game.close();
    }

    trigger.style.cursor = 'pointer';
    trigger.setAttribute('role', trigger.getAttribute('role') || 'button');
    trigger.setAttribute('tabindex', trigger.getAttribute('tabindex') || '0');
    trigger.title = trigger.title || 'Abrir mini jogo';
    trigger.addEventListener('click', showOverlay);
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showOverlay(); }
    });

    // delegação extra: clicar em qualquer .three-caption abre também
    const interactiveSection = document.getElementById('interactive3d');
    if (interactiveSection) {
      interactiveSection.addEventListener('click', (ev) => {
        const el = ev.target;
        if (el && el.classList && el.classList.contains('three-caption')) showOverlay();
      });
    }

    // extras: abrir com duplo clique na area 3D
    const three = document.getElementById('three-container');
    if (three) three.addEventListener('dblclick', showOverlay);

    closeBtn.addEventListener('click', hideOverlay);
    btnA.addEventListener('click', () => {
      const st = game.state();
      if (st === 'menu' || st === 'gameover') game.startGame();
      else game.reset();
    });
    btnB.addEventListener('click', hideOverlay);
    startPill.addEventListener('click', () => game.startGame());
    selectPill.addEventListener('click', hideOverlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hideOverlay();
    });
  }

  function init() {
    const t = findTrigger();
    if (t) { setupWithTrigger(t); return; }
    // fallback: observar até aparecer (caso o HTML seja reidratado/trocado)
    const mo = new MutationObserver(() => {
      const x = findTrigger();
      if (x) { mo.disconnect(); setupWithTrigger(x); }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


