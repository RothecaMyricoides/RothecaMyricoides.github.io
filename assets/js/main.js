(function () {
  const root = document.documentElement;
  const savedTheme = localStorage.getItem("theme");

  const createAmbientDotField = () => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    canvas.className = "ambient-dot-field";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: 0, y: 0, active: false };
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let palette = {};

    const updatePalette = () => {
      const styles = getComputedStyle(root);
      palette = {
        accent: styles.getPropertyValue("--accent").trim(),
        warm: styles.getPropertyValue("--accent-warm").trim(),
        opacity: root.dataset.theme === "dark" ? 0.22 : 0.13,
      };
    };

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = (timestamp = 0) => {
      context.clearRect(0, 0, width, height);

      const mobile = width <= 760;
      const spacing = mobile ? 48 : 42;
      const amplitude = mobile ? 3 : 5;
      const driftX = reducedMotion.matches ? 0 : (timestamp * 0.0017) % spacing;
      const driftY = reducedMotion.matches ? 0 : (timestamp * 0.0008) % spacing;
      const startX = driftX - spacing * 2;
      const startY = driftY - spacing * 2;
      const rows = Math.ceil(height / spacing) + 4;
      const columns = Math.ceil(width / spacing) + 4;

      for (let row = 0; row < rows; row += 1) {
        const waveX = reducedMotion.matches ? 0 : Math.sin(row * 0.63 + timestamp * 0.00042) * amplitude;

        for (let column = 0; column < columns; column += 1) {
          const waveY = reducedMotion.matches ? 0 : Math.cos(column * 0.49 + timestamp * 0.00034) * amplitude * 0.62;
          let x = startX + column * spacing + waveX;
          let y = startY + row * spacing + waveY;

          if (pointer.active && !mobile && !reducedMotion.matches) {
            const deltaX = x - pointer.x;
            const deltaY = y - pointer.y;
            const distance = Math.hypot(deltaX, deltaY);
            const influence = 150;

            if (distance > 0 && distance < influence) {
              const force = (1 - distance / influence) * 7;
              x += (deltaX / distance) * force;
              y += (deltaY / distance) * force;
            }
          }

          const warmPoint = (row * 17 + column * 31) % 29 === 0;
          const radius = mobile ? 2.35 : 2.6;
          context.beginPath();
          context.arc(x, y, warmPoint ? radius * 2.4 : radius, 0, Math.PI * 2);
          context.fillStyle = warmPoint ? palette.warm : palette.accent;
          context.globalAlpha = warmPoint ? palette.opacity * 0.9 : palette.opacity;
          context.fill();
        }
      }

      context.globalAlpha = 1;
    };

    const animate = (timestamp) => {
      draw(timestamp);
      animationFrame = requestAnimationFrame(animate);
    };

    const start = () => {
      cancelAnimationFrame(animationFrame);
      if (reducedMotion.matches || document.hidden) {
        draw();
        return;
      }
      animationFrame = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", () => {
      resize();
      start();
    });
    window.addEventListener("pointermove", (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    }, { passive: true });
    window.addEventListener("pointerout", (event) => {
      if (!event.relatedTarget) {
        pointer.active = false;
      }
    });
    document.addEventListener("visibilitychange", start);
    reducedMotion.addEventListener("change", start);
    new MutationObserver(() => {
      updatePalette();
      if (reducedMotion.matches || document.hidden) {
        draw();
      }
    }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    resize();
    updatePalette();
    start();
  };

  if (savedTheme) {
    root.dataset.theme = savedTheme;
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.dataset.theme = "dark";
  }

  createAmbientDotField();

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = nextTheme;
      localStorage.setItem("theme", nextTheme);
    });
  });

  const setLanguage = (lang) => {
    const normalized = lang === "en" ? "en" : "zh";
    root.dataset.lang = normalized;
    root.lang = normalized === "en" ? "en" : "zh-CN";
    localStorage.setItem("lang", normalized);

    document.querySelectorAll("[data-zh][data-en]").forEach((element) => {
      element.textContent = normalized === "en" ? element.dataset.en : element.dataset.zh;
    });

    document.querySelectorAll("[data-title-zh][data-title-en]").forEach((element) => {
      element.setAttribute("title", normalized === "en" ? element.dataset.titleEn : element.dataset.titleZh);
    });

    document.querySelectorAll("[data-label-zh][data-label-en]").forEach((element) => {
      element.setAttribute("aria-label", normalized === "en" ? element.dataset.labelEn : element.dataset.labelZh);
    });

    document.querySelectorAll("[data-content-zh][data-content-en]").forEach((element) => {
      element.setAttribute("content", normalized === "en" ? element.dataset.contentEn : element.dataset.contentZh);
    });
  };

  setLanguage(localStorage.getItem("lang") || root.dataset.lang || "en");

  document.querySelectorAll("[data-lang-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(root.dataset.lang === "en" ? "zh" : "en");
    });
  });

  const currentPath = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a").forEach((link) => {
    const linkPath = link.getAttribute("href").split("/").pop();
    if (linkPath === currentPath) {
      link.setAttribute("aria-current", "page");
    }
  });

  const progress = document.querySelector("[data-reading-progress]");
  if (progress) {
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  }

  const filterButtons = document.querySelectorAll("[data-filter]");
  const posts = document.querySelectorAll("[data-post-list] .post-row");
  if (filterButtons.length && posts.length) {
    const applyFilter = (tag) => {
      posts.forEach((post) => {
        const tags = (post.dataset.tags || "").split("|").map((item) => item.trim()).filter(Boolean);
        const visible = tag === "all" || tags.includes(tag);
        post.hidden = !visible;
        post.style.display = visible ? "" : "none";
      });
      filterButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.filter === tag);
      });
    };

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => applyFilter(button.dataset.filter));
    });

    const initialTag = new URLSearchParams(location.search).get("tag");
    if (initialTag) {
      applyFilter(initialTag);
    }
  }
})();




