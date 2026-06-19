const skinQuestionMap = {
  gender: {
    id: "gender",
    label: "기본 정보",
    prompt: "반가워요! 가장 만족스러운 루틴을 설계하기 위해, 고객님의 성별을 선택해 주세요.",
    ack: {
      male: "좋아요. 사용하기 편하면서도 효과가 보이는 루틴으로 설계해볼게요.",
      female: "좋아요. 피부 고민별 단계 조합까지 섬세하게 반영하겠습니다.",
      other: "좋아요. 성별 고정값보다 피부 특성과 루틴 성향을 중심으로 보겠습니다.",
      skip: "괜찮아요. 답변해주신 피부 상태 중심으로 추천하겠습니다."
    },
    options: [
      { value: "남성", text: "남성", key: "male" },
      { value: "여성", text: "여성", key: "female" },
      { value: "기타/직접 선택 안 함", text: "기타 / 선택 안 함", key: "other" },
      { value: "응답하지 않음", text: "답변하지 않고 건너뛰기", key: "skip" }
    ]
  },
  ageRange: {
    id: "ageRange",
    label: "나이대",
    prompt: "현재 나이대는 어떻게 되시나요? 연령대별 피부 재생 주기에 맞춘 최적의 솔루션을 찾아드려요.",
    ack: {
      teen: "A코스로 볼게요. 피지 제어와 트러블 집중 케어 쪽을 먼저 확인하겠습니다.",
      twenties: "A코스로 볼게요. 피지, 트러블, 유수분 밸런스를 중심으로 보겠습니다.",
      thirties: "B코스로 볼게요. 장벽 강화와 초기 안티에이징 관점을 함께 반영하겠습니다.",
      forties: "B코스로 볼게요. 장벽, 탄력, 톤 균일감을 함께 살피겠습니다.",
      fifties: "B코스로 볼게요. 보습 밀도와 탄력 케어 비중을 높여 보겠습니다."
    },
    options: [
      { value: "10대", text: "10대", key: "teen" },
      { value: "20대", text: "20대", key: "twenties" },
      { value: "30대", text: "30대", key: "thirties" },
      { value: "40대", text: "40대", key: "forties" },
      { value: "50대 이상", text: "50대 이상", key: "fifties" }
    ]
  },
  youngConcern: {
    id: "youngConcern",
    label: "A코스 · 주요 고민",
    prompt: "지금 가장 해결하고 싶은 피부 고민은 무엇인가요?",
    ack: {
      trouble: "트러블과 붉은 자국을 진정 중심으로 보겠습니다.",
      pore: "모공과 과도한 피지를 산뜻한 밸런스 관점으로 보겠습니다.",
      tone: "칙칙함과 생기 부족을 수분감과 톤 균일감으로 함께 보겠습니다.",
      dry: "속당김 신호가 크므로 수분 유지와 장벽 보완을 우선하겠습니다."
    },
    options: [
      { value: "갑작스러운 트러블과 붉은 자국", text: "갑작스러운 트러블과 붉은 자국", key: "trouble" },
      { value: "넓어지는 모공과 과도한 피지", text: "넓어지는 모공과 과도한 피지", key: "pore" },
      { value: "푸석하고 칙칙한 피부 톤", text: "푸석하고 칙칙한 피부 톤", key: "tone" },
      { value: "세안 후 유독 심한 속당김", text: "세안 후 유독 심한 속당김", key: "dry" }
    ]
  },
  youngOilTiming: {
    id: "youngOilTiming",
    label: "A코스 · 유분 올라오는 시간",
    prompt: "일상생활 중, 피부에 기름기(유분)가 돌기 시작하는 때는 언제인가요?",
    ack: {
      early: "오전부터 빠른 유분 신호가 있어 산뜻한 오일컨트롤을 우선하겠습니다.",
      afternoon: "오후 유분 패턴이면 유수분 밸런스 중심으로 보겠습니다.",
      dry: "유분이 적거나 늦게 올라오면 보습과 장벽을 더 중요하게 보겠습니다."
    },
    options: [
      { value: "오전부터 금방", text: "오전부터 금방", key: "early" },
      { value: "점심 지나서 오후쯤", text: "점심 지나서 오후쯤", key: "afternoon" },
      { value: "저녁이나 밤늦게쯤 / 유분이 거의 없음", text: "저녁이나 밤늦게쯤 / 유분이 거의 없음", key: "dry" }
    ]
  },
  matureConcern: {
    id: "matureConcern",
    label: "B코스 · 주요 고민",
    prompt: "지금 가장 해결하고 싶은 피부 고민은 무엇인가요?",
    ack: {
      aging: "탄력과 미세 주름 신호를 얼리 안티에이징 관점으로 보겠습니다.",
      sensitive: "예민함과 장벽 복구를 가장 우선으로 보겠습니다.",
      pigment: "잡티, 기미, 칙칙함은 광채와 톤 균일감 방향으로 보겠습니다.",
      dry: "극심한 건조감은 깊은 보습과 장벽 강화 중심으로 보겠습니다."
    },
    options: [
      { value: "탄력 저하와 미세한 주름", text: "탄력 저하와 미세한 주름", key: "aging" },
      { value: "쉽게 붉어지고 따가운 예민함", text: "쉽게 붉어지고 따가운 예민함", key: "sensitive" },
      { value: "짙어지는 잡티와 기미, 칙칙한 톤", text: "짙어지는 잡티와 기미, 칙칙한 톤", key: "pigment" },
      { value: "아무리 발라도 해소되지 않는 극심한 건조함", text: "아무리 발라도 해소되지 않는 극심한 건조함", key: "dry" }
    ]
  },
  matureRecovery: {
    id: "matureRecovery",
    label: "B코스 · 피부 회복력",
    prompt: "아침에 생긴 베개 자국이 늦게까지 남아있거나, 환절기마다 피부가 확 뒤집어지시나요?",
    ack: {
      slow: "피부 회복 속도가 느린 편으로 보고 탄력과 장벽 케어를 강화하겠습니다.",
      seasonal: "컨디션과 계절 영향을 받는 피부로 보고 안정화 루틴을 함께 잡겠습니다.",
      fast: "회복력이 좋은 편이라 기본 장벽을 유지하면서 고민 성분을 조합하겠습니다."
    },
    options: [
      { value: "피부 회복이 느리다고 확연히 느껴요", text: "네, 예전보다 피부 회복이 느리다고 확연히 느껴요", key: "slow" },
      { value: "컨디션이나 계절에 따라 가끔 그래요", text: "컨디션이나 계절에 따라 가끔 그래요", key: "seasonal" },
      { value: "아직은 탄탄하고 회복이 빠른 편이에요", text: "아니요, 아직은 탄탄하고 회복이 빠른 편이에요", key: "fast" }
    ]
  },
  afterCleanse: {
    id: "afterCleanse",
    label: "세안 후 느낌",
    prompt: "세안 후 아무것도 바르지 않고 30분이 지났을 때, 피부 상태는 어떤가요?",
    ack: {
      tight: "세안 후 당김이 있어 수분 유지력과 장벽 컨디션을 함께 보겠습니다.",
      stable: "편안한 상태라면 주요 고민과 루틴 성향을 더 중심으로 보겠습니다.",
      tzone: "T존 중심 유분 패턴은 복합성 밸런스로 반영하겠습니다.",
      oily: "전체 유분이 올라오는 편이면 피지 밸런스와 산뜻한 마무리를 보겠습니다."
    },
    options: [
      { value: "전체적으로 당기고 건조해요", text: "전체적으로 당기고 건조해요", key: "tight" },
      { value: "당김이나 번들거림 없이 편안해요", text: "당김이나 번들거림 없이 편안해요", key: "stable" },
      { value: "T존만 번들거려요", text: "T존(이마, 코)만 번들거려요", key: "tzone" },
      { value: "얼굴 전체가 번들거리고 유분이 올라와요", text: "얼굴 전체가 번들거리고 유분이 올라와요", key: "oily" }
    ]
  },
  routineStyle: {
    id: "routineStyle",
    label: "루틴 성향",
    prompt: "평소 어떤 스타일의 스킨케어가 가장 편하게 느껴지시나요?",
    ack: {
      allinone: "하나로 빠르게 끝나는 루틴을 우선 고려하겠습니다.",
      minimal: "핵심 2~3단계 안에서 효율적인 조합을 찾겠습니다.",
      basic: "기본 루틴이 익숙하시니 토너-에센스-크림 흐름으로도 보겠습니다.",
      maximal: "여러 단계도 가능하니 고민별 레이어드 루틴까지 열어두겠습니다."
    },
    options: [
      { value: "올인원 마니아", text: "올인원 마니아: 하나로 쉽고 빠르게 끝내고 싶어요", key: "allinone" },
      { value: "미니멀리스트", text: "미니멀리스트: 스킨, 로션 등 2~3단계 정도가 딱 좋아요", key: "minimal" },
      { value: "베이직 정석", text: "베이직 정석: 토너-에센스-크림 기본 루틴이 익숙해요", key: "basic" },
      { value: "맥시멀리스트", text: "맥시멀리스트: 피부를 위해 여러 단계도 기꺼이 시도해볼래요", key: "maximal" }
    ]
  },
  avoidPreference: {
    id: "avoidPreference",
    label: "피하고 싶은 특징",
    prompt: "화장품을 고를 때 이것만큼은 피하고 싶다! 하는 특징이 있나요?",
    ack: {
      fragrance: "향 부담이 적은 방향으로 제품을 보겠습니다.",
      heavy: "답답한 사용감은 피하고 마무리감이 편한 제품을 우선하겠습니다.",
      sticky: "끈적임이 적은 사용감을 우선 반영하겠습니다.",
      none: "제외 조건 없이 피부 타입과 성분 적합도를 중심으로 보겠습니다."
    },
    options: [
      { value: "강한 향", text: "인공적이고 강한 향", key: "fragrance" },
      { value: "무겁고 답답한 사용감", text: "무겁고 답답한 사용감", key: "heavy" },
      { value: "끈적거리는 잔여감", text: "바른 뒤 끈적거리는 잔여감", key: "sticky" },
      { value: "없음", text: "딱히 없음", key: "none" }
    ]
  }
};

