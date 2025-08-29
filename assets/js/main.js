(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function setupYear() {
    const year = new Date().getFullYear();
    const el = $("#year");
    if (el) el.textContent = String(year);
  }

  function setupReveal() {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    $$(".reveal").forEach(el => observer.observe(el));
  }

  function setupParallax() {
    const els = $$("[data-parallax]");
    const speeds = new Map();
    els.forEach(el => {
      const s = parseFloat(el.getAttribute("data-parallax-speed") || "0.15");
      speeds.set(el, isNaN(s) ? 0.15 : s);
    });
    const update = () => {
      const y = window.scrollY || window.pageYOffset;
      els.forEach(el => {
        const spd = speeds.get(el) || 0.15;
        el.style.setProperty("--parallax-y", `${Math.round(y * spd)}px`);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  function setupContactForm() {
    const form = $("#contact-form");
    const status = $("#form-status");
    if (!form || !status) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.textContent = "Enviando...";
      const data = new FormData(form);
      const name = (data.get("name") || "").toString();
      const email = (data.get("email") || "").toString();
      const message = (data.get("message") || "").toString();

      const endpoint = (window.SITE_CONFIG && window.SITE_CONFIG.formspreeEndpoint) || "";
      try {
        if (endpoint) {
          const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
          if (res.ok) {
            status.textContent = "Mensagem enviada!";
            form.reset();
          } else {
            throw new Error(await res.text());
          }
        } else {
          const subject = encodeURIComponent(`[GhostPortfolio] ${name}`);
          const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
          window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
          status.textContent = "Abrindo seu cliente de email...";
        }
      } catch (err) {
        status.textContent = "Falha ao enviar. Tente novamente.";
        console.error(err);
      }
    });
  }

  function initParticlesCanvas() {
    const heroCanvas = document.getElementById("particles-canvas");
    if (heroCanvas && typeof window.initParticles === "function") {
      window.initParticles(heroCanvas);
    }
    document.querySelectorAll(".particles-canvas").forEach((c) => {
      if (typeof window.initParticles === "function") window.initParticles(c);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupYear();
    setupReveal();
    setupParallax();
    setupContactForm();
    initParticlesCanvas();

    // Splash loading: remove after short delay or when first frame ready
    const splash = document.getElementById("splash");
    if (splash) {
      const removeSplash = () => splash.classList.add("hidden");
      setTimeout(removeSplash, 1400);
      window.addEventListener("load", removeSplash);
    }
  });
})();


