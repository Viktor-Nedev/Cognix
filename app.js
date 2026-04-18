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
  voiceEnabled: false,
  activeAudioUrl: "",
  lastProblemSpeech: "",
  lastDebateSpeech: "",
};

document.addEventListener("DOMContentLoaded", initAvatarPage);

function initAvatarPage() {
  registerAvatarPlugins();
  setupPageTransitionLinks();
  setupModeConsole();
  setupVoiceConsole();
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

  const plugins = [window.SplitText, window.ScrambleTextPlugin, window.CustomEase].filter(Boolean);

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

function setupVoiceConsole() {
  const checkbox = document.getElementById("voiceEnabled");
  const speakDecision = document.getElementById("speakDecision");
  const speakVerdict = document.getElementById("speakVerdict");

  if (checkbox) {
    checkbox.addEventListener("change", () => {
      runtime.voiceEnabled = checkbox.checked;
      updateVoiceHint(
        checkbox.checked
          ? "Avatar voice is enabled. Cognix will speak after each AI response."
          : "Enable ElevenLabs voice playback for Cognix responses.",
      );
    });
  }

  if (speakDecision) {
    speakDecision.addEventListener("click", () => {
      if (runtime.lastProblemSpeech) {
        playSpeech(runtime.lastProblemSpeech);
      }
    });
  }

  if (speakVerdict) {
    speakVerdict.addEventListener("click", () => {
      if (runtime.lastDebateSpeech) {
        playSpeech(runtime.lastDebateSpeech);
      }
    });
  }
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

  if (mode === "debate") {
    resetDebateFlow();
    updateAvatarStatus(
      "Debate intake",
      "Start by describing the dispute. After that, Cognix will ask how many viewpoints should enter the room.",
    );
  } else {
    setAvatarState("idle");
  }

  if (!window.gsap || runtime.reduced) {
    return;
  }

  const activePanel = document.querySelector(".mode-panel.is-active");
  if (!activePanel) {
    return;
  }

  window.gsap.fromTo(
    activePanel,
    { autoAlpha: 0, y: 18 },
    { autoAlpha: 1, y: 0, duration: 0.55, ease: "cognixEase" },
  );
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
      const problem = button.dataset.problem || "";
      input.value = problem;
      input.focus();
      submitProblem(problem);
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitProblem(input.value);
  });
}

async function submitProblem(rawProblem) {
  const input = document.getElementById("problemInput");
  const problem = String(rawProblem || "").trim();

  if (!problem) {
    if (input) {
      shakeInput(input);
      input.focus();
    }
    return;
  }

  const submitButton = document.getElementById("problemSubmitButton");
  setButtonLoading(submitButton, true, "Analyzing...");
  showProblemLoading(problem);
  startThinkingSequence();

  try {
    const result = await postJson("/api/problem", { problem });
    renderProblemResult(result);
    playAvatarPhase("thinking");
    updateAvatarStatus(
      "Decision ready",
      "Cognix has mapped the dilemma, compared the paths, and is now presenting the recommendation.",
    );
    await maybeSpeak(result.spokenResponse, "problem");
  } catch (error) {
    renderProblemError(error.message || "Cognix could not reach the AI service.");
    playAvatarPhase("thinking");
    updateAvatarStatus(
      "Connection issue",
      "Cognix could not complete the decision analysis. Check the server and API credentials, then try again.",
    );
  } finally {
    setButtonLoading(submitButton, false, "Start thinking");
  }
}

function showProblemLoading(problem) {
  runtime.lastProblemSpeech = "";
  setSpeakButtonState("speakDecision", false);
  const panel = document.getElementById("problemResult");
  const title = document.getElementById("decisionTitle");
  const summary = document.getElementById("decisionSummary");
  const understanding = document.getElementById("problemUnderstanding");
  const options = document.getElementById("problemOptions");
  const keyTension = document.getElementById("problemKeyTension");
  const evaluation = document.getElementById("problemEvaluation");
  const decision = document.getElementById("problemDecision");
  const decisionWhy = document.getElementById("problemDecisionWhy");
  const nextStep = document.getElementById("problemNextStep");

  panel?.classList.remove("is-hidden");
  if (title) {
    title.textContent = "Reading the dilemma...";
  }
  if (summary) {
    summary.textContent = "Cognix is unpacking the situation and shaping the reasoning flow for: “" + problem + "”";
  }
  if (understanding) {
    understanding.textContent = "The understanding layer is being generated.";
  }
  if (options) {
    options.innerHTML = '<p class="decision-subcopy">Three options will appear here as soon as the AI response arrives.</p>';
  }
  if (keyTension) {
    keyTension.textContent = "The core tension is being identified.";
  }
  if (evaluation) {
    evaluation.innerHTML = "<li>Tradeoff mapping is in progress.</li>";
  }
  if (decision) {
    decision.textContent = "No recommendation yet.";
  }
  if (decisionWhy) {
    decisionWhy.textContent = "Cognix is still comparing the paths.";
  }
  if (nextStep) {
    nextStep.textContent = "";
  }

  animatePanelReveal(panel);
}

