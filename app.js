const SAMPLES = [
  {
    label: "Startup vs stable role",
    text: "Should I accept the startup offer or stay in my stable job for six more months?",
  },
  {
    label: "Move or stay",
    text: "Should I move to another city for better opportunities or stay close to my current support system?",
  },
  {
    label: "Buy now or wait",
    text: "Should I buy a new laptop now or wait two more months for better deals and more clarity?",
  },
];

const PHASES = {
  idle: {
    label: "Idle loop",
    description:
      "Cognix is waiting for a dilemma and keeping the avatar in the normal loop.",
    line: "System ready. Waiting for a dilemma.",
  },
  thinkingIntro: {
    label: "Thinking boot",
    description:
      "The avatar wakes up and starts the thinking sequence before settling into the loop.",
    line: "Signal received. Booting visible reasoning.",
  },
  thinking: {
    label: "Thinking",
    description:
      "Cognix is framing the real tension behind the question before generating paths.",
    line: "Framing the actual problem behind the prompt.",
  },
  analyzing: {
    label: "Analyzing",
    description:
      "Possible paths are being expanded so the tradeoffs can be compared on-screen.",
    line: "Generating and stress-testing decision paths.",
  },
  evaluating: {
    label: "Evaluating",
    description:
      "The system is scoring upside, risk, reversibility, and momentum.",
    line: "Comparing downside, speed, and upside across options.",
  },
  deciding: {
    label: "Deciding",
    description:
      "Cognix is selecting the strongest path based on weighted tradeoffs.",
    line: "Selecting the recommendation with the strongest structure.",
  },
  explaining: {
    label: "Explaining",
    description:
      "The final recommendation is being translated into a clear human explanation.",
    line: "Packaging the decision into a concise explanation.",
  },
};

const AVATAR = {
  idle: ["./avatar/normal.mp4", "./avatar/normal.webm", "./avatar/idle.mp4"],
  thinkingIntro: [
    "./avatar/thinking-intro.mp4",
    "./avatar/thinking-intro.webm",
    "./avatar/start-thinking.mp4",
  ],
  thinking: ["./avatar/thinking-loop.mp4", "./avatar/thinking.mp4"],
  analyzing: ["./avatar/analyzing-loop.mp4", "./avatar/analyzing.mp4"],
  evaluating: ["./avatar/evaluating-loop.mp4", "./avatar/evaluating.mp4"],
  deciding: ["./avatar/deciding-loop.mp4", "./avatar/deciding.mp4"],
  explaining: ["./avatar/explaining-loop.mp4", "./avatar/explaining.mp4"],
};

const TOPICS = [
  {
    id: "career",
    words: ["job", "career", "offer", "startup", "salary", "work", "team"],
    tension: "stability, learning speed, and upside",
    weights: { clarity: 0.28, momentum: 0.2, upside: 0.27, risk: 0.25 },
  },
  {
    id: "money",
    words: ["buy", "price", "money", "budget", "invest", "cost", "save"],
    tension: "timing, cash protection, and value for money",
    weights: { clarity: 0.24, momentum: 0.14, upside: 0.2, risk: 0.42 },
  },
  {
    id: "move",
    words: ["move", "city", "travel", "relocate", "country", "apartment"],
    tension: "growth, belonging, and disruption",
    weights: { clarity: 0.24, momentum: 0.21, upside: 0.26, risk: 0.29 },
  },
  {
    id: "education",
    words: ["study", "university", "course", "learn", "degree", "exam"],
    tension: "time investment, optionality, and long-term payoff",
    weights: { clarity: 0.27, momentum: 0.22, upside: 0.27, risk: 0.24 },
  },
];

const ARCHETYPES = {
  conservative: {
    summary: "Optimizes for lower downside, reversibility, and a cleaner safety margin.",
    metrics: { clarity: 84, momentum: 46, upside: 58, risk: 24 },
  },
  balanced: {
    summary: "Creates real-world signal while keeping optionality and manageable downside.",
    metrics: { clarity: 78, momentum: 76, upside: 76, risk: 45 },
  },
  bold: {
    summary: "Maximizes upside and speed, but demands real tolerance for volatility.",
    metrics: { clarity: 62, momentum: 90, upside: 92, risk: 74 },
  },
};

const DEFAULT_METRICS = { clarity: 18, momentum: 24, risk: 12, confidence: 10 };

