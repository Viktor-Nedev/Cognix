const AVATAR_SOURCES = {
  idle: "./avatar/normalstate.mp4",
  intro: "./avatar/startthinking.mp4",
  thinking: "./avatar/thinking.mp4",
};

const AVATAR_COPY = {
  idle: {
    label: "Problem solving",
    text: "Cognix is waiting for a problem. When you submit one, it will wake up and shift into the thinking loop.",
  },
  intro: {
    label: "Activation",
    text: "The Cognix has received the dilemma and is entering the first thinking sequence.",
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
  debateView: "intake",
  debateStep: "context",
  voiceEnabled: localStorage.getItem("cognix_voice") !== "false",
  voiceId: localStorage.getItem("cognix_voice_id") || "",
  activeAudioUrl: "",
  lastProblemText: "",
  lastProblemSpeech: "",
  lastDebateSpeech: "",
  social: {
    room: null,
    userId: localStorage.getItem('cognix_uid') || 'U-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
    unsubscribe: null
  },
  thinkingInterval: null
};

localStorage.setItem('cognix_uid', runtime.social.userId);

document.addEventListener("DOMContentLoaded", initAvatarPage);

function initAvatarPage() {
  registerAvatarPlugins();
  setupPageTransitionLinks();
  setupModeConsole();
  setupVoiceConsole();
  setupDebateViewControls();
  buildProblemChips();
  bindProblemForm();
  setupProblemResetButton();
  setupDebateResetButton();
  setupDebateLab();
  syncViewpointCards();
  setupSocialDebate();
  playAvatarPhase("idle");
  setAvatarState("idle");
  syncModePanels();
  setDebateView("intake", { silent: true });
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
  window.CognixTransitions?.init();
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
          ? "ElevenLabs voice is enabled. Cognix will speak after each AI response."
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
  const shell = document.querySelector(".avatar-shell-page");
  if (shell) {
    shell.classList.remove("is-result-mode");
  }
  playAvatarPhase("idle");
  const stage = document.querySelector(".avatar-stage-center");
  if (stage) {
    stage.dataset.phase = "idle";
  }

  document.querySelectorAll(".mode-toggle").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });

  if (mode === "debate") {
    setDebateView("intake", { silent: true });
    resetDebateFlow();
    updateCognixStatus(
      "Debate intake",
      "Start by describing the dispute. After that, Cognix will ask how many viewpoints should enter the room.",
    );
  } else {
    setDebateView("intake", { silent: true });
    setAvatarState("idle");
  }

  syncModePanels();

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

window.switchMode = setActiveMode;

function syncModePanels() {
  const problemPanel = document.querySelector(".problem-console");
  const debatePanel = document.querySelector(".debate-console");
  const modeConsole = document.querySelector(".mode-console");
  const showProblem = runtime.activeMode === "problem";
  const showDebate = runtime.activeMode === "debate";

  if (problemPanel) {
    problemPanel.classList.toggle("is-active", showProblem);
  }

  if (debatePanel) {
    debatePanel.classList.toggle("is-active", showDebate);
  }

  if (modeConsole) {
    modeConsole.dataset.debateView = runtime.activeMode === "debate" ? runtime.debateView : "problem";
  }
}