function renderProblemResult(result) {
  const title = document.getElementById("decisionTitle");
  const summary = document.getElementById("decisionSummary");
  const understanding = document.getElementById("problemUnderstanding");
  const options = document.getElementById("problemOptions");
  const keyTension = document.getElementById("problemKeyTension");
  const evaluation = document.getElementById("problemEvaluation");
  const decision = document.getElementById("problemDecision");
  const decisionWhy = document.getElementById("problemDecisionWhy");
  const nextStep = document.getElementById("problemNextStep");

  runtime.lastProblemSpeech = result.spokenResponse || "";
  setSpeakButtonState("speakDecision", Boolean(runtime.lastProblemSpeech));

  if (title) {
    if (window.gsap && window.ScrambleTextPlugin) {
      window.gsap.to(title, {
        scrambleText: { text: result.title || "Decision flow ready.", chars: "lowerCase", speed: 0.5 },
        duration: 0.8
      });
    } else {
      title.textContent = result.title || "Decision flow ready.";
    }
  }

  if (summary) summary.textContent = result.summary || "";
  if (understanding) understanding.textContent = result.understanding || "";
  if (options) options.innerHTML = renderDecisionOptions(result.options || []);
  if (keyTension) keyTension.textContent = result.evaluation?.keyTension || "";
  if (evaluation) {
    evaluation.innerHTML = (result.evaluation?.tradeoffs || [])
      .map((item) => "<li>" + escapeHtml(item) + "</li>")
      .join("");
  }
  if (decision) decision.textContent = result.decision?.recommendedOption || "";
  if (decisionWhy) decisionWhy.textContent = result.decision?.rationale || "";
  if (nextStep) nextStep.textContent = result.decision?.nextStep ? "Next step: " + result.decision.nextStep : "";

  animateProblemResult();
}

function renderProblemError(message) {
  const panel = document.getElementById("problemResult");
  const title = document.getElementById("decisionTitle");
  const summary = document.getElementById("decisionSummary");
  const understanding = document.getElementById("problemUnderstanding");
  const options = document.getElementById("problemOptions");
  const keyTension = document.getElementById("problemKeyTension");
  const evaluation = document.getElementById("problemEvaluation");
  const decision = document.getElementById("problemDecision");
  const decisionWhy = document.getElementById("problemDecisionWhy");
  const nextStep = document.getElementById("problemNextStep");

  panel?.classList.remove("is-hidden");
  runtime.lastProblemSpeech = "";
  setSpeakButtonState("speakDecision", false);

  if (title) {
    title.textContent = "AI analysis unavailable.";
  }
  if (summary) {
    summary.textContent = message;
  }
  if (understanding) {
    understanding.textContent = "Check that the local server is running and the Gemini key is valid.";
  }
  if (options) {
    options.innerHTML = '<p class="decision-subcopy">No options could be generated because the AI request failed.</p>';
  }
  if (keyTension) {
    keyTension.textContent = "The reasoning pipeline stopped before evaluation.";
  }
  if (evaluation) {
    evaluation.innerHTML =
      "<li>Confirm the `.env` keys are present.</li><li>Restart the Node server after changing env values.</li>";
  }
  if (decision) {
    decision.textContent = "No decision available.";
  }
  if (decisionWhy) {
    decisionWhy.textContent = "The request did not complete successfully.";
  }
  if (nextStep) {
    nextStep.textContent = "";
  }

  animatePanelReveal(panel);
}