const ui = {};
const runtime = {
  run: 0,
  timers: [],
  videoToken: 0,
  reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  ui.stage = document.querySelector(".stage");
  ui.phaseLabel = document.getElementById("phaseLabel");
  ui.phaseDescription = document.getElementById("phaseDescription");
  ui.avatarVideo = document.getElementById("avatarVideo");
  ui.avatarFallback = document.getElementById("avatarFallback");
  ui.form = document.getElementById("questionForm");
  ui.input = document.getElementById("questionInput");
  ui.demo = document.getElementById("demoQuestions");
  ui.systemLine = document.getElementById("systemLine");
  ui.questionEcho = document.getElementById("questionEcho");
  ui.understandingCard = document.getElementById("understandingCard");
  ui.understandingText = document.getElementById("understandingText");
  ui.optionsGrid = document.getElementById("optionsGrid");
  ui.evaluationCard = document.getElementById("evaluationCard");
  ui.evaluationText = document.getElementById("evaluationText");
  ui.scoreBoard = document.getElementById("scoreBoard");
  ui.decisionCard = document.getElementById("decisionCard");
  ui.decisionContent = document.getElementById("decisionContent");

  registerPlugins();
  buildSampleButtons();
  bindEvents();
  resetBoard();
  updateMetrics(DEFAULT_METRICS);
  setPhase("idle");
  startAmbientMotion();
  animateIntro();
}

function registerPlugins() {
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
    window.CustomEase.create("cognix", "0.22,1,0.36,1");
  }
}

function buildSampleButtons() {
  ui.demo.innerHTML = SAMPLES.map(
    (item) =>
      '<button type="button" data-question="' +
      esc(item.text) +
      '">' +
      esc(item.label) +
      "</button>",
  ).join("");

  ui.demo.querySelectorAll("[data-question]").forEach((button) => {
    button.addEventListener("click", () => {
      ui.input.value = button.dataset.question || "";
      runSimulation(ui.input.value.trim());
    });
  });
}

function bindEvents() {
  ui.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = ui.input.value.trim();
    if (!question) {
      shake(ui.input);
      ui.input.focus();
      return;
    }
    runSimulation(question);
  });
}

function runSimulation(question) {
  runtime.run += 1;
  clearTimers();
  const id = runtime.run;
  const reasoning = makeReasoning(question);

  ui.questionEcho.textContent = question;
  prepBoard();
  setPhase("thinkingIntro");
  setSystemLine(PHASES.thinkingIntro.line);

  queue(id, 650, () => {
    setPhase("thinking");
    setSystemLine(PHASES.thinking.line);
    showUnderstanding(reasoning);
  });
  queue(id, 1900, () => {
    setPhase("analyzing");
    setSystemLine(PHASES.analyzing.line);
    showOptions(reasoning);
  });
  queue(id, 3800, () => {
    setPhase("evaluating");
    setSystemLine(PHASES.evaluating.line);
    showEvaluation(reasoning);
    updateMetrics(reasoning.telemetry);
  });
  queue(id, 5600, () => {
    setPhase("deciding");
    setSystemLine(PHASES.deciding.line);
    highlightWinner(reasoning.decision.winnerIndex);
  });
  queue(id, 7000, () => {
    setPhase("explaining");
    setSystemLine(PHASES.explaining.line);
    showDecision(reasoning);
  });
  queue(id, 11200, () => {
    setPhase("idle");
    setSystemLine("Simulation complete. Ready for the next dilemma.");
  });
}

