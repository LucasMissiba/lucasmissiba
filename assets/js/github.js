(() => {
  const grid = document.getElementById("projects-grid");
  if (!grid) return;
  const username = (window.SITE_CONFIG && window.SITE_CONFIG.githubUsername) || "";
  if (!username) return;

  const excluded = new Set(["gerenciar-tarefas", "primeiro-site-pessoal"]);

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
  }

  async function fetchRepos() {
    const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=12`;
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error("GitHub API error: " + res.status);
    return res.json();
  }

  function render(repos) {
    grid.querySelectorAll("[data-static]").forEach((el) => el.remove());
    const filtered = repos.filter((repo) => !excluded.has(String(repo.name || "").toLowerCase()));
    filtered.forEach((repo) => {
      const a = document.createElement("a");
      a.className = "card reveal card-link";
      a.href = repo.html_url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = `Abrir ${repo.name} no GitHub`;
      const description = repo.description || "Sem descrição.";
      a.innerHTML = `
        <h4>${escapeHtml(repo.name)}</h4>
        <p>${escapeHtml(description)}</p>
      `;
      grid.appendChild(a);
    });

    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      }, { threshold: 0.12 });
      grid.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    }
  }

  (async () => {
    try {
      const repos = await fetchRepos();
      render(repos);
    } catch (e) {
      console.error(e);
    }
  })();
})();