function renderDecisionOptions(options) {
  if (!options.length) {
    return '<p class="decision-subcopy">No options were returned by the AI.</p>';
  }

  return options
    .map((option, index) => {
      const pros = (option.pros || []).map((item) => "<li>" + escapeHtml(item) + "</li>").join("");
      const cons = (option.cons || []).map((item) => "<li>" + escapeHtml(item) + "</li>").join("");

      return (
        '<article class="decision-option-card">' +
        '<span class="tile-label">Option ' +
        String.fromCharCode(65 + index) +
        "</span>" +
        "<h4>" +
        escapeHtml(option.title || "Untitled option") +
        "</h4>" +
        "<p>" +
        escapeHtml(option.summary || "") +
        "</p>" +
        "<ul>" +
        pros +
        cons +
        "</ul>" +
        '<div class="decision-option-meta"><span>Risk: ' +
        escapeHtml(option.risk || "") +
        "</span><span>Confidence: " +
        escapeHtml(String(option.confidence ?? "")) +
        "%</span></div>" +
        "</article>"
      );
    })
    .join("");
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
      updateAvatarStatus(
        "Debate intake",
        "Cognix is listening to what the disagreement is actually about before opening the room to viewpoints.",
      );
    });
  }

  if (countNext) {
    countNext.addEventListener("click", () => {
      syncViewpointCards();
      hideVerdictPanel();
      showDebateStep("arguments");
      updateAvatarStatus(
        "Viewpoints loaded",
        "The room is open. Add each perspective and Cognix will compare them one by one.",
      );
      animateOpinionCards();
    });
  }

  if (argumentsBack) {
    argumentsBack.addEventListener("click", () => {
      showDebateStep("count");
      hideVerdictPanel();
      updateAvatarStatus(
        "Perspective setup",
        "Choose how many viewpoints should enter the debate before the arguments appear.",
      );
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await judgeDebate();
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
    context.value =
      "A product team is split on whether to launch immediately, delay for polish, or ship to a smaller private group first.";
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
  updateAvatarStatus("Viewpoints loaded", "Sample arguments are in place. Cognix is ready to judge the room.");
}

async function judgeDebate() {
  const dispute = String(document.getElementById("debateContext")?.value || "").trim();
  const count = getSelectedViewpointCount();
  const rawOpinions = [
    buildOpinion("A", "Opinion A", document.getElementById("debateA")?.value || ""),
    buildOpinion("B", "Opinion B", document.getElementById("debateB")?.value || ""),
    buildOpinion("C", "Opinion C", document.getElementById("debateC")?.value || ""),
    buildOpinion("D", "Opinion D", document.getElementById("debateD")?.value || ""),
  ];
  const opinions = rawOpinions.slice(0, count).filter((item) => item.text);
  const submitButton = document.querySelector('#debateForm button[type="submit"]');

  if (!dispute) {
    const input = document.getElementById("debateContext");
    shakeInput(input);
    input?.focus();
    showDebateStep("context");
    return;
  }

  if (opinions.length < 2) {
    updateVerdict(
      "Waiting for stronger debate input.",
      "Add at least two viewpoints so Cognix can compare clarity, evidence, practicality, and fairness before choosing the strongest case.",
      { clarity: 14, evidence: 12, fairness: 10 },
      "",
      [],
      "",
    );
    return;
  }

  setButtonLoading(submitButton, true, "Judging...");
  hideVerdictPanel();
  startThinkingSequence();

  try {
    const result = await postJson("/api/debate", { dispute, opinions });
    renderDebateResult(result);
    playAvatarPhase("thinking");
    updateAvatarStatus(
      "Debate verdict",
      "Cognix has compared the room, weighed the strongest case, and is now explaining why that side wins.",
    );
    await maybeSpeak(result.spokenResponse, "debate");
  } catch (error) {
    renderDebateError(error.message || "Cognix could not judge the debate.");
    playAvatarPhase("thinking");
    updateAvatarStatus(
      "Connection issue",
      "Cognix could not complete the debate judgment. Check the server and API credentials, then try again.",
    );
  } finally {
    setButtonLoading(submitButton, false, "Judge the debate");
  }
}

function renderDebateResult(result) {
  const scorecards = Array.isArray(result.scorecards) ? result.scorecards : [];
  const winnerCard = scorecards.find((item) => item.id === result.winnerId) || scorecards[0];

  runtime.lastDebateSpeech = result.spokenResponse || "";
  setSpeakButtonState("speakVerdict", Boolean(runtime.lastDebateSpeech));

  updateVerdict(
    result.verdictTitle || "Debate verdict ready.",
    result.reasoning || "Cognix has chosen the strongest case.",
    winnerCard || { clarity: 0, evidence: 0, fairness: 0 },
    result.moderatorSummary || "",
    scorecards,
    result.winnerId || "",
  );
}

function renderDebateError(message) {
  runtime.lastDebateSpeech = "";
  setSpeakButtonState("speakVerdict", false);
  updateVerdict(
    "Debate verdict unavailable.",
    message,
    { clarity: 10, evidence: 10, fairness: 10 },
    "Check that the local server is running and the Gemini key is valid.",
    [],
    "",
  );
}

function goToDebateCountStep() {
  const context = document.getElementById("debateContext");
  if (!context || !context.value.trim()) {
    shakeInput(context);
    context?.focus();
    return;
  }

  showDebateStep("count");
  updateAvatarStatus(
    "Perspective setup",
    "Now choose how many different viewpoints should enter the debate before the argument cards appear.",
  );
}

function resetDebateFlow() {
  runtime.lastDebateSpeech = "";
  setSpeakButtonState("speakVerdict", false);
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

function updateVerdict(title, reason, scores, moderatorSummary, scorecards, winnerId) {
  const winner = document.getElementById("debateWinner");
  const explanation = document.getElementById("debateReason");
  const summary = document.getElementById("debateModeratorSummary");
  const clarity = document.getElementById("debateClarity");
  const evidence = document.getElementById("debateEvidence");
  const fairness = document.getElementById("debateFairness");
  const scoreboard = document.getElementById("debateScoreboard");
  const panel = document.getElementById("debateVerdict");

  if (winner) {
    if (window.gsap && window.ScrambleTextPlugin) {
      window.gsap.to(winner, {
        scrambleText: { text: title, chars: "7890", speed: 0.4 },
        duration: 0.8
      });
    } else {
      winner.textContent = title;
    }
  }

  if (explanation) {
    if (!window.gsap || !window.ScrambleTextPlugin || runtime.reduced) {
      explanation.textContent = reason;
    } else {
      window.gsap.fromTo(explanation, 
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 1, delay: 0.2, ease: "power2.out" }
      );
      explanation.textContent = reason;
    }
  }

  if (summary) {
    summary.textContent = moderatorSummary || "";
  }

  if (panel) {
    panel.classList.remove("is-hidden");
    const tl = window.gsap.timeline();

    tl.fromTo(panel,
      { autoAlpha: 0, y: 50, scale: 0.98 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 1, ease: "expo.out" }
    );

    tl.to([clarity, evidence, fairness], {
      scaleX: (i, target) => {
        const val = i === 0 ? scores.clarity : i === 1 ? scores.evidence : scores.fairness;
        return (val || 0) / 100;
      },
      duration: 1.5,
      stagger: 0.15,
      ease: "power4.out"
    }, "-=0.5");

    if (scoreboard) {
      scoreboard.innerHTML = renderScorecards(scorecards, winnerId);
      tl.fromTo(scoreboard.children,
        { autoAlpha: 0, x: 20 },
        { autoAlpha: 1, x: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" },
        "-=0.8"
      );
    }
    
    tl.add(() => {
      window.scrollTo({ top: panel.offsetTop - 50, behavior: 'smooth' });
    }, "-=1");
  }
}

function renderScorecards(scorecards, winnerId) {
  if (!Array.isArray(scorecards) || !scorecards.length) {
    return "";
  }

  return scorecards
    .map((card) => {
      const winnerClass = card.id === winnerId ? " is-winner" : "";
      return (
        '<article class="scorecard-item' +
        winnerClass +
        '">' +
        '<div class="scorecard-topline">' +
        "<h4>" +
        escapeHtml(card.label || card.id || "Opinion") +
        "</h4>" +
        '<span class="scorecard-total">Total ' +
        escapeHtml(String(card.total ?? 0)) +
        "</span></div>" +
        '<p class="scorecard-reason">' +
        escapeHtml(card.keyStrength || "") +
        "</p>" +
        '<div class="scorecard-metrics">' +
        "<span>Clarity " +
        escapeHtml(String(card.clarity ?? 0)) +
        "</span>" +
        "<span>Evidence " +
        escapeHtml(String(card.evidence ?? 0)) +
        "</span>" +
        "<span>Fairness " +
        escapeHtml(String(card.fairness ?? 0)) +
        "</span>" +
        "<span>Practicality " +
        escapeHtml(String(card.practicality ?? 0)) +
        "</span></div>" +
        '<p class="scorecard-meta">Weakness: ' +
        escapeHtml(card.keyWeakness || "") +
        "</p>" +
        "</article>"
      );
    })
    .join("");
}


function hideVerdictPanel() {
  const panel = document.getElementById("debateVerdict");
  if (panel) {
    panel.classList.add("is-hidden");
  }
}

function updateAvatarStatus(label, text) {
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

function setAvatarState(state) {
  const stage = document.querySelector(".avatar-stage-center");
  const copy = AVATAR_COPY[state] || AVATAR_COPY.idle;

  if (stage) {
    stage.dataset.phase = state;
  }

  updateAvatarStatus(copy.label, copy.text);
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

async function maybeSpeak(text, mode) {
  if (mode === "problem") {
    runtime.lastProblemSpeech = text || runtime.lastProblemSpeech;
  }
  if (mode === "debate") {
    runtime.lastDebateSpeech = text || runtime.lastDebateSpeech;
  }

  if (!runtime.voiceEnabled || !text) {
    return;
  }

  await playSpeech(text);
}

async function playSpeech(text) {
  const voiceDock = document.getElementById("voiceDock");
  const voicePlayer = document.getElementById("voicePlayer");

  if (!voicePlayer || !text) {
    return;
  }

  updateVoiceHint("Generating voice playback...");

  try {
    const response = await fetch("/api/speak", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Voice request failed." }));
      console.warn("ElevenLabs failed, falling back to browser speech:", payload.error);
      return fallbackToBrowserSpeech(text);
    }

    const blob = await response.blob();
    if (runtime.activeAudioUrl) {
      URL.revokeObjectURL(runtime.activeAudioUrl);
    }

    runtime.activeAudioUrl = URL.createObjectURL(blob);
    voicePlayer.src = runtime.activeAudioUrl;
    voiceDock?.classList.remove("is-hidden");
    await voicePlayer.play().catch(() => {
      return;
    });
    updateVoiceHint("Voice playback is ready (ElevenLabs).");
  } catch (error) {
    console.warn("Speech error, trying browser fallback:", error);
    fallbackToBrowserSpeech(text);
  }
}

function fallbackToBrowserSpeech(text) {
  if (!window.speechSynthesis) {
    updateVoiceHint("Speech synthesis not supported in this browser.");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Try to find a nice English voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) || 
                          voices.find(v => v.lang.startsWith("en"));
  
  if (preferredVoice) utterance.voice = preferredVoice;
  utterance.rate = 0.95;
  utterance.pitch = 1.1;

  utterance.onstart = () => {
    updateVoiceHint("Voice playback active (Browser Fallback).");
    const voiceDock = document.getElementById("voiceDock");
    voiceDock?.classList.remove("is-hidden");
  };

  utterance.onerror = (e) => {
    updateVoiceHint("Browser speech failed: " + e.error);
  };

  window.speechSynthesis.speak(utterance);
}

function updateVoiceHint(text) {
  const hint = document.getElementById("voiceHint");
  if (hint) {
    hint.textContent = text;
  }
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

function animatePanelReveal(node) {
  if (!node || !window.gsap || runtime.reduced) {
    return;
  }

  window.gsap.fromTo(
    node,
    { autoAlpha: 0, y: 24, scale: 0.985 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: "cognixEase" },
  );
}

function animateProblemResult() {
  if (!window.gsap || runtime.reduced) {
    return;
  }

  const segments = document.querySelectorAll(".decision-segment");
  const panel = document.getElementById("problemResult");

  if (!panel || !segments.length) return;

  const tl = window.gsap.timeline({
    onComplete: () => {
      window.scrollTo({
        top: panel.offsetTop + panel.offsetHeight - window.innerHeight + 100,
        behavior: 'smooth'
      });
    }
  });

  tl.fromTo(panel, 
    { autoAlpha: 0, y: 100, scale: 0.95 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 1.2, ease: "expo.out" }
  );

  tl.fromTo(segments,
    { autoAlpha: 0, x: -30, filter: "blur(10px)" },
    { autoAlpha: 1, x: 0, filter: "blur(0px)", duration: 0.8, stagger: 0.25, ease: "power2.out" },
    "-=0.6"
  );

  tl.fromTo(".decision-option-card",
    { autoAlpha: 0, y: 40, rotateX: -15 },
    { autoAlpha: 1, y: 0, rotateX: 0, duration: 0.8, stagger: 0.15, ease: "back.out(1.4)" },
    "-=0.4"
  );
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
  if (!node || !window.gsap || runtime.reduced) {
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

function setButtonLoading(button, isLoading, label) {
  if (!button) {
    return;
  }

  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent.trim();
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? label : button.dataset.defaultLabel;
}

function setSpeakButtonState(id, enabled) {
  const button = document.getElementById(id);
  if (!button) {
    return;
  }
  button.disabled = !enabled;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({ error: "Request failed." }));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function buildOpinion(id, label, text) {
  return { id, label, text: String(text || "").trim() };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