function makeReasoning(question) {
  const topic = detectTopic(question);
  const options = scoreOptions(buildOptions(question, topic), topic);
  const winner = options[0];
  const runnerUp = options[1];
  const confidence = clamp(56 + (winner.score - runnerUp.score) * 2, 58, 94);

  return {
    understanding:
      "The visible decision is: " +
      question +
      ". The deeper tension is between " +
      topic.tension +
      ". Cognix treats this as a sequencing problem, not just a yes or no question.",
    options,
    evaluation:
      winner.title +
      " leads because it combines stronger clarity and momentum without pushing risk as high as the more aggressive path. " +
      runnerUp.title +
      " remains viable, but the structure is weaker for this scenario.",
    telemetry: {
      clarity: winner.metrics.clarity,
      momentum: winner.metrics.momentum,
      risk: winner.metrics.risk,
      confidence,
    },
    decision: {
      winnerIndex: winner.index,
      winnerTitle: winner.title,
      confidence,
      nextStep:
        winner.kind === "balanced"
          ? "Set a 2 to 6 week checkpoint with explicit success signals."
          : winner.kind === "conservative"
            ? "Protect runway, gather one missing signal, then reassess."
            : "Commit fully and remove the habits that weaken execution.",
      caution:
        winner.kind === "bold"
          ? "Only take this path if your downside runway is real, not assumed."
          : "Turn the recommendation into a dated checkpoint so the logic stays honest.",
      horizon:
        topic.id === "money"
          ? "Review signal over the next 14 to 30 days."
          : "Review signal over the next 2 to 6 weeks.",
      reason:
        "Recommendation: " +
        winner.title +
        ". It keeps more upside than the safest path while staying more controlled than " +
        runnerUp.title +
        ".",
    },
  };
}

function detectTopic(question) {
  const text = question.toLowerCase();
  return (
    TOPICS.find((topic) => topic.words.some((word) => text.includes(word))) || {
      id: "general",
      tension: "certainty, optionality, and long-term upside",
      weights: { clarity: 0.28, momentum: 0.22, upside: 0.25, risk: 0.25 },
    }
  );
}

function buildOptions(question, topic) {
  const explicit = extractOptions(question);
  if (explicit.length >= 3) {
    return explicit.slice(0, 3).map((title, index) => makeOption(title, pickKind(index), topic, question));
  }
  if (explicit.length === 2) {
    return [
      makeOption(explicit[0], "conservative", topic, question),
      makeOption(explicit[1], explicit[0].length > explicit[1].length ? "bold" : "balanced", topic, question),
      makeOption(bridgeOption(topic), "balanced", topic, question),
    ];
  }
  return defaultOptions(topic).map((title, index) => makeOption(title, pickKind(index), topic, question));
}

function extractOptions(question) {
  return Array.from(
    new Set(
      question
        .replace(/[?]/g, " ")
        .split(/\bor\b|\bvs\b|\/|\bversus\b/i)
        .map((part) =>
          part
            .replace(/^(should i|would it be better to|is it smarter to|do i|should we)\s+/i, "")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/^[a-z]/, (char) => char.toUpperCase()),
        )
        .filter(Boolean),
    ),
  );
}

function defaultOptions(topic) {
  if (topic.id === "career") {
    return [
      "Stay stable until the next checkpoint",
      "Run a time-boxed experiment with a safety net",
      "Commit fully to the higher-upside move",
    ];
  }
  if (topic.id === "money") {
    return [
      "Wait and protect the budget",
      "Buy with a strict guardrail",
      "Move now for the higher-upside outcome",
    ];
  }
  if (topic.id === "move") {
    return [
      "Keep the current base and reduce disruption",
      "Test the move before committing fully",
      "Relocate now and optimize for growth",
    ];
  }
  return [
    "Take the lower-risk path",
    "Run a balanced experiment first",
    "Go for the bold upside move",
  ];
}

function bridgeOption(topic) {
  if (topic.id === "career") {
    return "Negotiate a trial period before deciding";
  }
  if (topic.id === "money") {
    return "Delay slightly and define a clear buy trigger";
  }
  if (topic.id === "move") {
    return "Pilot the change before relocating fully";
  }
  return "Create a reversible experiment before committing";
}

function pickKind(index) {
  return ["conservative", "balanced", "bold"][index] || "balanced";
}

function makeOption(title, kind, topic, question) {
  const base = { ...ARCHETYPES[kind].metrics };
  const text = (title + " " + question).toLowerCase();
  if (text.includes("wait") || text.includes("stable") || text.includes("protect")) {
    base.clarity += 4;
    base.momentum -= 8;
    base.risk -= 6;
  }
  if (text.includes("move now") || text.includes("commit") || text.includes("fully")) {
    base.momentum += 8;
    base.upside += 7;
    base.risk += 8;
  }
  if (text.includes("experiment") || text.includes("trial") || text.includes("pilot")) {
    base.clarity += 6;
    base.risk -= 4;
  }
  if (topic.id === "money") {
    base.risk += 4;
    base.clarity += 2;
  }
  if (topic.id === "career") {
    base.upside += 3;
    base.momentum += 2;
  }
  return {
    title,
    kind,
    summary: title + " is framed as the " + kind + " path. " + ARCHETYPES[kind].summary,
    pros: prosFor(kind, topic),
    cons: consFor(kind, topic),
    metrics: {
      clarity: clamp(base.clarity, 20, 98),
      momentum: clamp(base.momentum, 12, 98),
      upside: clamp(base.upside, 18, 98),
      risk: clamp(base.risk, 10, 96),
    },
  };
}

