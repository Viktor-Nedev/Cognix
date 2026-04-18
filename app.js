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

const SAMPLE_DEBATE = [
  "We should launch the MVP next week because we already have enough features to validate real demand and learn from actual users.",
  "We should delay the launch because the rough edges are still visible, and a weak first impression could damage trust before we get a second chance.",
  "We should release only to an invite list so we get signal quickly without exposing every unfinished part to the whole audience.",
  "We should wait for analytics instrumentation first, otherwise the debate after launch will be based on feelings instead of real data.",
];

const runtime = {
  reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  videoToken: 0,
  activeMode: "problem",
  debateStep: "context",
};

document.addEventListener("DOMContentLoaded", initAvatarPage);

function initAvatarPage() {
  registerAvatarPlugins();
  setupPageTransitionLinks();
  setupModeConsole();
  buildProblemChips();
  bindProblemForm();
  setupDebateLab();
  syncViewpointCards();
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

function bindProblemForm() {
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

function setupModeConsole() {
  document.querySelectorAll(".mode-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.mode || "problem";
      if (nextMode === runtime.activeMode) {
        return;
      }
      setActiveMode(nextMode);
    });
  });
}

function setActiveMode(mode) {
  runtime.activeMode = mode;
  playAvatarPhase("idle");
  const stage = document.querySelector(".avatar-stage-center");
  if (stage) {
    stage.dataset.phase = "idle";
  }

  document.querySelectorAll("[data-mode-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.modePanel === mode);
  });

  document.querySelectorAll(".mode-toggle").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });

  const stateLabel = document.getElementById("avatarStateLabel");

  if (mode === "debate") {
    resetDebateFlow();
    updateDebateState(
      "Debate intake",
      "Start by describing the dispute. After that, Cognix will ask how many viewpoints should enter the room.",
    );
  } else {
    setAvatarState("idle");
  }

  if (!window.gsap || runtime.reduced) {
    return;
  }

  window.gsap.fromTo(
    ".mode-panel.is-active",
    { autoAlpha: 0, y: 18 },
    { autoAlpha: 1, y: 0, duration: 0.55, ease: "cognixEase" },
  );
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

function setupDebateLab() {
  const form = document.getElementById("debateForm");
  const sampleButton = document.getElementById("debateSample");
  const contextNext = document.getElementById("debateContextNext");
  const countBack = document.getElementById("debateCountBack");
  const countNext = document.getElementById("debateCountNext");
  const argumentsBack = document.getElementById("debateArgumentsBack");

  if (sampleButton) {
    sampleButton.addEventListener("click", fillDebateSample);
  }

  if (contextNext) {
    contextNext.addEventListener("click", goToDebateCountStep);
  }

  if (countBack) {
    countBack.addEventListener("click", () => {
      showDebateStep("context");
      updateDebateState("Debate intake", "Cognix is listening to what the disagreement is actually about before opening the room to viewpoints.");
    });
  }

  if (countNext) {
    countNext.addEventListener("click", () => {
      syncViewpointCards();
      hideVerdictPanel();
      showDebateStep("arguments");
      updateDebateState("Viewpoints loaded", "The room is open. Add each perspective and Cognix will compare them one by one.");
      animateOpinionCards();
    });
  }

  if (argumentsBack) {
    argumentsBack.addEventListener("click", () => {
      showDebateStep("count");
      hideVerdictPanel();
      updateDebateState("Perspective setup", "Choose how many viewpoints should enter the debate before the arguments appear.");
    });
  }

  document.querySelectorAll(".count-option").forEach((button) => {
    button.addEventListener("click", () => {
      setSelectedViewpointCount(button.dataset.count || "3");
    });
  });

  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    startThinkingSequence();
    judgeDebate();
  });
}

function syncViewpointCards() {
  const count = getSelectedViewpointCount();
  document.querySelectorAll("[data-opinion-card]").forEach((card, index) => {
    card.classList.toggle("is-hidden", index >= count);
  });
}

