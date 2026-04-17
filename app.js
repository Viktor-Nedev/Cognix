const AVATAR_SOURCES = {
  idle: "./avatar/normalstate.mp4",
  intro: "./avatar/startthinking.mp4",
  thinking: "./avatar/thinking.mp4",
};

const AVATAR_COPY = {
  idle: {
    label: "Normal standby",
    text: "Cognix is waiting for a problem. When you submit one, it will wake up and shift into the thinking loop.",
  },
  intro: {
    label: "Activation",
    text: "The avatar has received the dilemma and is entering the first thinking sequence.",
  },
  thinking: {
    label: "Thinking loop",
    text: "Cognix is now focused on the problem and staying in the active thinking state.",
  },
};

const SAMPLE_PROBLEMS = [
  "Should I accept a startup offer or stay in my stable job for six more months?",
  "Should I move to another city for more opportunities or stay close to my current support system?",
  "Should I buy a new laptop now or wait until next month for more clarity?",
];

const runtime = {
  reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  videoToken: 0,
};

document.addEventListener("DOMContentLoaded", initAvatarPage);

function initAvatarPage() {
  registerAvatarPlugins();
  setupPageTransitionLinks();
  buildProblemChips();
  bindAvatarForm();
  playAvatarPhase("idle");
  setAvatarState("idle");
  animateAvatarPage();
  startAvatarAmbientMotion();
}

function registerAvatarPlugins() {
  if (!window.gsap) {
    return;
  }

  const plugins = [
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

  if (!window.gsap || runtime.reduced || !overlayPanels.length) {
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

function buildProblemChips() {
  const container = document.getElementById("problemChips");
  const input = document.getElementById("problemInput");

  if (!container || !input) {
    return;
  }

  container.innerHTML = SAMPLE_PROBLEMS.map(
    (problem) =>
      '<button class="problem-chip" type="button" data-problem="' +
      escapeHtml(problem) +
      '">' +
      escapeHtml(trimProblem(problem)) +
      "</button>",
  ).join("");

  container.querySelectorAll("[data-problem]").forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.problem || "";
      input.focus();
      startThinkingSequence();
    });
  });
}

function trimProblem(problem) {
  return problem.length > 38 ? problem.slice(0, 38) + "..." : problem;
}

function bindAvatarForm() {
  const form = document.getElementById("problemForm");
  const input = document.getElementById("problemInput");

  if (!form || !input) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!input.value.trim()) {
      shakeInput(input);
      input.focus();
      return;
    }

    startThinkingSequence();
  });
}

function startThinkingSequence() {
  playAvatarPhase("intro");
  setAvatarState("intro");

  const currentToken = runtime.videoToken;
  const video = document.getElementById("avatarPlayer");
  if (!video) {
    return;
  }

  video.onended = () => {
    if (currentToken !== runtime.videoToken) {
      return;
    }
    playAvatarPhase("thinking");
    setAvatarState("thinking");
  };
}

function setAvatarState(state) {
  const label = document.getElementById("avatarStateLabel");
  const text = document.getElementById("avatarStateText");
  const stage = document.querySelector(".avatar-stage-center");
  const copy = AVATAR_COPY[state] || AVATAR_COPY.idle;

  if (stage) {
    stage.dataset.phase = state;
  }

  if (label) {
    label.textContent = copy.label;
  }

  if (text) {
    if (!window.gsap || !window.ScrambleTextPlugin || runtime.reduced) {
      text.textContent = copy.text;
    } else {
      window.gsap.to(text, {
        duration: 0.95,
        scrambleText: {
          text: copy.text,
          chars: "lowerCase",
          revealDelay: 0.12,
          speed: 0.45,
        },
        ease: "none",
      });
    }
  }
}

function playAvatarPhase(phase) {
  const video = document.getElementById("avatarPlayer");
  if (!video) {
    return;
  }

  runtime.videoToken += 1;
  const token = runtime.videoToken;
  const source = AVATAR_SOURCES[phase] || AVATAR_SOURCES.idle;

  video.pause();
  video.onended = null;
  video.loop = phase !== "intro";
  video.src = source;
  video.load();

  const playVideo = () => {
    if (token !== runtime.videoToken) {
      return;
    }
    video.play().catch(() => {
      return;
    });
  };

  video.addEventListener("canplay", playVideo, { once: true });
}

function animateAvatarPage() {
  if (!window.gsap || runtime.reduced) {
    return;
  }

  const title = document.querySelector(".avatar-page-title");
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

  window.gsap.from(".site-header, .avatar-intro .hero-lead, .avatar-stage-center, .avatar-status, .problem-panel", {
    autoAlpha: 0,
    y: 24,
    duration: 0.85,
    stagger: 0.08,
    ease: "cognixEase",
    delay: 0.25,
  });
}

function startAvatarAmbientMotion() {
  if (!window.gsap || runtime.reduced) {
    return;
  }

  window.gsap.to(".glow-a", {
    xPercent: 8,
    yPercent: -10,
    duration: 10,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  window.gsap.to(".glow-b", {
    xPercent: -8,
    yPercent: 10,
    duration: 11,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  window.gsap.to(".center-ring-a", {
    rotate: 360,
    duration: 28,
    repeat: -1,
    ease: "none",
    transformOrigin: "50% 50%",
  });

  window.gsap.to(".center-ring-b", {
    rotate: -360,
    duration: 20,
    repeat: -1,
    ease: "none",
    transformOrigin: "50% 50%",
  });

  window.gsap.to(".center-ring-c", {
    scale: 0.975,
    duration: 3.2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
    transformOrigin: "50% 50%",
  });

  window.gsap.to(".center-orb-a", {
    yPercent: 16,
    duration: 2.8,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  window.gsap.to(".center-orb-b", {
    xPercent: 12,
    yPercent: -10,
    duration: 3.6,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  window.gsap.to(".center-orb-c", {
    xPercent: -14,
    yPercent: 10,
    duration: 4.4,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
}

function shakeInput(node) {
  if (!window.gsap || runtime.reduced) {
    return;
  }

  window.gsap.fromTo(
    node,
    { x: -6 },
    {
      x: 0,
      duration: 0.4,
      keyframes: [{ x: 6 }, { x: -5 }, { x: 4 }, { x: 0 }],
    },
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