function prosFor(kind, topic) {
  const shared =
    topic.id === "career"
      ? " This matters when learning speed and runway are both real constraints."
      : topic.id === "money"
        ? " This matters when timing and cash protection are part of the decision."
        : " This matters when upside and uncertainty are both real.";
  if (kind === "conservative") {
    return [
      "Protects your floor before you commit harder." + shared,
      "Keeps the decision easier to reverse if new data appears.",
      "Reduces emotional noise while you gather evidence.",
    ];
  }
  if (kind === "balanced") {
    return [
      "Lets you learn quickly without betting everything at once." + shared,
      "Preserves room to pivot after an informed checkpoint.",
      "Usually performs well when the future is still noisy.",
    ];
  }
  return [
    "Accelerates learning and upside if the bet is correct." + shared,
    "Creates a clear commitment instead of half-measures.",
    "Can break indecision by forcing movement.",
  ];
}

function consFor(kind) {
  if (kind === "conservative") {
    return [
      "Can leave meaningful upside on the table.",
      "May delay momentum longer than necessary.",
      "Sometimes creates false comfort instead of progress.",
    ];
  }
  if (kind === "balanced") {
    return [
      "Needs discipline to define a real checkpoint.",
      "Can feel slower than a clean yes or no decision.",
      "If the test is vague, you get mediocre signal back.",
    ];
  }
  return [
    "Carries the highest cost if the assumptions fail.",
    "Can compress too much uncertainty into one leap.",
    "Requires enough runway to survive the downside.",
  ];
}

function scoreOptions(options, topic) {
  return options
    .map((option, index) => ({
      ...option,
      index,
      score: Math.round(
        option.metrics.clarity * topic.weights.clarity +
          option.metrics.momentum * topic.weights.momentum +
          option.metrics.upside * topic.weights.upside +
          (100 - option.metrics.risk) * topic.weights.risk,
      ),
    }))
    .sort((a, b) => b.score - a.score);
}

function prepBoard() {
  resetBoard();
  ui.understandingText.textContent =
    "Question received. Defining the actual problem and filtering out noise.";
  animateIn(ui.understandingCard);
}

function resetBoard() {
  ui.understandingText.textContent =
    "Waiting for input. Cognix will first define what the real decision actually is.";
  ui.evaluationText.textContent =
    "Once the options are visible, Cognix compares upside, reversibility, momentum, and risk.";
  ui.decisionContent.textContent =
    "The final recommendation appears here after the evaluation pass.";
  ui.optionsGrid.innerHTML =
    '<article class="option"><div class="skeleton"></div></article>' +
    '<article class="option"><div class="skeleton"></div></article>' +
    '<article class="option"><div class="skeleton"></div></article>';
  ui.scoreBoard.innerHTML = "";
  [ui.understandingCard, ui.evaluationCard, ui.decisionCard].forEach((node) =>
    node.classList.remove("active"),
  );
}

function showUnderstanding(reasoning) {
  ui.understandingCard.classList.add("active");
  ui.understandingText.textContent = reasoning.understanding;
  animateIn(ui.understandingCard);
}

function showOptions(reasoning) {
  ui.optionsGrid.innerHTML = reasoning.options
    .map(
      (option) =>
        '<article class="option" data-option-index="' +
        option.index +
        '">' +
        '<div class="option-meta"><span>Score</span><strong class="score-pill">' +
        option.score +
        "/100</strong></div>" +
        "<h5>" +
        esc(option.title) +
        "</h5>" +
        "<p>" +
        esc(option.summary) +
        "</p>" +
        stat("Clarity", option.metrics.clarity) +
        stat("Momentum", option.metrics.momentum) +
        stat("Risk", option.metrics.risk) +
        bullets("Upsides", option.pros) +
        bullets("Watchouts", option.cons) +
        "</article>",
    )
    .join("");
  animateIn(ui.optionsGrid.children, 0.12);
}