const baseQuestionIds = ["gender", "ageRange"];
const youngQuestionIds = ["youngConcern", "youngOilTiming"];
const matureQuestionIds = ["matureConcern", "matureRecovery"];
const sharedQuestionIds = ["afterCleanse", "routineStyle", "avoidPreference"];
const surveyQuestionCount = 7;

function isYoungAgeRange(ageRange) {
  return /10대|20대/.test(ageRange || "");
}

function getAgeCourse(ageRange) {
  return isYoungAgeRange(ageRange)
    ? { value: "A_10_20", label: "A코스: 피지 제어 및 트러블 집중 케어" }
    : { value: "B_30_50", label: "B코스: 장벽 강화 및 안티에이징" };
}

function getActiveQuestionIds() {
  const ids = [...baseQuestionIds];
  if (!state.answers.ageRange) {
    return ids;
  }

  ids.push(...(isYoungAgeRange(state.answers.ageRange) ? youngQuestionIds : matureQuestionIds));
  ids.push(...sharedQuestionIds);
  return ids;
}

const modal = document.getElementById("skinModal");
const chatThread = document.getElementById("chatThread");
const chatControls = document.getElementById("chatControls");
const typingIndicator = document.getElementById("typingIndicator");
const snapshotList = document.getElementById("snapshotList");
const restartChatButton = document.getElementById("restartChatButton");
const progressLabel = document.getElementById("chatProgressLabel");
const progressPercent = document.getElementById("chatProgressPercent");
const apiStatusDot = document.getElementById("apiStatusDot");
const apiStatusText = document.getElementById("apiStatusText");