function fillDebateSample() {
  const context = document.getElementById("debateContext");
  if (context) {
    context.value = "A product team is split on whether to launch immediately, delay for polish, or ship to a smaller private group first.";
  }

  setSelectedViewpointCount("4");
  showDebateStep("arguments");
  syncViewpointCards();
  hideVerdictPanel();

  ["debateA", "debateB", "debateC", "debateD"].forEach((id, index) => {
    const input = document.getElementById(id);
    if (input) {
      input.value = SAMPLE_DEBATE[index] || "";
    }
  });

  animateOpinionCards();
  updateDebateState("Viewpoints loaded", "Sample arguments are in place. Cognix is ready to judge the room.");
  judgeDebate();
}

function judgeDebate() {
  const count = getSelectedViewpointCount();
  const rawOpinions = [
    buildOpinion("A", document.getElementById("debateA")?.value || ""),
    buildOpinion("B", document.getElementById("debateB")?.value || ""),
    buildOpinion("C", document.getElementById("debateC")?.value || ""),
    buildOpinion("D", document.getElementById("debateD")?.value || ""),
  ];
  const opinions = rawOpinions.slice(0, count).filter((item) => item.text);

  if (opinions.length < 2) {
    updateVerdict(
      "Waiting for stronger debate input.",
      "Add at least two viewpoints so Cognix can compare clarity, evidence, practicality, and fairness before choosing the strongest case.",
      { clarity: 14, evidence: 12, fairness: 10 },
    );
    return;
  }

  const scored = opinions
    .map((opinion) => ({
      ...opinion,
      score: scoreOpinion(opinion.text),
    }))
    .sort((left, right) => right.score.total - left.score.total);

  const winner = scored[0];
  const runnerUp = scored[1];
  const reason =
    "Opinion " +
    winner.id +
    " wins because it combines stronger clarity, clearer justification, and a more usable next move than opinion " +
    runnerUp.id +
    ". Cognix reads it as the most balanced and defensible position in the room.";

  updateVerdict("Opinion " + winner.id + " wins this debate.", reason, winner.score);
  updateDebateState("Debate verdict", "Cognix has compared the arguments and is now explaining which side is strongest and why.");
}

function goToDebateCountStep() {
  const context = document.getElementById("debateContext");
  if (!context || !context.value.trim()) {
    shakeInput(context);
    context?.focus();
    return;
  }

  showDebateStep("count");
  updateDebateState("Perspective setup", "Now choose how many different viewpoints should enter the debate before the argument cards appear.");
}

function resetDebateFlow() {
  setSelectedViewpointCount("3");
  showDebateStep("context", false);
  hideVerdictPanel();
}

function showDebateStep(step, animate = true) {
  runtime.debateStep = step;

  document.querySelectorAll("[data-debate-step]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.debateStep === step);
  });

  if (!window.gsap || runtime.reduced || !animate) {
    return;
  }

  const activePanel = document.querySelector('[data-debate-step="' + step + '"]');
  if (!activePanel) {
    return;
  }

  window.gsap.fromTo(
    activePanel,
    { autoAlpha: 0, y: 24, scale: 0.98 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: "cognixEase" },
  );
}

function setSelectedViewpointCount(value) {
  document.querySelectorAll(".count-option").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.count === value);
  });
}

function getSelectedViewpointCount() {
  const active = document.querySelector(".count-option.is-active");
  return Number(active?.dataset.count || "3");
}

function animateOpinionCards() {
  const visibleCards = Array.from(document.querySelectorAll("[data-opinion-card]")).filter(
    (card) => !card.classList.contains("is-hidden"),
  );

  if (!window.gsap || runtime.reduced || !visibleCards.length) {
    return;
  }

  window.gsap.fromTo(
    visibleCards,
    { autoAlpha: 0, x: 28, y: 20, scale: 0.97 },
    {
      autoAlpha: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.6,
      stagger: 0.12,
      ease: "cognixEase",
    },
  );
}