function showEvaluation(reasoning) {
  ui.evaluationCard.classList.add("active");
  ui.evaluationText.textContent = reasoning.evaluation;
  ui.scoreBoard.innerHTML = reasoning.options
    .map(
      (option, order) =>
        '<div class="score-row" data-score-index="' +
        option.index +
        '">' +
        '<div class="score-main"><span class="score-label">Rank ' +
        (order + 1) +
        "</span><strong>" +
        esc(option.title) +
        '</strong><div class="score-rail"><span style="transform:scaleX(' +
        option.score / 100 +
        ');"></span></div></div>' +
        '<strong class="score-pill">' +
        option.score +
        "/100</strong></div>",
    )
    .join("");
  animateIn([ui.evaluationCard, ...ui.scoreBoard.children], 0.08);
}

function showDecision(reasoning) {
  ui.decisionCard.classList.add("active");
  ui.decisionContent.innerHTML =
    '<span class="decision-badge">Recommended path</span>' +
    '<h5 class="decision-title">' +
    esc(reasoning.decision.winnerTitle) +
    "</h5>" +
    "<p>" +
    esc(reasoning.decision.reason) +
    '</p><div class="decision-grid">' +
    note("Confidence", reasoning.decision.confidence + "%") +
    note("Next step", reasoning.decision.nextStep) +
    note("Caution", reasoning.decision.caution) +
    '</div><p style="margin-top:1rem;">' +
    esc(reasoning.decision.horizon) +
    "</p>";
  animateIn(ui.decisionCard);
}

function highlightWinner(index) {
  ui.optionsGrid.querySelectorAll(".option").forEach((node) => node.classList.remove("active"));
  ui.scoreBoard.querySelectorAll(".score-row").forEach((node) => node.classList.remove("active"));
  const option = ui.optionsGrid.querySelector('[data-option-index="' + index + '"]');
  const score = ui.scoreBoard.querySelector('[data-score-index="' + index + '"]');
  if (option) {
    option.classList.add("active");
  }
  if (score) {
    score.classList.add("active");
  }
  animateIn([option, score].filter(Boolean), 0.06);
}

function setPhase(name) {
  const phase = PHASES[name] || PHASES.idle;
  ui.stage.dataset.phase = name;
  ui.phaseLabel.textContent = phase.label;
  ui.phaseDescription.textContent = phase.description;
  playAvatar(name);
}

function playAvatar(name) {
  const sources = AVATAR[name] || AVATAR.idle;
  const token = ++runtime.videoToken;
  tryVideo(name, sources, 0, token);
}

function tryVideo(name, sources, index, token) {
  if (index >= sources.length) {
    ui.avatarVideo.classList.remove("is-visible");
    ui.avatarFallback.classList.remove("is-hidden");
    if (name === "thinkingIntro") {
      window.setTimeout(() => {
        if (token === runtime.videoToken) {
          playAvatar("thinking");
        }
      }, 600);
    }
    return;
  }

  const video = ui.avatarVideo;
  const done = () => {
    video.removeEventListener("canplay", ok);
    video.removeEventListener("error", fail);
  };
  const ok = () => {
    done();
    if (token !== runtime.videoToken) {
      return;
    }
    video.loop = name !== "thinkingIntro";
    ui.avatarFallback.classList.add("is-hidden");
    video.classList.add("is-visible");
    video.play().catch(() => {
      ui.avatarVideo.classList.remove("is-visible");
      ui.avatarFallback.classList.remove("is-hidden");
    });
    video.onended = null;
    if (name === "thinkingIntro") {
      video.onended = () => {
        if (token === runtime.videoToken) {
          playAvatar("thinking");
        }
      };
    }
  };
  const fail = () => {
    done();
    tryVideo(name, sources, index + 1, token);
  };

  video.pause();
  video.removeAttribute("src");
  video.load();
  video.addEventListener("canplay", ok, { once: true });
  video.addEventListener("error", fail, { once: true });
  video.src = sources[index];
  video.load();
}

function setSystemLine(text) {
  if (!window.gsap || !window.ScrambleTextPlugin || runtime.reduced) {
    ui.systemLine.textContent = text;
    return;
  }
  window.gsap.to(ui.systemLine, {
    duration: 1,
    scrambleText: { text, chars: "lowerCase", revealDelay: 0.15, speed: 0.4 },
    ease: "none",
  });
}

