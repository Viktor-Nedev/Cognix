(function () {
  const state = {
    initialized: false,
  };

  function init() {
    if (state.initialized) {
      return;
    }

    const overlayPanels = document.querySelectorAll(".transition-panel");
    const links = document.querySelectorAll("[data-transition-link]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!window.gsap || reduced || !overlayPanels.length) {
      return;
    }

    state.initialized = true;

    if (window.CustomEase && !window.gsap.parseEase("cognixEase")) {
      window.CustomEase.create("cognixEase", "0.22,1,0.36,1");
    }

    window.gsap.set(overlayPanels, { scaleY: 1, transformOrigin: "top center" });
    window.gsap.to(overlayPanels, {
      scaleY: 0,
      transformOrigin: "bottom center",
      duration: 0.9,
      stagger: 0.09,
      ease: "cognixEase",
      delay: 0.08,
    });

    links.forEach((link) => {
      if (link.dataset.transitionBound === "true") {
        return;
      }

      link.dataset.transitionBound = "true";

      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("#")) {
          return;
        }

        event.preventDefault();
        window.gsap.to(overlayPanels, {
          scaleY: 1,
          transformOrigin: "top center",
          duration: 0.55,
          stagger: 0.07,
          ease: "cognixEase",
          onComplete: () => {
            window.location.href = href;
          },
        });
      });
    });
  }

  window.CognixTransitions = {
    init,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