function setDebateView(view, options = {}) {
  runtime.debateView = view;

  const modeConsole = document.querySelector(".mode-console");
  const openOnlineDebate = document.getElementById("openOnlineDebate");
  const backToDebateIntake = document.getElementById("backToDebateIntake");
  const debateRail = document.getElementById("debateThinkingRail");

  if (modeConsole) {
    modeConsole.dataset.debateView = runtime.activeMode === "debate" ? view : "problem";
  }

  if (openOnlineDebate) {
    openOnlineDebate.classList.toggle("is-hidden", runtime.activeMode !== "debate" || view !== "intake");
  }

  if (backToDebateIntake) {
    backToDebateIntake.classList.toggle("is-hidden", runtime.activeMode !== "debate" || view !== "online");
  }

  hideDebateThinkingRail();

  syncModePanels();

  if (runtime.activeMode !== "debate" || options.silent) {
    return;
  }

  if (view === "intake") {
    updateCognixStatus(
      "Debate intake",
      "Start by describing the dispute. After that, Cognix will ask how many viewpoints should enter the room.",
    );
  } else {
    resetDebateFlow();
    updateCognixStatus(
      "Online debate",
      "Cognix is now moderating the room, comparing the arguments, and deciding which side is strongest.",
    );
  }
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

function setupDebateViewControls() {
  const openOnlineDebate = document.getElementById("openOnlineDebate");
  const backToDebateIntake = document.getElementById("backToDebateIntake");

  if (openOnlineDebate) {
    openOnlineDebate.addEventListener("click", () => {
      setDebateView("online");
    });
  }

  if (backToDebateIntake) {
    backToDebateIntake.addEventListener("click", () => {
      setDebateView("intake");
    });
  }
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

function setupProblemResetButton() {
  const button = document.getElementById("resetProblemFlow");
  if (!button) {
    return;
  }

  button.addEventListener("click", resetProblemFlow);
}

function setupDebateResetButton() {
  const button = document.getElementById("debateResetFlow");
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    resetDebateFlow();
    setDebateView("intake", { silent: true });
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

  if (window.CognixAuth && !window.CognixAuth.currentUser) {
    alert("Please sign up or log in first to use Cognix AI.");
    window.location.href = "./auth.html";
    return;
  }

  if (window.CognixAuth && window.CognixAuth.currentUser) {
    const allowed = await window.CognixAuth.useCase(window.CognixAuth.currentUser.uid);
    if (!allowed) {
      alert("You have reached your daily limit of 10 cases! Please check your profile for the reset timer.");
      return;
    }
  }

  const submitButton = document.getElementById("problemSubmitButton");
  runtime.lastProblemText = problem;
  setButtonLoading(submitButton, true, "Analyzing...");
  startThinkingSequence();
  showProblemLoading(problem);

  try {
    const result = await postJson("/api/problem", { problem });

    renderProblemResult(result);
    void saveProblemHistoryEntry(problem, result);
    updateCognixStatus(
      "Decision ready",
      "Cognix has mapped the dilemma, compared the paths, and is now presenting the recommendation.",
    );
    await maybeSpeak(result.spokenResponse, "problem");
  } catch (error) {
    renderProblemError(error.message || "Cognix could not reach the AI service.");
    playAvatarPhase("thinking");
    updateCognixStatus(
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

  panel?.classList.add("is-hidden");
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

  // Show result in the side status area
  const problemConsole = document.querySelector(".problem-console");
  const resultPanel = document.getElementById("problemResult");
  const resetRow = document.getElementById("problemResetRow");
  const thinkingLoopCopy = document.getElementById("thinkingLoopCopy");
  const shell = document.querySelector(".avatar-shell-page");

  if (problemConsole) {
    problemConsole.classList.remove("is-thinking");
    problemConsole.classList.add("is-result");
  }

  if (shell) {
    shell.classList.add("is-result-mode");
  }

  if (resultPanel) {
    resultPanel.classList.remove("is-hidden");
  }

  if (resetRow) {
    resetRow.classList.remove("is-hidden");
  }
  if (thinkingLoopCopy) {
    thinkingLoopCopy.classList.add("is-hidden");
  }

  stopThinkingCycle(); // Ensure cycle stops
  playAvatarPhase("idle");

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

async function saveProblemHistoryEntry(problem, result) {
  if (!window.CognixAuth?.saveProblemHistory) {
    return;
  }

  const entry = {
    problem,
    title: result?.title || "Decision flow ready.",
    summary: result?.summary || "",
    understanding: result?.understanding || "",
    options: Array.isArray(result?.options) ? result.options : [],
    evaluation: result?.evaluation || null,
    decision: result?.decision || null,
    spokenResponse: result?.spokenResponse || "",
  };

  try {
    await window.CognixAuth.saveProblemHistory(entry);
  } catch (error) {
    console.warn("Could not save problem history entry:", error);
  }
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

  const problemConsole = document.querySelector(".problem-console");
  if (problemConsole) {
    problemConsole.classList.remove("is-thinking", "is-result");
  }

  const shell = document.querySelector(".avatar-shell-page");
  if (shell) {
    shell.classList.remove("is-result-mode");
  }

  const thinkingLoopCopy = document.getElementById("thinkingLoopCopy");
  if (thinkingLoopCopy) {
    thinkingLoopCopy.classList.add("is-hidden");
  }

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
      updateCognixStatus(
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
      updateCognixStatus(
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
      updateCognixStatus(
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
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await judgeDebate();
    });
  }
}

function setupSocialDebate() {
  const btnCreate = document.getElementById("socialOpenCreate");
  const btnJoin = document.getElementById("socialOpenJoin");
  const btnExit = document.getElementById("socialExit");

  if (btnCreate) {
    btnCreate.addEventListener("click", async () => {
      const context = document.getElementById("debateContext")?.value || "Social Debate";
      const count = getSelectedViewpointCount();

      btnCreate.disabled = true;
      btnCreate.textContent = "Creating...";

      try {
        if (!window.CognixSocial?.createDebateRoom) {
          throw new Error("Social debate module is not loaded.");
        }

        const roomId = await window.CognixSocial.createDebateRoom(context, count);

        if (roomId) {
          enterSocialRoom(roomId);
        } else {
          throw new Error("Room creation failed. Please check Firestore access.");
        }
      } catch (error) {
        alert(error.message || "Could not create the social room.");
        console.error(error);
      } finally {
        btnCreate.disabled = false;
        btnCreate.textContent = "Create Social Room";
      }
    });
  }

  if (btnJoin) {
    btnJoin.addEventListener("click", () => {
      const roomId = prompt("Enter Room ID:");
      if (roomId) {
        joinSocialRoom(roomId.toUpperCase().trim());
      }
    });
  }

  if (btnExit) {
    btnExit.addEventListener("click", () => {
      document.getElementById("socialInviteDropdown")?.classList.add("is-hidden");
      exitSocialRoom();
    });
  }

  const btnInvite = document.getElementById("socialInviteBtn");
  if (btnInvite) {
    btnInvite.addEventListener("click", async () => {
      const dropdown = document.getElementById("socialInviteDropdown");
      const list = document.getElementById("socialInviteList");
      if (!dropdown.classList.contains("is-hidden")) {
        dropdown.classList.add("is-hidden");
        return;
      }

      dropdown.classList.remove("is-hidden");
      list.innerHTML = "<p style='font-size: 0.8rem; color: var(--muted)'>Loading network...</p>";

      if (!window.CognixAuth) return;
      const friends = await window.CognixAuth.getFriends();

      if (friends.length === 0) {
        list.innerHTML = "<p style='font-size: 0.8rem; color: var(--muted)'>No friends added yet.</p>";
        return;
      }

      list.innerHTML = "";
      friends.forEach(f => {
        const wrap = document.createElement("div");
        wrap.className = "invite-list-item";

        const name = document.createElement("span");
        name.className = "friend-name";
        name.textContent = f.username;

        const invBtn = document.createElement("button");
        invBtn.className = "mini-invite-btn";
        invBtn.textContent = "Invite";
        invBtn.onclick = async () => {
          invBtn.textContent = "Sent!";
          invBtn.disabled = true;
          await window.CognixAuth.sendInvite(f.uid, runtime.social.room);
        };

        wrap.appendChild(name);
        wrap.appendChild(invBtn);
        list.appendChild(wrap);
      });
    });
  }

  // Bind typing events to sync arguments
  ["debateA", "debateB", "debateC", "debateD"].forEach((id, index) => {
    const textarea = document.getElementById(id);
    if (textarea) {
      textarea.addEventListener("input", () => {
        if (runtime.social.room) {
          window.CognixSocial.addArgument(runtime.social.room, runtime.social.userId, textarea.value);
        }
      });
    }
  });

  // Global Invite Listener
  document.addEventListener('cognix_receive_invite', (e) => {
    const invite = e.detail;
    if (runtime.social.room === invite.roomId) {
      // I am already in this room
      window.CognixAuth.clearInvite(invite);
      return;
    }

    const banner = document.createElement("div");
    banner.style.position = "fixed";
    banner.style.bottom = "20px";
    banner.style.right = "20px";
    banner.style.background = "var(--surface)";
    banner.style.border = "1px solid var(--accent)";
    banner.style.padding = "1rem";
    banner.style.borderRadius = "12px";
    banner.style.zIndex = "9999";
    banner.style.boxShadow = "0 10px 40px rgba(0,0,0,0.5)";

    banner.innerHTML = `
          <h4 style="margin: 0 0 0.5rem; color: var(--accent);">Social Debate Invite</h4>
          <p style="margin: 0 0 1rem; font-size: 0.9rem;"><strong>${invite.from}</strong> invited you to join their decision room!</p>
          <div style="display: flex; gap: 0.5rem;">
              <button id="accInv" style="background: var(--accent); color: #000; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: bold;">Join Room</button>
              <button id="decInv" style="background: transparent; color: var(--muted); border: 1px solid var(--line); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;">Decline</button>
          </div>
      `;

    document.body.appendChild(banner);
    if (window.gsap) {
      window.gsap.from(banner, { y: 50, autoAlpha: 0, duration: 0.5, ease: "back.out(1.7)" });
    }

    banner.querySelector("#accInv").onclick = async () => {
      banner.remove();
      await window.CognixAuth.clearInvite(invite);
      if (window.location.pathname.indexOf("cognix.html") === -1) {
        // Store invite to join after redirect
        localStorage.setItem("cognix_pending_room", invite.roomId);
        window.location.href = "./cognix.html";
      } else {
        switchMode("debate");
        joinSocialRoom(invite.roomId);
      }
    };

    banner.querySelector("#decInv").onclick = async () => {
      banner.remove();
      await window.CognixAuth.clearInvite(invite);
    };
  });

  // Handle pending joins after redirect
  const pendingRoom = localStorage.getItem("cognix_pending_room");
  if (pendingRoom) {
    localStorage.removeItem("cognix_pending_room");
    setTimeout(() => {
      switchMode("debate");
      joinSocialRoom(pendingRoom);
    }, 500);
  }
}

function enterSocialRoom(roomId) {
  runtime.social.room = roomId;
  document.getElementById("socialStatusBar").classList.remove("is-hidden");
  document.getElementById("socialStatusText").textContent = "Connected to Room: " + roomId;
  setDebateView("online", { silent: true });

  // Start listening
  if (runtime.social.unsubscribe) runtime.social.unsubscribe();
  runtime.social.unsubscribe = window.CognixSocial.joinDebateRoom(roomId, handleSocialSync);

  updateCognixStatus("Social Room Active", "You are now in a live shared debate. Invite friends using ID: " + roomId);
}

function joinSocialRoom(roomId) {
  enterSocialRoom(roomId);
}

function exitSocialRoom() {
  if (runtime.social.unsubscribe) runtime.social.unsubscribe();
  runtime.social.unsubscribe = null;
  runtime.social.room = null;
  document.getElementById("socialStatusBar").classList.add("is-hidden");
  updateCognixStatus("Social mode ended", "You have left the shared room.");
}

function handleSocialSync(data) {
  // If the data came from us, don't overwrite local (to avoid cursor jump)
  // But for others, update their fields.
  // In this simple version, we'll try to map users to slots A, B, C, D
  const userIds = Object.keys(data.arguments || []).sort();

  userIds.forEach((uid, index) => {
    if (uid === runtime.social.userId) return; // Don't overwrite local typing

    const slotId = ["debateA", "debateB", "debateC", "debateD"][index];
    const input = document.getElementById(slotId);
    if (input) {
      input.value = data.arguments[uid];
    }
  });

  if (data.context && !document.getElementById("debateContext").value) {
    document.getElementById("debateContext").value = data.context;
  }
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
  updateCognixStatus("Viewpoints loaded", "Sample arguments are in place. Cognix is ready to judge the room.");
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

  if (window.CognixAuth && !window.CognixAuth.currentUser) {
    alert("Please sign up or log in first to use Cognix AI.");
    window.location.href = "./auth.html";
    return;
  }

  if (window.CognixAuth && window.CognixAuth.currentUser) {
    const allowed = await window.CognixAuth.useCase(window.CognixAuth.currentUser.uid);
    if (!allowed) {
      alert("You have reached your daily limit of 10 cases! Please check your profile for the reset timer.");
      return;
    }
  }

  setButtonLoading(submitButton, true, "Judging...");
  hideVerdictPanel();
  startDebateThinkingSequence();

  try {
    const result = await postJson("/api/debate", { dispute, opinions });
    renderDebateResult(result);
    playAvatarPhase("idle");
    updateCognixStatus(
      "Debate verdict",
      "Cognix has compared the room, weighed the strongest case, and is now explaining why that side wins.",
    );
    await maybeSpeak(result.spokenResponse, "debate");
  } catch (error) {
    renderDebateError(error.message || "Cognix could not judge the debate.");
    playAvatarPhase("idle");
    updateCognixStatus(
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
  const debateConsole = document.querySelector(".debate-console");
  const shell = document.querySelector(".avatar-shell-page");
  const modeConsole = document.querySelector(".mode-console");
  const resetRow = document.getElementById("debateResetRow");

  runtime.lastDebateSpeech = result.spokenResponse || "";
  setSpeakButtonState("speakVerdict", Boolean(runtime.lastDebateSpeech));
  hideDebateThinkingRail();
  if (debateConsole) {
    debateConsole.classList.remove("is-thinking");
    debateConsole.classList.add("is-result");
  }
  if (shell) {
    shell.classList.add("is-result-mode");
  }
  if (modeConsole) {
    modeConsole.classList.add("is-debate-result");
  }
  if (resetRow) {
    resetRow.classList.remove("is-hidden");
  }

  updateVerdict(
    result.verdictTitle || "Debate verdict ready.",
    result.reasoning || "Cognix has chosen the strongest case.",
    winnerCard || { clarity: 0, evidence: 0, fairness: 0 },
    result.moderatorSummary || "",
    scorecards,
    result.winnerId || "",
  );
  stopDebateThinkingSequence();
}

function renderDebateError(message) {
  runtime.lastDebateSpeech = "";
  setSpeakButtonState("speakVerdict", false);
  stopDebateThinkingSequence();
  hideDebateThinkingRail();
  const debateConsole = document.querySelector(".debate-console");
  const shell = document.querySelector(".avatar-shell-page");
  const modeConsole = document.querySelector(".mode-console");
  const resetRow = document.getElementById("debateResetRow");
  if (debateConsole) {
    debateConsole.classList.remove("is-thinking", "is-result");
  }
  if (shell) {
    shell.classList.remove("is-result-mode");
  }
  if (modeConsole) {
    modeConsole.classList.remove("is-debate-result");
  }
  if (resetRow) {
    resetRow.classList.add("is-hidden");
  }
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
  updateCognixStatus(
    "Perspective setup",
    "Now choose how many different viewpoints should enter the debate before the argument cards appear.",
  );
}

function resetDebateFlow(settings = {}) {
  runtime.lastDebateSpeech = "";
  setSpeakButtonState("speakVerdict", false);
  setSelectedViewpointCount("3");
  showDebateStep("context", false);
  hideVerdictPanel();
  hideDebateThinkingRail();
  const debateConsole = document.querySelector(".debate-console");
  const shell = document.querySelector(".avatar-shell-page");
  const modeConsole = document.querySelector(".mode-console");
  const resetRow = document.getElementById("debateResetRow");
  if (debateConsole) {
    debateConsole.classList.remove("is-thinking", "is-result");
  }
  if (shell) {
    shell.classList.remove("is-result-mode");
  }
  if (modeConsole) {
    modeConsole.classList.remove("is-debate-result");
  }
  if (resetRow) {
    resetRow.classList.add("is-hidden");
  }

  if (!settings.preserveInputs) {
    ["debateContext", "debateA", "debateB", "debateC", "debateD"].forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.value = "";
      }
    });
  }
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

function updateCognixStatus(label, text) {
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

  updateCognixStatus(copy.label, copy.text);
}

function startThinkingSequence() {
  const problemConsole = document.querySelector(".problem-console");
  const resultPanel = document.getElementById("problemResult");
  const voiceDock = document.getElementById("voiceDock");
  const resetRow = document.getElementById("problemResetRow");
  const thinkingLoopCopy = document.getElementById("thinkingLoopCopy");
  const shell = document.querySelector(".avatar-shell-page");
  if (problemConsole) {
    problemConsole.classList.remove("is-result");
    problemConsole.classList.add("is-thinking");
  }
  if (resultPanel) resultPanel.classList.add("is-hidden");
  if (voiceDock) voiceDock.classList.add("is-hidden");
  if (resetRow) resetRow.classList.add("is-hidden");
  if (thinkingLoopCopy) thinkingLoopCopy.classList.remove("is-hidden");
  if (shell) shell.classList.remove("is-result-mode");

  playAvatarPhase("thinking"); // Start loop immediately
  setAvatarState("thinking");
  startThinkingCycle("thinkingLoopText", [
    "Cognix is reviewing the dilemma...",
    "Searching for the optimal path...",
    "Synthesizing AI reasoning...",
    "Finalizing decision flow...",
  ]);
}

function resetProblemFlow(settings = {}) {
  const problemConsole = document.querySelector(".problem-console");
  const resultPanel = document.getElementById("problemResult");
  const resetRow = document.getElementById("problemResetRow");
  const thinkingLoopCopy = document.getElementById("thinkingLoopCopy");
  const shell = document.querySelector(".avatar-shell-page");
  const input = document.getElementById("problemInput");
  const resultTitle = document.getElementById("decisionTitle");
  const resultSummary = document.getElementById("decisionSummary");
  const understanding = document.getElementById("problemUnderstanding");
  const options = document.getElementById("problemOptions");
  const keyTension = document.getElementById("problemKeyTension");
  const evaluation = document.getElementById("problemEvaluation");
  const decision = document.getElementById("problemDecision");
  const decisionWhy = document.getElementById("problemDecisionWhy");
  const nextStep = document.getElementById("problemNextStep");

  stopThinkingCycle();
  runtime.lastProblemSpeech = "";
  setSpeakButtonState("speakDecision", false);

  if (problemConsole) {
    problemConsole.classList.remove("is-thinking", "is-result");
  }
  if (shell) {
    shell.classList.remove("is-result-mode");
  }
  if (resultPanel) {
    resultPanel.classList.add("is-hidden");
  }
  if (resetRow) {
    resetRow.classList.add("is-hidden");
  }
  if (thinkingLoopCopy) {
    thinkingLoopCopy.classList.add("is-hidden");
  }
  if (input) {
    if (!settings.preserveInput) {
      input.value = "";
      input.focus();
    }
  }
  if (resultTitle) resultTitle.textContent = "Waiting for a problem.";
  if (resultSummary) resultSummary.textContent = "Submit a dilemma and Cognix will break it into an understanding layer, three options, an evaluation stage, and a final recommendation.";
  if (understanding) understanding.textContent = "The decision context will appear here once the AI response arrives.";
  if (options) options.innerHTML = "";
  if (keyTension) keyTension.textContent = "Cognix will surface the core tension behind the decision here.";
  if (evaluation) evaluation.innerHTML = "";
  if (decision) decision.textContent = "No recommendation yet.";
  if (decisionWhy) decisionWhy.textContent = "The final call will appear here with a practical explanation.";
  if (nextStep) nextStep.textContent = "";

  setAvatarState("idle");
  playAvatarPhase("idle");
}

function startDebateThinkingSequence() {
  const debateRail = document.getElementById("debateThinkingRail");
  const debateConsole = document.querySelector(".debate-console");
  const modeConsole = document.querySelector(".mode-console");
  const resetRow = document.getElementById("debateResetRow");
  if (debateRail) {
    debateRail.classList.remove("is-hidden");
  }
  if (debateConsole) {
    debateConsole.classList.remove("is-result");
    debateConsole.classList.add("is-thinking");
  }
  if (modeConsole) {
    modeConsole.classList.remove("is-debate-result");
    modeConsole.classList.add("is-debate-thinking");
  }
  if (resetRow) {
    resetRow.classList.add("is-hidden");
  }

  playAvatarPhase("thinking");
  setAvatarState("thinking");

  updateDebateThinkingStatus("Cognix is reviewing the debate...");
  startThinkingCycle("debateThinkingText", [
    "Cognix is reviewing the debate...",
    "Comparing the viewpoints...",
    "Balancing evidence and fairness...",
    "Finalizing the verdict...",
  ]);
}

function stopDebateThinkingSequence() {
  stopThinkingCycle();
  hideDebateThinkingRail();
  const debateConsole = document.querySelector(".debate-console");
  const modeConsole = document.querySelector(".mode-console");
  if (debateConsole) {
    debateConsole.classList.remove("is-thinking");
  }
  if (modeConsole) {
    modeConsole.classList.remove("is-debate-thinking");
  }
}

function updateDebateThinkingStatus(text) {
  const label = document.getElementById("debateThinkingText");
  if (label) {
    label.textContent = text;
  }
}

function hideDebateThinkingRail() {
  const debateRail = document.getElementById("debateThinkingRail");
  if (debateRail) {
    debateRail.classList.add("is-hidden");
  }
}

function startThinkingCycle(targetId = "thinkingLoopText", phrases = [
  "Cognix is reviewing the dilemma...",
  "Searching for the optimal path...",
  "Synthesizing AI reasoning...",
  "Finalizing decision flow...",
]) {
  stopThinkingCycle();
  let current = 1; // Start from second phrase to show rotation faster

  const textEl = document.getElementById(targetId);
  if (!textEl) return;

  if (window.gsap) {
    window.gsap.set(textEl, { autoAlpha: 1, y: 0 });
  }

  runtime.thinkingInterval = setInterval(() => {
    if (!window.gsap) {
      textEl.textContent = phrases[current];
      current = (current + 1) % phrases.length;
      return;
    }

    window.gsap.to(textEl, {
      autoAlpha: 0,
      y: -8,
      duration: 0.35,
      ease: "power2.in",
      onComplete: () => {
        textEl.textContent = phrases[current];
        current = (current + 1) % phrases.length;
        window.gsap.to(textEl, { 
          autoAlpha: 1, 
          y: 0, 
          duration: 0.45,
          ease: "power2.out" 
        });
      }
    });
  }, 2200);
}

function stopThinkingCycle() {
  if (runtime.thinkingInterval) {
    clearInterval(runtime.thinkingInterval);
    runtime.thinkingInterval = null;
  }
}

function playAvatarPhase(phase) {
  const video = document.getElementById("avatarPlayer");
  if (!video) {
    return;
  }

  runtime.videoToken += 1;
  const source = AVATAR_SOURCES[phase] || AVATAR_SOURCES.idle;

  // Faster transition: just swap src and play
  video.onended = null;
  video.loop = phase !== "intro";
  video.pause();
  video.currentTime = 0;
  video.src = source;
  video.load();

  video.play().catch(() => {
    // Fallback if autoplay is blocked by browser
  });
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
    const selectedVoiceId = runtime.voiceId || localStorage.getItem("cognix_voice_id") || "";
    const response = await fetch("/api/speak", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voiceId: selectedVoiceId,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Voice request failed." }));
      console.warn("ElevenLabs failed:", payload.error);
      updateVoiceHint("ElevenLabs voice playback failed: " + payload.error);
      return;
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
    console.warn("Speech error:", error);
    updateVoiceHint("ElevenLabs voice playback failed. Check the API key and selected voice.");
  }
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
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
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
