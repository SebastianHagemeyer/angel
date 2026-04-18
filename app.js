window.__tryNextBanner = function (img) {
  try {
    const list = JSON.parse(img.dataset.fallbacks || "[]");
    if (list.length) {
      const next = list.shift();
      img.dataset.fallbacks = JSON.stringify(list);
      img.src = next;
    } else {
      img.remove();
    }
  } catch (e) {
    img.remove();
  }
};

// Animation utilities
const AnimationController = {
  // Intersection Observer for scroll animations
  observer: null,

  init() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
            // Unobserve after animation triggers (optional)
            // this.observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
  },

  observe(elements) {
    if (!this.observer) this.init();
    elements.forEach((el) => this.observer.observe(el));
  },

  // Animated counter
  animateCounter(element, target, duration = 1500) {
    const start = 0;
    const startTime = performance.now();

    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (target - start) * easeOut);
      element.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = target;
      }
    };

    requestAnimationFrame(update);
  },

  // Create floating particles
  createParticles(container, count = 15) {
    const colors = [
      "rgba(255, 255, 255, 0.6)",
      "rgba(255, 194, 26, 0.5)", // gold
      "rgba(77, 219, 232, 0.5)", // diamond
      "rgba(90, 181, 82, 0.5)",  // grass
    ];

    for (let i = 0; i < count; i++) {
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.cssText = `
        left: ${Math.random() * 100}%;
        width: ${4 + Math.random() * 8}px;
        height: ${4 + Math.random() * 8}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration: ${8 + Math.random() * 12}s;
        animation-delay: ${Math.random() * -20}s;
      `;
      container.appendChild(particle);
    }
  },

  // Stagger animation for multiple elements
  staggerAnimate(elements, baseDelay = 50) {
    elements.forEach((el, index) => {
      el.style.animationDelay = `${index * baseDelay}ms`;
      el.classList.add("animate-in");
    });
  }
};

const BANNER_HOSTS = [
  "https://minecraft.wiki/w/Special:FilePath/",
  "https://minecraft.fandom.com/wiki/Special:FilePath/",
];

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[/&]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildBannerUrls(version, names) {
  const urls = [];
  const slug = slugify(version);
  // Prefer locally-committed images first.
  urls.push(`images/${slug}.png`);
  urls.push(`images/${slug}.jpg`);
  // Then remote wiki candidates.
  for (const name of names) {
    for (const host of BANNER_HOSTS) {
      urls.push(host + encodeURIComponent(name));
    }
  }
  return urls;
}