const state = {
  stepIndex: -1,
  answers: {},
  answerLabels: {},
  compressedImages: [],
  complete: false,
  started: false
};

let lastFocusedElement = null;
let analysisInFlight = false;

init();

function init() {
  document.querySelectorAll("[data-open-skin-modal]").forEach((button) => {
    button.addEventListener("click", openModal);
  });

  document.querySelectorAll("[data-close-skin-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  restartChatButton.addEventListener("click", restartChat);
  refreshApiStatus();
}

function openModal() {
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => modal.classList.add("is-open"));

  if (!state.started) {
    bootChat();
  }
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  window.setTimeout(() => {
    if (modal.getAttribute("aria-hidden") === "true") {
      modal.hidden = true;
    }
  }, 220);

  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
}

async function refreshApiStatus() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    apiStatusDot.classList.toggle("is-live", data.hasOpenAIKey);
    apiStatusText.textContent = data.hasOpenAIKey
      ? `OpenAI 연결 준비됨 · ${data.model}`
      : "데모 모드 · .env에 OPENAI_API_KEY 필요";
  } catch {
    apiStatusText.textContent = "로컬 서버 상태 확인 실패";
  }
}

function bootChat() {
  state.started = true;
  chatThread.innerHTML = "";
  chatControls.innerHTML = "";
  updateSnapshot();
  updateProgress();
  addBotMessage("안녕하세요. 더뷰티 AI 스킨 컨시어지입니다.");
  addBotMessage("먼저 기본 정보를 확인한 뒤, 나이대에 맞춰 A코스 또는 B코스 질문으로 이어갈게요. 가격과 방송 알림은 추천 결과를 본 뒤 마지막에 안내드리겠습니다.");
  window.setTimeout(showNextQuestion, 360);
}