function updateMetrics(values) {
  Object.keys(values).forEach((name) => {
    const value = document.querySelector('[data-metric-value="' + name + '"]');
    const fill = document.querySelector('[data-metric-fill="' + name + '"]');
    if (!value || !fill) {
      return;
    }
    if (!window.gsap || runtime.reduced) {
      value.textContent = values[name] + "%";
      fill.style.transform = "scaleX(" + values[name] / 100 + ")";
      return;
    }
    const state = { value: parseInt(value.textContent, 10) || 0 };
    window.gsap.to(state, {
      value: values[name],
      duration: 1,
      ease: "cognix",
      onUpdate: () => {
        const current = Math.round(state.value);
        value.textContent = current + "%";
        fill.style.transform = "scaleX(" + current / 100 + ")";
      },
    });
  });
}

function queue(id, delay, callback) {
  const timer = window.setTimeout(
    () => id === runtime.run && callback(),
    runtime.reduced ? Math.max(60, Math.round(delay * 0.15)) : delay,
  );
  runtime.timers.push(timer);
}

function clearTimers() {
  runtime.timers.forEach((timer) => window.clearTimeout(timer));
  runtime.timers = [];
}

function animateIntro() {
  if (!window.gsap || runtime.reduced) {
    return;
  }
  const title = document.querySelector(".hero-title");
  if (window.SplitText && title) {
    const split = new window.SplitText(title, { type: "lines,words" });
    window.gsap.from(split.words, {
      yPercent: 110,
      autoAlpha: 0,
      duration: 0.9,
      stagger: 0.04,
      ease: "cognix",
    });
  }
  window.gsap.from(".lead, .chips span, .card", {
    autoAlpha: 0,
    y: 18,
    duration: 0.85,
    stagger: 0.08,
    ease: "cognix",
    delay: 0.12,
  });
}

function startAmbientMotion() {
  if (!window.gsap || runtime.reduced) {
    return;
  }
  window.gsap.to(".ring-a", {
    rotate: 360,
    duration: 24,
    repeat: -1,
    ease: "none",
    transformOrigin: "50% 50%",
  });
  window.gsap.to(".ring-b", {
    rotate: -360,
    duration: 18,
    repeat: -1,
    ease: "none",
    transformOrigin: "50% 50%",
  });
  window.gsap.to(".ring-c", {
    scale: 0.97,
    duration: 3.2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
    transformOrigin: "50% 50%",
  });
  window.gsap.to(".orb-a", {
    yPercent: 16,
    duration: 2.8,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
  window.gsap.to(".orb-b", {
    xPercent: 12,
    yPercent: -8,
    duration: 3.4,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
  window.gsap.to(".orb-c", {
    xPercent: -14,
    yPercent: 10,
    duration: 4,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
  window.gsap.to(".core", {
    scale: 1.08,
    duration: 2.3,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
  window.gsap.to(".bars span", {
    scaleY: 1.35,
    transformOrigin: "50% 50%",
    duration: 0.9,
    repeat: -1,
    yoyo: true,
    stagger: 0.12,
    ease: "sine.inOut",
  });
}

function animateIn(targets, stagger) {
  if (!window.gsap || runtime.reduced) {
    return;
  }
  window.gsap.fromTo(
    targets,
    { autoAlpha: 0, y: 20, scale: 0.98 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.72, stagger: stagger || 0, ease: "cognix" },
  );
}

function shake(node) {
  if (!window.gsap || runtime.reduced) {
    return;
  }
  window.gsap.fromTo(
    node,
    { x: -6 },
    { x: 0, duration: 0.4, keyframes: [{ x: 6 }, { x: -5 }, { x: 4 }, { x: 0 }] },
  );
}

function stat(label, value) {
  return (
    '<div class="stat"><div class="stat-line"><div class="stat-top"><span>' +
    label +
    "</span><strong>" +
    value +
    '%</strong></div><div class="mini-rail"><span style="transform:scaleX(' +
    value / 100 +
    ');"></span></div></div></div>'
  );
}

function bullets(title, items) {
  return (
    '<div class="bullets"><strong>' +
    title +
    "</strong><ul>" +
    items.map((item) => "<li>" + esc(item) + "</li>").join("") +
    "</ul></div>"
  );
}

function note(label, text) {
  return (
    '<div class="decision-note"><strong>' +
    esc(label) +
    "</strong><p>" +
    esc(text) +
    "</p></div>"
  );
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
