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

  function createGame(ctx, canvas, hud) {
    let stars = [];
    let score = 0;
    let lives = 3;
    let lastSpawn = 0;
    let running = false;
    let visible = false;
    let rafId = 0;
    let state = 'menu'; // 'menu' | 'playing' | 'gameover'

    const config = {
      spawnEveryMs: 700,
      minRadius: 8,
      maxRadius: 16,
      minSpeed: 90,
      maxSpeed: 160
    };

    // runner: estado do jogador
    const player = { x: 40, y: 0, size: 22, vy: 0, jumping: false };
    const gravity = 1400;
    function groundY() { return canvas.clientHeight - 26; }

    function randomBetween(min, max) { return Math.random() * (max - min) + min; }

    function spawnStar() {
      const r = randomBetween(config.minRadius, config.maxRadius);
      stars.push({
        x: canvas.clientWidth + r,
        y: groundY() - r,
        r,
        vy: randomBetween(config.minSpeed, config.maxSpeed),
        alive: true
      });
    }

    function drawStar(s) {
      ctx.save();
      ctx.fillStyle = DMG.darkest;
      ctx.beginPath();
      const spikes = 5;
      const outer = s.r;
      const inner = s.r * 0.5;
      let rot = Math.PI / 2 * 3;
      const x = s.x, y = s.y;
      ctx.moveTo(x, y - outer);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(x + Math.cos(rot) * outer, y + Math.sin(rot) * outer);
        rot += Math.PI / spikes;
        ctx.lineTo(x + Math.cos(rot) * inner, y + Math.sin(rot) * inner);
        rot += Math.PI / spikes;
      }
      ctx.lineTo(x, y - outer);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function setHud() {
      hud.textContent = `Score: ${score} • Vidas: ${lives}`;
    }

    function drawBackground() {
      ctx.fillStyle = DMG.light;
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }

    function drawMenu() {
      drawBackground();
      ctx.fillStyle = DMG.darkest;
      ctx.textAlign = 'center';
      ctx.font = '700 24px Orbitron, system-ui, sans-serif';
      ctx.fillText('RUNNER', canvas.clientWidth / 2, canvas.clientHeight * 0.38);
      ctx.font = '400 14px Rajdhani, system-ui, sans-serif';
      ctx.fillText('Espaço/↑ para iniciar e pular', canvas.clientWidth / 2, canvas.clientHeight * 0.52);
    }

    function drawGameOver() {
      drawBackground();
      for (const s of stars) drawStar(s);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      ctx.fillStyle = DMG.darkest;
      ctx.textAlign = 'center';
      ctx.font = '700 22px Orbitron, system-ui, sans-serif';
      ctx.fillText('GAME OVER', canvas.clientWidth / 2, canvas.clientHeight * 0.45);
      ctx.font = '400 14px Rajdhani, system-ui, sans-serif';
      ctx.fillText('Start: Resetar  •  B/Esc: Sair', canvas.clientWidth / 2, canvas.clientHeight * 0.55);
    }

    function update(dt) {
      // jogador
      const base = groundY() - player.size;
      if (player.jumping) {
        player.vy += gravity * dt;
        player.y += player.vy * dt;
        if (player.y >= base) { player.y = base; player.vy = 0; player.jumping = false; }
      } else {
        player.y = base;
      }

      // obstaculos
      for (const s of stars) {
        if (!s.alive) continue;
        s.x -= s.vy * dt * 0.7;
        if (s.x + s.r < 0) { s.alive = false; score += 1; }
        // colisao círculo x retângulo
        const px = player.x, py = player.y, pw = player.size, ph = player.size;
        const nx = Math.max(px, Math.min(s.x, px + pw));
        const ny = Math.max(py, Math.min(s.y, py + ph));
        const dx = s.x - nx, dy = s.y - ny;
        if (dx*dx + dy*dy <= s.r*s.r) { s.alive = false; lives -= 1; }
      }
      stars = stars.filter(s => s.alive);

      const now = performance.now();
      if (now - lastSpawn >= config.spawnEveryMs) {
        spawnStar();
        lastSpawn = now;
      }
    }

    function drawGround() {
      const h = canvas.clientHeight;
      ctx.fillStyle = DMG.mid;
      ctx.fillRect(0, h - 26, canvas.clientWidth, 2);
      // marcas de chão
      ctx.fillStyle = DMG.dark;
      const step = 18;
      for (let x = 0; x < canvas.clientWidth; x += step) ctx.fillRect(x, h - 20, 8, 2);
    }

    function drawGame() {
      drawBackground();
      drawGround();
      for (const s of stars) drawStar(s);
      // personagem simples
      ctx.fillStyle = DMG.darkest;
      ctx.fillRect(player.x, Math.round(player.y), player.size, player.size);
    }

    function loop(prevTs) {
      if (!running || !visible) return;
      rafId = requestAnimationFrame(ts => {
        const dt = Math.min(0.033, (ts - prevTs) / 1000);
        if (state === 'playing') {
          update(dt);
          drawGame();
          setHud();
          if (lives <= 0) {
            state = 'gameover';
            running = false;
            drawGameOver();
          }
        } else if (state === 'menu') {
          drawMenu();
        } else if (state === 'gameover') {
          drawGameOver();
        }
        loop(ts);
      });
    }

    function reset() {
      score = 0;
      lives = 3;
      stars = [];
      lastSpawn = performance.now();
      setHud();
    }

    function startGame() {
      reset();
      state = 'playing';
      running = true;
    }

    function open() {
      visible = true;
      running = true;
      state = 'menu';
      setHud();
      drawMenu();
      cancelAnimationFrame(rafId);
      loop(performance.now());
    }

    function close() {
      visible = false;
      running = false;
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function handlePointerClick(evt) {
      // pulo via clique
      if (state !== 'playing') return;
      jump();
    }

    function jump() { if (!player.jumping) { player.jumping = true; player.vy = -520; } }

    function keyHandler(e) {
      if (!visible) return;
      if (e.key === 'Escape') { close(); return; }
      if (state === 'menu') {
        if (e.key === 'Enter' || e.code === 'Space' || e.key.toLowerCase() === 'a') startGame();
        if (e.key.toLowerCase() === 'b') close();
      } else if (state === 'playing') {
        if (e.key.toLowerCase() === 'r') reset();
        if (e.code === 'Space' || e.code === 'ArrowUp') jump();
        if (e.key.toLowerCase() === 'b') { state = 'menu'; running = false; drawMenu(); }
      } else if (state === 'gameover') {
        if (e.key === 'Enter' || e.code === 'Space' || e.key.toLowerCase() === 'a') startGame();
        if (e.key.toLowerCase() === 'b') close();
      }
    }

    canvas.addEventListener('click', handlePointerClick);
    window.addEventListener('keydown', keyHandler);

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

    const ctx = canvas.getContext('2d');
    const ro = new ResizeObserver(() => fitCanvas(canvas));
    ro.observe(inlineHost);
    fitCanvas(canvas);

    const game = createGame(ctx, canvas, hud);
    // garante inicio em navegadores que pausam rAF fora de foco
    setTimeout(() => { game.open(); game.startGame(); }, 0);
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


