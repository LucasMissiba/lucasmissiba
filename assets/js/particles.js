(function () {
  function createParticles(canvas) {
    const ctx = canvas.getContext("2d");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const palette = ["#ffffff", "#d9d9d9", "#bfbfbf", "#a6a6a6"]; // tons de cinza / branco
    let w = 0, h = 0;
    let particles = [];
    let tick = 0;

    function resize() {
      w = canvas.clientWidth | 0; h = canvas.clientHeight | 0;
      canvas.width = Math.max(1, w * DPR); canvas.height = Math.max(1, h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (particles.length === 0) init();
    }

    function init() {
      const count = Math.max(60, Math.min(140, Math.floor((w * h) / 16000)));
      particles = new Array(count).fill(0).map(() => spawn());
    }

    function spawn() {
      const speed = 0.2 + Math.random() * 0.8;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        r: 0.8 + Math.random() * 1.8,
        c: palette[Math.floor(Math.random() * palette.length)],
      };
    }

    function step() {
      tick += 1;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (let p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
          Object.assign(p, spawn());
          p.x = Math.random() < 0.5 ? -5 : w + 5;
          p.y = Math.random() * h;
        }
        const pulse = 0.6 + Math.sin((tick + p.x + p.y) * 0.005) * 0.4;
        const r = p.r * (0.8 + pulse * 0.6);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 6);
        g.addColorStop(0, p.c + "ee");
        g.addColorStop(1, p.c + "00");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      requestAnimationFrame(step);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    step();
  }

  window.initParticles = function (canvas) {
    try { createParticles(canvas); } catch (err) { console.error("Particles init failed", err); }
  };
})();