function restartChat() {
  if (analysisInFlight) return;
  state.stepIndex = -1;
  state.answers = {};
  state.answerLabels = {};
  state.compressedImages = [];
  state.complete = false;
  state.started = false;
  updateSnapshot();
  updateProgress();
  bootChat();
}

function showNextQuestion() {
  state.stepIndex += 1;
  updateProgress();

  const activeQuestionIds = getActiveQuestionIds();
  const question = skinQuestionMap[activeQuestionIds[state.stepIndex]];
  if (!question) {
    showPhotoUploadStep();
    return;
  }

  showTyping(() => {
    addBotMessage(question.prompt, `Question ${state.stepIndex + 1}`);
    renderChoiceControls(question);
  });
}

function renderChoiceControls(question) {
  chatControls.innerHTML = `
    <div class="control-intro">
      <strong>${question.label}</strong>
      <p>가장 가까운 답변을 선택해 주세요.</p>
    </div>
    <div class="choice-grid">
      ${question.options.map((option) => `
        <button class="choice-button" type="button" data-value="${escapeHtml(option.value)}" data-key="${escapeHtml(option.key)}">
          ${escapeHtml(option.text)}
        </button>
      `).join("")}
    </div>
  `;

  chatControls.querySelectorAll(".choice-button").forEach((button) => {
    button.addEventListener("click", () => {
      const option = question.options.find((item) => item.value === button.dataset.value);
      if (option) handleAnswer(question, option);
    });
  });
}

function handleAnswer(question, option) {
  state.answers[question.id] = option.value;
  state.answerLabels[question.id] = {
    label: question.label,
    value: option.text
  };

  if (question.id === "ageRange") {
    const course = getAgeCourse(option.value);
    state.answers.ageCourse = course.value;
    state.answerLabels.ageCourse = {
      label: "진행 코스",
      value: course.label
    };
  }

  addUserMessage(option.text);
  updateSnapshot();
  chatControls.innerHTML = "";

  const acknowledgement = question.ack[option.key];
  showTyping(() => {
    addBotMessage(acknowledgement || "좋아요. 다음 질문으로 넘어갈게요.");
    window.setTimeout(showNextQuestion, 260);
  }, 420);
}

function showPhotoUploadStep() {
  updateProgress();
  showTyping(() => {
    addBotMessage("좋아요. 이제 마지막 단계입니다. 사진은 선택사항이에요. 정면, 45도 측면, 고민 부위 확대 사진을 올리면 더 정밀하게 보고, 사진이 없으면 설문지를 기준으로 결과를 도출합니다.", "Photo Check");
    renderUploadControls();
  });
}

function renderUploadControls() {
  chatControls.innerHTML = `
    <div class="upload-chat-panel">
      <label class="dropzone chat-dropzone" for="skinImages">
        <input id="skinImages" type="file" accept="image/*" multiple />
        <strong>피부 분석용 사진 업로드 선택</strong>
        <span>정확도를 높이려면 정면 얼굴 전체, 45도 측면, 고민 부위 확대 사진을 각각 1장씩 올려주세요. 사진은 저장되지 않습니다.</span>
      </label>
      <div class="photo-guide-grid">
        <span><strong>1</strong> 정면 얼굴 전체 권장</span>
        <span><strong>2</strong> 좌/우 45도 측면 권장</span>
        <span><strong>3</strong> 모공·붉은기·트러블 등 고민 부위 확대 권장</span>
      </div>
      <p class="photo-privacy-note">사진이 없어도 진단할 수 있습니다. 사진이 없을 경우 설문지를 기준으로 결과를 도출합니다. 업로드한 사진은 분석 요청에만 사용되며 서버에 저장되지 않습니다.</p>
      <div class="preview-grid" id="previewGrid"></div>
      <label class="checkbox-label consent-row">
        <input type="checkbox" id="consentInput" />
        <span>이 결과가 의료 진단이 아닌 화장품 추천용 참고 정보이며, 사진은 저장되지 않는다는 안내를 확인했습니다.</span>
      </label>
      <div class="modal-actions chat-action-row">
        <button class="primary-button" type="button" id="submitButton" disabled>AI 분석 시작</button>
      </div>
    </div>
  `;

  const input = document.getElementById("skinImages");
  const submitButton = document.getElementById("submitButton");
  const consentInput = document.getElementById("consentInput");

  input.addEventListener("change", handleImageChange);
  consentInput.addEventListener("change", updateSubmitState);
  submitButton.addEventListener("click", requestDiagnosis);

  function updateSubmitState() {
    submitButton.disabled = !consentInput.checked;
  }

  async function handleImageChange(event) {
    const files = Array.from(event.target.files || []).slice(0, 3);
    const previewGrid = document.getElementById("previewGrid");
    state.compressedImages = [];
    previewGrid.innerHTML = "";

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const imageUrl = await compressImage(file, 1200, 0.82);
      state.compressedImages.push(imageUrl);

      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = `${file.name} 미리보기`;
      previewGrid.appendChild(image);
    }

    state.answerLabels.photos = {
      label: "사진",
      value: state.compressedImages.length ? `${state.compressedImages.length}장 업로드` : "미업로드"
    };
    updateSnapshot();
    updateSubmitState();
    if (state.compressedImages.length && state.compressedImages.length < 3) {
      addBotMessage(`현재 ${state.compressedImages.length}장 업로드됐어요. 3장을 모두 올리면 더 정밀하지만, 현재 사진만으로도 분석을 진행할 수 있습니다.`);
    }
  }
}

