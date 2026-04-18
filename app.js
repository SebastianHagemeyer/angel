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

  statCount.textContent = MINECRAFT_VERSIONS.length;
  renderCards();
  renderTable();
  renderBars();
})();