function updateDebateState(label, text) {
  const stateLabel = document.getElementById("avatarStateLabel");
  const stateText = document.getElementById("avatarStateText");

  if (stateLabel) {
    stateLabel.textContent = label;
  }

  if (stateText) {
    if (!window.gsap || !window.ScrambleTextPlugin || runtime.reduced) {
      stateText.textContent = text;
      return;
    }

    window.gsap.to(stateText, {
      duration: 0.95,
      scrambleText: {
        text,
        chars: "lowerCase",
        revealDelay: 0.12,
        speed: 0.45,
      },
      ease: "none",
    });
  }
}

function buildOpinion(id, text) {
  return { id, text: text.trim() };
}

function scoreOpinion(text) {
  const normalized = text.toLowerCase();
  const clarity = Math.min(92, 28 + Math.round(text.length / 2.5));
  const evidenceBoost = ["because", "data", "users", "result", "evidence", "signal", "metrics"].some((word) =>
    normalized.includes(word),
  )
    ? 24
    : 9;
  const fairnessBoost = ["but", "however", "risk", "tradeoff", "without", "while", "balance"].some((word) =>
    normalized.includes(word),
  )
    ? 18
    : 7;
  const evidence = Math.min(94, 23 + evidenceBoost + Math.round(text.split(" ").length * 0.9));
  const fairness = Math.min(90, 21 + fairnessBoost + Math.round(text.length / 7));
  const total = Math.round(clarity * 0.34 + evidence * 0.36 + fairness * 0.3);

  return { clarity, evidence, fairness, total };
}

function updateVerdict(title, reason, scores) {
  const winner = document.getElementById("debateWinner");
  const explanation = document.getElementById("debateReason");
  const clarity = document.getElementById("debateClarity");
  const evidence = document.getElementById("debateEvidence");
  const fairness = document.getElementById("debateFairness");
  const panel = document.getElementById("debateVerdict");

  if (winner) {
    winner.textContent = title;
  }

  if (explanation) {
    if (!window.gsap || !window.ScrambleTextPlugin || runtime.reduced) {
      explanation.textContent = reason;
    } else {
      window.gsap.to(explanation, {
        duration: 1,
        scrambleText: {
          text: reason,
          chars: "lowerCase",
          revealDelay: 0.12,
          speed: 0.45,
        },
        ease: "none",
      });
    }
  }

  animateVerdictBar(clarity, scores.clarity);
  animateVerdictBar(evidence, scores.evidence);
  animateVerdictBar(fairness, scores.fairness);

  if (panel) {
    panel.classList.remove("is-hidden");
    if (window.gsap && !runtime.reduced) {
      window.gsap.fromTo(
        panel,
        { autoAlpha: 0, y: 24, scale: 0.98 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.65, ease: "cognixEase" },
      );
    }
  }
}

function animateVerdictBar(node, value) {
  if (!node) {
    return;
  }

  if (!window.gsap || runtime.reduced) {
    node.style.transform = "scaleX(" + value / 100 + ")";
    return;
  }

  window.gsap.to(node, {
    scaleX: value / 100,
    duration: 0.8,
    ease: "cognixEase",
    transformOrigin: "left center",
  });
}

function hideVerdictPanel() {
  const panel = document.getElementById("debateVerdict");
  if (panel) {
    panel.classList.add("is-hidden");
  }
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

  window.gsap.from(".site-header, .avatar-intro .hero-lead, .avatar-stage-center, .mode-console", {
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

  window.gsap.to(".orbital-track-a", {
    rotate: 360,
    duration: 8,
    repeat: -1,
    ease: "none",
    transformOrigin: "50% 50%",
  });

  window.gsap.to(".orbital-track-b", {
    rotate: -360,
    duration: 10,
    repeat: -1,
    ease: "none",
    transformOrigin: "50% 50%",
  });

  window.gsap.to(".orbital-track-c", {
    rotate: 360,
    duration: 12,
    repeat: -1,
    ease: "none",
    transformOrigin: "50% 50%",
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