async function requestDiagnosis() {
  const consentInput = document.getElementById("consentInput");

  if (!consentInput.checked) {
    addBotMessage("의료 진단이 아닌 화장품 추천용 참고 정보라는 안내에 동의해 주세요.");
    return;
  }

  const images = state.compressedImages;
  analysisInFlight = true;
  chatControls.innerHTML = "";
  addUserMessage(images.length ? `사진 ${images.length}장으로 분석해줘` : "사진 없이 설문지만으로 분석해줘");
  addBotMessage(getPhotoAnalysisMessage(images.length));
  renderLoadingMessage();
  updateProgress(true);

  try {
    const response = await fetch("/api/skin-diagnosis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: state.answers, images })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "분석 요청에 실패했습니다.");
    }

    state.complete = true;
    removeLoadingMessage();
    addBotMessage("분석이 완료됐어요. 아래 결과는 온라인 1차 뷰티 상담 기준의 AI 리포트입니다.");
    renderResult(data.diagnosis, data.mode, data.note, data.recommendations);
    renderBroadcastAlertControls(data.recommendations);
    refreshApiStatus();
  } catch (error) {
    removeLoadingMessage();
    renderError(error.message || "알 수 없는 오류가 발생했습니다.");
  } finally {
    analysisInFlight = false;
  }
}

function renderLoadingMessage() {
  const row = document.createElement("div");
  row.className = "chat-row is-bot loading-message-row";
  row.innerHTML = `
    <div class="loading-card chat-loading-card">
      <span class="loader" aria-hidden="true"></span>
      <div>
        <p class="eyebrow">Analyzing</p>
        <strong>OpenAI가 사진과 답변을 함께 보고 있어요</strong>
        <p>피부 타입, 우선 고민, 루틴 방향을 JSON 결과로 정리하는 중입니다.</p>
      </div>
    </div>
  `;
  chatThread.appendChild(row);
  scrollToBottom();
}

function removeLoadingMessage() {
  document.querySelector(".loading-message-row")?.remove();
}

function renderResult(diagnosis, mode, note, recommendations) {
  const row = document.createElement("div");
  row.className = "chat-row is-bot result-message-row";
  row.innerHTML = `
    <div class="result-stack chat-result-stack">
      <article class="result-card accent">
        <p class="eyebrow">${mode === "openai" ? "OpenAI Result" : "Demo Result"}</p>
        <h3>${escapeHtml(diagnosis.profileTitle)}</h3>
        <p>${escapeHtml(diagnosis.skinType)} · 신뢰도 ${escapeHtml(diagnosis.confidence)}</p>
        <div class="pill-row">
          ${diagnosis.priorityConcerns.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("")}
        </div>
      </article>

      ${note ? `<article class="result-card"><p>${escapeHtml(note)}</p></article>` : ""}
      ${renderSkinMbtiCard(diagnosis.skinMbtiType)}
      ${renderObnfCard(diagnosis.obnfType)}
      ${renderListCard("Visible Signals", "사진/설문에서 본 신호", diagnosis.visibleSignals)}
      ${renderRoutineCard(diagnosis.routine)}
      ${renderListCard("Ingredient Focus", "추천 성분 방향", diagnosis.ingredientFocus)}
      ${renderListCard("Caution", "피하거나 조심할 점", diagnosis.avoidOrCaution)}
      ${renderListCard("Product Direction", "제품 추천 방향", diagnosis.productDirection)}
      ${renderRecommendationSection(recommendations)}
      ${renderBroadcastAlertCard(recommendations)}

      <article class="result-card">
        <p class="eyebrow">Offline CTA</p>
        <h3>매장 방문으로 더 정밀하게</h3>
        <p>${escapeHtml(diagnosis.storeVisitReason)}</p>
      </article>

      <article class="result-card">
        <p class="eyebrow">Notice</p>
        <p>${escapeHtml(diagnosis.disclaimer)}</p>
      </article>
    </div>
  `;
  chatThread.appendChild(row);
  scrollToBottom();
}

