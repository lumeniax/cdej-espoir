// Petites animations / interactions pour la landing CDEJ Espoir
(function () {
  "use strict";

  // 1) Smooth scroll pour les liens d'ancrage (avec offset pour le header sticky)
  const HEADER_OFFSET = 72;
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
      window.scrollTo({ top: top, behavior: "smooth" });
      history.pushState(null, "", href);
    });
  });

  // 2) Apparition progressive des cartes au scroll (IntersectionObserver)
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    document
      .querySelectorAll(".feature, .stack-col, .install-step, .doc-card")
      .forEach(function (el, i) {
        el.style.opacity = "0";
        el.style.transform = "translateY(16px)";
        el.style.transition = "opacity .5s ease " + (i * 30) + "ms, transform .5s ease " + (i * 30) + "ms";
        observer.observe(el);
      });
  }

  // 3) Petite stat-mock qui s'anime au chargement
  document.querySelectorAll(".stat-value").forEach(function (el) {
    const text = el.textContent || "";
    const isPercent = text.includes("%");
    const target = parseInt(text.replace(/\D/g, ""), 10);
    if (!isFinite(target) || target <= 0) return;
    let current = 0;
    const duration = 900;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      current = Math.floor(eased * target);
      el.textContent = current + (isPercent ? "%" : "");
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = text;
    }
    requestAnimationFrame(step);
  });

  // 4) Année dynamique (si on en ajoute une au footer plus tard)
  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
