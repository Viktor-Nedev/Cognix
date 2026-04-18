const homeRuntime = {
  reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};

document.addEventListener("DOMContentLoaded", initHomePage);

function initHomePage() {
  registerHomePlugins();
  setupPageTransitionLinks();
  setupHomeAvatarFallback();
  animateHomeIntro();
  bindScrollReveals();
  startHomeAmbientMotion();
}

function registerHomePlugins() {
  if (!window.gsap) {
    return;
  }

  const plugins = [
    window.ScrollTrigger,
    window.SplitText,
    window.ScrambleTextPlugin,
    window.CustomEase,
  ].filter(Boolean);

  if (plugins.length) {
    window.gsap.registerPlugin(...plugins);
  }

  if (window.CustomEase) {
    window.CustomEase.create("cognixEase", "0.22,1,0.36,1");
  }
}

function setupPageTransitionLinks() {
  const overlayPanels = document.querySelectorAll(".transition-panel");
  const links = document.querySelectorAll("[data-transition-link]");

  if (!window.gsap || homeRuntime.reduced || !overlayPanels.length) {
    return;
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

function setupHomeAvatarFallback() {
  const video = document.getElementById("heroAvatar");
  const fallback = document.querySelector(".hero-avatar-core");

  if (!video || !fallback) {
    return;
  }

  const showFallback = () => {
    fallback.classList.add("is-visible");
    video.style.display = "none";
  };

  const showVideo = () => {
    fallback.classList.remove("is-visible");
    video.style.display = "block";
  };

  video.addEventListener("error", showFallback);
  video.addEventListener("canplay", showVideo, { once: true });
}

function animateHomeIntro() {
  if (!window.gsap || homeRuntime.reduced) {
    return;
  }

  const title = document.querySelector(".hero-title");
  if (window.SplitText && title) {
    const split = new window.SplitText(title, { type: "lines,words" });
    window.gsap.from(split.words, {
      yPercent: 120,
      autoAlpha: 0,
      duration: 0.95,
      stagger: 0.035,
      ease: "cognixEase",
      delay: 0.1,
    });
  }

  window.gsap.from(".site-header, .hero-lead, .hero-actions, .glass-tile", {
    autoAlpha: 0,
    y: 24,
    duration: 0.8,
    stagger: 0.08,
    ease: "cognixEase",
    delay: 0.28,
  });
}

function bindScrollReveals() {
  if (!window.gsap || !window.ScrollTrigger || homeRuntime.reduced) {
    return;
  }

  document.querySelectorAll(".reveal").forEach((element) => {
    const mode = element.dataset.reveal || "fade-up";
    const from = revealFrom(mode);

    window.gsap.fromTo(
      element,
      from,
      {
        autoAlpha: 1,
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0,
        duration: 1,
        ease: "cognixEase",
        scrollTrigger: {
          trigger: element,
          start: "top 82%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
      },
    );
  });
}

function revealFrom(mode) {
  if (mode === "title") {
    return { autoAlpha: 0, y: 20 };
  }
  if (mode === "fade-left") {
    return { autoAlpha: 0, x: -40, y: 0 };
  }
  if (mode === "fade-right") {
    return { autoAlpha: 0, x: 40, y: 0 };
  }
  if (mode === "scale-in") {
    return { autoAlpha: 0, scale: 0.92, y: 28 };
  }
  return { autoAlpha: 0, y: 34 };
}

function startHomeAmbientMotion() {
  if (!window.gsap || homeRuntime.reduced) {
    return;
  }

  window.gsap.to(".glow-a", {
    xPercent: 6,
    yPercent: -8,
    duration: 10,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  window.gsap.to(".glow-b", {
    xPercent: -8,
    yPercent: 10,
    duration: 12,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  window.gsap.to(".hero-device-ring.ring-a", {
    rotate: 360,
    duration: 28,
    repeat: -1,
    ease: "none",
    transformOrigin: "50% 50%",
  });

  window.gsap.to(".hero-device-ring.ring-b", {
    rotate: -360,
    duration: 18,
    repeat: -1,
    ease: "none",
    transformOrigin: "50% 50%",
  });

  window.gsap.to(".hero-device-ring.ring-c", {
    scale: 0.97,
    duration: 3.2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
    transformOrigin: "50% 50%",
  });

  window.gsap.to(".orbit-a", {
    yPercent: 14,
    duration: 4,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  window.gsap.to(".orbit-b", {
    xPercent: -10,
    duration: 5.4,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  window.gsap.to(".orbit-c", {
    xPercent: 10,
    yPercent: -8,
    duration: 6.2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  window.gsap.to(".pulse-line", {
    scaleY: 1.4,
    transformOrigin: "50% 50%",
    duration: 0.9,
    stagger: 0.12,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  window.gsap.to(".signal-chip", {
    y: -8,
    duration: 2.8,
    stagger: 0.14,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  window.gsap.to(".concept-card, .sequence-node", {
    y: -6,
    duration: 2.8,
    stagger: 0.16,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
}