function renderSkinMbtiCard(skinMbtiType) {
  if (!skinMbtiType?.code) {
    return "";
  }

  return `
    <article class="result-card skin-mbti-card">
      <p class="eyebrow">Skincare Type</p>
      <div class="skin-mbti-head">
        <div>
          <h3>${escapeHtml(skinMbtiType.title || `${skinMbtiType.code} 타입`)}</h3>
          <p>${escapeHtml(skinMbtiType.summary || "")}</p>
        </div>
        <strong class="skin-mbti-code">${escapeHtml(skinMbtiType.code)}</strong>
      </div>
      <p class="standard-source-note">${escapeHtml(skinMbtiType.recommendedSolution || "")}</p>
      ${Array.isArray(skinMbtiType.matchedSignals) && skinMbtiType.matchedSignals.length ? `
        <div class="mini-tag-row">
          ${skinMbtiType.matchedSignals.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      ` : ""}
    </article>
  `;
}

function renderObnfCard(obnfType) {
  if (!obnfType?.code) {
    return "";
  }

  const axes = Array.isArray(obnfType.axes) ? obnfType.axes : [];
  return `
    <article class="result-card obnf-card">
      <p class="eyebrow">OBNF Skin Code</p>
      <div class="obnf-card-head">
        <div>
          <h3>${escapeHtml(obnfType.title || `${obnfType.code} 타입`)}</h3>
          <p>${escapeHtml(obnfType.summary || "")}</p>
        </div>
        <strong class="obnf-code">${escapeHtml(obnfType.code)}</strong>
      </div>
      <p class="standard-source-note">${escapeHtml(obnfType.basis || "설문과 이미지 분석을 함께 반영한 내부 추천 지표입니다.")}</p>
      <div class="obnf-axis-grid">
        ${axes.map((axis) => {
          const score = clampClientScore(axis.score);
          return `
            <section class="obnf-axis">
              <div>
                <strong>${escapeHtml(axis.letter)} · ${escapeHtml(axis.label)}</strong>
                <span>${score}점</span>
              </div>
              <div class="obnf-meter" aria-hidden="true"><i style="width: ${score}%"></i></div>
              <p>${escapeHtml(axis.meaning)}</p>
            </section>
          `;
        }).join("")}
      </div>
      ${Array.isArray(obnfType.routineFocus) && obnfType.routineFocus.length ? `
        <div class="mini-tag-row">
          ${obnfType.routineFocus.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      ` : ""}
    </article>
  `;
}

function renderRecommendationSection(recommendations) {
  if (!recommendations) {
    return "";
  }

  return `
    <article class="result-card recommendation-report-card">
      <p class="eyebrow">Product Match</p>
      <h3>전성분 DB 기준 맞춤 추천</h3>
      <p>${escapeHtml(recommendations.summary)}</p>
      <p class="standard-source-note">이 결과는 대한화장품협회 성분명 표준화 기준을 참고해 전성분명을 매칭한 뒤, CosIng 기능 데이터와 내부 추천 룰을 함께 반영해 제공됩니다.</p>
      <div class="profile-note-list">
        ${(recommendations.profile?.notes || []).map((note) => `<span>${escapeHtml(note)}</span>`).join("")}
      </div>
    </article>

    ${renderRoutineRecommendations(recommendations.routine || [])}
    ${renderPriceTierRecommendations(recommendations.priceTiers || [])}
    ${renderAvoidProducts(recommendations.avoidProducts || [])}
  `;
}

function renderRoutineRecommendations(routine) {
  if (!routine.length) {
    return `
      <article class="result-card">
        <p class="eyebrow">Routine Match</p>
        <h3>추천 루틴 후보 부족</h3>
        <p>현재 전성분 DB에 루틴을 구성할 만큼의 상품이 충분하지 않습니다. 브랜드별 상품 데이터가 쌓이면 자동으로 더 정교해집니다.</p>
      </article>
    `;
  }

  return `
    <article class="result-card">
      <p class="eyebrow">Routine Match</p>
      <h3>바르는 순서별 추천</h3>
      <div class="routine-rec-list">
        ${routine.map((slot) => `
          <section class="routine-rec-slot">
            <div class="routine-rec-head">
              <strong>${escapeHtml(slot.title)}</strong>
              <p>${escapeHtml(slot.instruction)}</p>
            </div>
            <div class="product-rec-grid">
              ${slot.products.map(renderProductRecommendation).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    </article>
  `;
}

function renderPriceTierRecommendations(priceTiers) {
  return `
    <article class="result-card">
      <p class="eyebrow">Choice Guide</p>
      <h3>내 피부에 맞는 선택지</h3>
      <div class="price-tier-grid">
        ${priceTiers.map((tier) => `
          <section class="price-tier-card">
            <div>
              <strong>${escapeHtml(tier.label)}</strong>
              <p>${escapeHtml(tier.description)}</p>
            </div>
            ${tier.products.length
              ? tier.products.map(renderCompactProduct).join("")
              : `<p class="muted-copy">현재 선택지에 맞는 후보가 부족합니다.</p>`}
          </section>
        `).join("")}
      </div>
    </article>
  `;
}

function renderBroadcastAlertCard(recommendations) {
  if (!recommendations) {
    return "";
  }

  return `
    <article class="result-card broadcast-alert-card">
      <p class="eyebrow">Broadcast Alert</p>
      <h3>방송/프로모션 알림으로 이어가기</h3>
      <p>지금은 추천 제품과 가격을 먼저 보여드리고, 나중에 방송 스케줄이나 특가 정보가 연결되면 이 피부 결과에 맞는 상품이 방송할 때 알림을 받을 수 있게 마무리합니다.</p>
    </article>
  `;
}

function renderBroadcastAlertControls(recommendations) {
  const matchedCount = Number(recommendations?.totalProductsScored || 0);
  chatControls.innerHTML = `
    <div class="control-intro">
      <strong>마지막 안내</strong>
      <p>추천 제품 가격까지 확인했어요. 방송/프로모션 일정이 붙으면 알림을 받아볼까요?</p>
    </div>
    <div class="modal-actions chat-action-row">
      <button class="primary-button" type="button" id="enableBroadcastAlertButton">방송 알림 설정하기</button>
      <button class="secondary-button" type="button" id="skipBroadcastAlertButton">나중에 할게요</button>
    </div>
  `;

  document.getElementById("enableBroadcastAlertButton").addEventListener("click", () => {
    localStorage.setItem("skinBroadcastAlertPreference", JSON.stringify({
      enabled: true,
      matchedCount,
      savedAt: new Date().toISOString()
    }));
    state.answerLabels.broadcastAlert = {
      label: "방송 알림",
      value: "설정함"
    };
    updateSnapshot();
    chatControls.innerHTML = "";
    addUserMessage("방송 알림 설정할게요");
    showTyping(() => {
      addBotMessage("알림 설정까지 완료된 흐름으로 저장했어요. 지금 로컬 테스트에서는 실제 발송 전 단계이고, 나중에 회원 정보/카카오/문자/방송 스케줄 DB가 붙으면 추천 상품 방송 시점에 알려드릴 수 있습니다.");
    }, 360);
  });

  document.getElementById("skipBroadcastAlertButton").addEventListener("click", () => {
    localStorage.setItem("skinBroadcastAlertPreference", JSON.stringify({
      enabled: false,
      matchedCount,
      savedAt: new Date().toISOString()
    }));
    state.answerLabels.broadcastAlert = {
      label: "방송 알림",
      value: "나중에"
    };
    updateSnapshot();
    chatControls.innerHTML = "";
    addUserMessage("나중에 할게요");
    showTyping(() => {
      addBotMessage("좋아요. 오늘은 피부 분석과 제품 추천까지만 마무리할게요. 방송 스케줄 기능이 붙으면 이 단계에서 다시 알림 설정으로 연결하면 됩니다.");
    }, 360);
  });
}

function renderAvoidProducts(products) {
  if (!products.length) {
    return "";
  }

  return `
    <article class="result-card caution-products-card">
      <p class="eyebrow">Caution Match</p>
      <h3>이번 피부상태에서는 조심할 후보</h3>
      <p>완전히 금지라는 뜻은 아니고, 현재 민감도/목표 기준에서는 사용 빈도나 순서를 조절하는 편이 안전한 제품입니다.</p>
      <div class="compact-product-list">
        ${products.map(renderCompactProduct).join("")}
      </div>
    </article>
  `;
}

function renderProductRecommendation(product) {
  return `
    <article class="product-rec-card">
      <div class="product-rec-meta">
        <span>${escapeHtml(product.brand)}</span>
        <span>${formatPrice(product.price)} · ${escapeHtml(product.volume || "용량 미확인")}</span>
      </div>
      <h4>${escapeHtml(product.productName)}</h4>
      <p class="score-line">추천 점수 ${escapeHtml(product.score)}점 · 리스크 ${escapeHtml(product.riskScore)}점</p>
      <div class="mini-tag-row">
        ${product.keyIngredients.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      <ul>
        ${product.reasons.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        ${product.cautions.map((item) => `<li class="caution-text">${escapeHtml(item)}</li>`).join("")}
      </ul>
    </article>
  `;
}

function renderCompactProduct(product) {
  return `
    <article class="compact-product-card">
      <strong>${escapeHtml(product.brand)} · ${escapeHtml(product.productName)}</strong>
      <p>${formatPrice(product.price)} / ${escapeHtml(product.volume || "용량 미확인")} / 점수 ${escapeHtml(product.score)}</p>
      <p>${[...product.reasons, ...product.cautions].slice(0, 2).map(escapeHtml).join(" · ")}</p>
    </article>
  `;
}

function formatPrice(price) {
  const number = Number(price || 0);
  return number ? `${number.toLocaleString("ko-KR")}원` : "가격 미확인";
}

function renderListCard(label, title, items) {
  return `
    <article class="result-card">
      <p class="eyebrow">${label}</p>
      <h3>${title}</h3>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </article>
  `;
}

function renderRoutineCard(routine) {
  return `
    <article class="result-card">
      <p class="eyebrow">Routine</p>
      <h3>권장 루틴</h3>
      <ul>
        <li><strong>아침</strong>: ${routine.morning.map(escapeHtml).join(" → ")}</li>
        <li><strong>저녁</strong>: ${routine.evening.map(escapeHtml).join(" → ")}</li>
        <li><strong>주간</strong>: ${routine.weekly.map(escapeHtml).join(" / ")}</li>
      </ul>
    </article>
  `;
}

function renderError(message) {
  const row = document.createElement("div");
  row.className = "chat-row is-bot";
  row.innerHTML = `
    <article class="result-card error-card chat-result-stack">
      <p class="eyebrow">Error</p>
      <h3>분석을 완료하지 못했습니다</h3>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
  chatThread.appendChild(row);
  scrollToBottom();
}

function updateSnapshot() {
  const values = Object.values(state.answerLabels);
  snapshotList.innerHTML = values.length
    ? values.map((item) => `
      <div class="snapshot-item">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
      </div>
    `).join("")
    : `<p class="snapshot-empty">아직 답변이 없습니다.</p>`;
}

function updateProgress(forceComplete = false) {
  const total = surveyQuestionCount + 1;
  const current = forceComplete
    ? total
    : Math.min(Math.max(state.stepIndex + 1, 0), total);
  const percent = Math.round((current / total) * 100);

  progressLabel.textContent = `${current} / ${total}`;
  progressPercent.textContent = `${percent}%`;
}

function addBotMessage(message, meta = "THE BEAUTY AI") {
  addMessage("is-bot", "bot-bubble", meta, message);
}

function addUserMessage(message) {
  addMessage("is-user", "user-bubble", "YOU", message);
}

function addMessage(rowClass, bubbleClass, meta, message) {
  const row = document.createElement("div");
  row.className = `chat-row ${rowClass}`;
  row.innerHTML = `
    <div class="${bubbleClass}">
      <div class="chat-meta">${escapeHtml(meta)}</div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
  chatThread.appendChild(row);
  scrollToBottom();
}

function showTyping(callback, delay = 520) {
  typingIndicator.hidden = false;
  scrollToBottom();
  window.setTimeout(() => {
    typingIndicator.hidden = true;
    callback();
  }, delay);
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatThread.scrollTop = chatThread.scrollHeight;
  });
}

function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function clampClientScore(value) {
  const number = Number(value || 0);
  return Math.max(0, Math.min(100, Math.round(number)));
}

function getPhotoAnalysisMessage(imageCount) {
  if (!imageCount) {
    return "사진이 없어 설문지를 기준으로 결과를 도출합니다. 사진은 저장되지 않습니다.";
  }
  if (imageCount < 3) {
    return `업로드한 사진 ${imageCount}장을 참고하고, 부족한 부분은 설문지를 기준으로 보정해 결과를 도출합니다. 사진은 저장되지 않습니다.`;
  }
  return "업로드한 사진 3장을 함께 참고해 결과를 도출합니다. 사진은 저장되지 않습니다.";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