(function () {
  const timeline = document.getElementById("timeline");
  const compareBody = document.getElementById("compare-body");
  const bars = document.getElementById("bars");
  const search = document.getElementById("search");
  const statCount = document.getElementById("stat-count");
  const filterButtons = document.querySelectorAll(".filter");

  let activeEra = "all";
  let query = "";

  function renderCards() {
    const q = query.trim().toLowerCase();
    const cards = MINECRAFT_VERSIONS.filter((v) => {
      const matchesEra = activeEra === "all" || v.era === activeEra;
      const matchesQuery =
        !q ||
        v.version.toLowerCase().includes(q) ||
        (v.codename || "").toLowerCase().includes(q) ||
        v.features.join(" ").toLowerCase().includes(q) ||
        v.tags.join(" ").toLowerCase().includes(q);
      return matchesEra && matchesQuery;
    });

    timeline.innerHTML = cards
      .map((v) => {
        const p = v.palette || { sky1: "#87ceeb", sky2: "#c8e6ff", g1: "#5ab552", g2: "#2f6b2b" };
        const style = `background:linear-gradient(180deg, ${p.sky1} 0%, ${p.sky2} 55%, ${p.g1} 55%, ${p.g2} 100%)`;
        const bannerNames = v.banner ? [].concat(v.banner) : [];
        const bannerUrls = buildBannerUrls(v.version, bannerNames);
        const bannerImg = bannerUrls.length
          ? `<img class="banner" src="${bannerUrls[0]}" alt="${escape(v.version)} banner" loading="lazy" referrerpolicy="no-referrer" data-fallbacks='${JSON.stringify(bannerUrls.slice(1)).replace(/'/g, "&#39;")}' onerror="window.__tryNextBanner(this)" />`
          : "";
        return `
      <article class="card era-${v.era}">
        <div class="card-image" style="${style}">
          <span class="version-badge" aria-hidden="true">${escape(v.version)}</span>
          ${bannerImg}
        </div>
        <div class="card-header">
          <h3>${escape(v.version)}${
          v.codename ? ` <small style="display:block;font-size:0.7em;opacity:0.9">${escape(v.codename)}</small>` : ""
        }</h3>
          <span class="year">${v.year}</span>
        </div>
        <div class="card-body">
          <h4>${escape(v.headline)}</h4>
          <ul>
            ${v.features.map((f) => `<li>${escape(f)}</li>`).join("")}
          </ul>
        </div>
        <div class="card-meta">
          ${v.tags.map((t) => `<span class="tag">${escape(t)}</span>`).join("")}
        </div>
      </article>`;
      })
      .join("");

    if (!cards.length) {
      timeline.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#777">
        No versions match that filter.</p>`;
    }
  }

  function renderTable() {
    compareBody.innerHTML = MINECRAFT_VERSIONS.map(
      (v) => `
      <tr>
        <td><strong>${escape(v.version)}</strong></td>
        <td>${v.year}</td>
        <td>${escape(v.codename || "—")}</td>
        <td>${escape(v.headline)}</td>
        <td>${v.worldHeight}</td>
        <td>${v.newDimension ? `✔ ${escape(v.newDimension)}` : "—"}</td>
      </tr>`
    ).join("");
  }

  function renderBars() {
    // Compute gap in months between consecutive releases.
    const sorted = [...MINECRAFT_VERSIONS].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const gaps = sorted.map((v, i) => {
      if (i === 0) return { v, months: 0 };
      const prev = new Date(sorted[i - 1].date);
      const curr = new Date(v.date);
      const months = Math.max(
        1,
        Math.round((curr - prev) / (1000 * 60 * 60 * 24 * 30))
      );
      return { v, months };
    });

    const max = Math.max(...gaps.map((g) => g.months));

    bars.innerHTML = gaps
      .map((g) => {
        const h = g.months === 0 ? 8 : Math.round((g.months / max) * 190) + 10;
        return `<div class="bar" style="height:${h}px" title="${escape(
          g.v.version
        )} — ${g.months} mo since previous">
          ${g.months || ""}
          <span class="label">${escape(g.v.version)}</span>
        </div>`;
      })
      .join("");
  }

  function escape(str) {
    return String(str).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeEra = btn.dataset.filter;
      renderCards();
    });
  });

  search.addEventListener("input", (e) => {
    query = e.target.value;
    renderCards();
  });

  // Initialize animations
  AnimationController.init();

  // Animate stat counter
  AnimationController.animateCounter(statCount, MINECRAFT_VERSIONS.length, 2000);

  // Create floating particles in hero
  const hero = document.querySelector(".hero");
  if (hero) {
    AnimationController.createParticles(hero, 20);
  }

  // Initial render
  renderCards();
  renderTable();
  renderBars();

  // Observe sections for scroll animations
  const compare = document.querySelector(".compare");
  const chart = document.querySelector(".chart");
  if (compare) AnimationController.observe([compare]);
  if (chart) AnimationController.observe([chart]);

  // Observe cards after render
  function observeCards() {
    requestAnimationFrame(() => {
      const cards = document.querySelectorAll(".card:not(.animate-in)");
      AnimationController.observe(cards);
    });
  }

  // Observe bars after render
  function observeBars() {
    requestAnimationFrame(() => {
      const barElements = document.querySelectorAll(".bar:not(.animate-in)");
      AnimationController.observe(barElements);
    });
  }

  observeCards();
  observeBars();

  // Re-observe cards when filters change
  const originalRenderCards = renderCards;
  renderCards = function() {
    originalRenderCards();
    observeCards();
  };
})();
