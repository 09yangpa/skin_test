const skinQuestions = [
  {
    id: "gender",
    label: "기본 정보",
    prompt: "먼저 추천 루틴의 방향을 잡기 위해 성별을 여쭤볼게요. 어떤 쪽에 가장 가까우세요?",
    ack: {
      male: "좋아요. 너무 복잡하지 않으면서 효과가 보이는 루틴도 함께 고려할게요.",
      female: "좋아요. 피부 고민별로 단계 조합을 조금 더 섬세하게 볼게요.",
      other: "좋아요. 성별 고정값보다 루틴 성향과 피부 상태를 중심으로 보겠습니다.",
      skip: "괜찮아요. 답변해주신 피부 상태 중심으로 추천하겠습니다."
    },
    options: [
      { value: "남성", text: "남성", key: "male" },
      { value: "여성", text: "여성", key: "female" },
      { value: "기타/직접 선택 안 함", text: "기타 / 선택 안 함", key: "other" },
      { value: "응답하지 않음", text: "넘어갈게요", key: "skip" }
    ]
  },
  {
    id: "ageRange",
    label: "나이대",
    prompt: "나이대는 어떻게 되세요? 피부 고민의 우선순위를 잡는 데 도움이 됩니다.",
    ack: {
      teen: "피지, 트러블, 자극 부담을 중심으로 볼게요.",
      twenties: "피지/트러블과 수분 밸런스를 같이 보겠습니다.",
      thirties: "수분, 장벽, 초기 탄력 고민까지 함께 보겠습니다.",
      forties: "장벽, 탄력, 톤 균일감을 함께 반영하겠습니다.",
      fifties: "보습 밀도와 탄력 케어 비중을 높여서 볼게요."
    },
    options: [
      { value: "10대", text: "10대", key: "teen" },
      { value: "20대", text: "20대", key: "twenties" },
      { value: "30대", text: "30대", key: "thirties" },
      { value: "40대", text: "40대", key: "forties" },
      { value: "50대 이상", text: "50대 이상", key: "fifties" }
    ]
  },
  {
    id: "routineStyle",
    label: "루틴 성향",
    prompt: "평소 스킨케어는 어떤 스타일이 가장 편하세요?",
    ack: {
      allinone: "올인원/단순 루틴 중심으로 제품 수를 줄여볼게요.",
      simple: "핵심 2~3단계 안에서 효율적인 조합을 찾겠습니다.",
      balanced: "너무 많지도 적지도 않은 기본 루틴으로 보겠습니다.",
      layered: "단계별로 다양하게 시도할 수 있는 조합도 열어둘게요."
    },
    options: [
      { value: "올인원처럼 한 번에 끝내고 싶다", text: "올인원이 좋아요", key: "allinone" },
      { value: "2~3단계 정도면 좋다", text: "간단한 2~3단계", key: "simple" },
      { value: "기본 루틴은 괜찮다", text: "기본 루틴 OK", key: "balanced" },
      { value: "여러 단계도 시도해보고 싶다", text: "여러 단계도 좋아요", key: "layered" }
    ]
  },
  {
    id: "routineTime",
    label: "관리 시간",
    prompt: "아침이나 저녁에 스킨케어에 쓸 수 있는 시간은 어느 정도인가요?",
    ack: {
      one: "정말 빠른 루틴으로 압축해볼게요.",
      three: "3분 안에 끝나는 현실적인 루틴으로 보겠습니다.",
      five: "핵심 제품을 나눠 바르는 루틴도 가능하겠어요.",
      ten: "집중 케어 제품까지 포함해볼 수 있겠습니다."
    },
    options: [
      { value: "1분 이하", text: "1분 이하", key: "one" },
      { value: "3분 정도", text: "3분 정도", key: "three" },
      { value: "5분 정도", text: "5분 정도", key: "five" },
      { value: "10분 이상도 가능", text: "10분 이상 가능", key: "ten" }
    ]
  },
  {
    id: "afterCleanse",
    label: "세안 후 느낌",
    prompt: "세안하고 30분 정도 지나면 피부가 어떤 느낌에 가장 가까우세요?",
    ack: {
      tight: "속당김 신호를 우선 체크해볼게요.",
      stable: "큰 변화가 없다면 다른 신호를 더 섬세하게 볼게요.",
      tzone: "T존 중심 유분 패턴도 같이 보겠습니다.",
      oily: "전체 유분 밸런스를 주요 포인트로 잡아볼게요."
    },
    options: [
      { value: "많이 당긴다", text: "당기고 건조해요", key: "tight" },
      { value: "큰 변화 없다", text: "큰 변화 없어요", key: "stable" },
      { value: "T존만 번들거린다", text: "T존만 번들거려요", key: "tzone" },
      { value: "전체적으로 번들거린다", text: "전체적으로 번들거려요", key: "oily" }
    ]
  },
  {
    id: "oilTiming",
    label: "유분 올라오는 시간",
    prompt: "오후가 되면 유분감은 언제부터 눈에 띄나요?",
    ack: {
      early: "유분 상승 속도가 빠른 편으로 반영할게요.",
      afternoon: "오후 유분 패턴으로 기록해둘게요.",
      evening: "늦게 올라오는 정도면 과한 피지 조절은 피하는 쪽이 좋겠어요.",
      none: "유분보다 수분/장벽 신호를 더 보겠습니다."
    },
    options: [
      { value: "오전부터", text: "오전부터요", key: "early" },
      { value: "점심 이후", text: "점심 이후요", key: "afternoon" },
      { value: "저녁쯤", text: "저녁쯤이에요", key: "evening" },
      { value: "거의 없다", text: "거의 없어요", key: "none" }
    ]
  },
  {
    id: "concern",
    label: "주요 고민",
    prompt: "지금 가장 신경 쓰이는 피부 고민은 무엇인가요?",
    ack: {
      dry: "보습 지속력과 장벽 쪽 우선순위를 높이겠습니다.",
      trouble: "진정과 흔적 케어를 같이 보겠습니다.",
      red: "민감도와 붉은기 관리가 중요해 보이네요.",
      pore: "모공/피지 밸런스 중심으로 살펴볼게요.",
      tone: "톤 균일감과 피부결을 같이 체크하겠습니다."
    },
    options: [
      { value: "수분 부족과 속당김", text: "수분 부족 / 속당김", key: "dry" },
      { value: "트러블과 자국", text: "트러블 / 자국", key: "trouble" },
      { value: "붉은기와 예민함", text: "붉은기 / 예민함", key: "red" },
      { value: "모공과 피지", text: "모공 / 피지", key: "pore" },
      { value: "칙칙함과 톤 불균형", text: "칙칙함 / 톤", key: "tone" }
    ]
  },
  {
    id: "sensitivity",
    label: "민감도",
    prompt: "새 화장품을 쓰면 따갑거나 붉어지는 일이 얼마나 자주 있나요?",
    ack: {
      high: "저자극 기준을 우선 적용하겠습니다.",
      medium: "효과감과 안정성의 균형이 중요하겠어요.",
      low: "제품 적응력은 비교적 무난한 편으로 보겠습니다."
    },
    options: [
      { value: "높음", text: "자주 있어요", key: "high" },
      { value: "보통", text: "가끔 있어요", key: "medium" },
      { value: "낮음", text: "거의 없어요", key: "low" }
    ]
  },
  {
    id: "breakoutFrequency",
    label: "트러블 빈도",
    prompt: "트러블은 어느 정도 주기로 올라오나요?",
    ack: {
      often: "트러블 부담을 줄이는 루틴으로 좁혀볼게요.",
      cycle: "컨디션/주기성 영향을 함께 고려하겠습니다.",
      rare: "트러블보다 다른 고민을 우선하겠습니다."
    },
    options: [
      { value: "자주 올라온다", text: "자주 올라와요", key: "often" },
      { value: "컨디션에 따라", text: "컨디션 따라 달라요", key: "cycle" },
      { value: "거의 없다", text: "거의 없어요", key: "rare" }
    ]
  },
  {
    id: "texture",
    label: "피부결",
    prompt: "피부결은 어떤 쪽이 더 고민인가요?",
    ack: {
      flaky: "각질과 보습 유지력을 같이 보겠습니다.",
      rough: "결 정돈과 자극 최소화가 같이 필요해 보여요.",
      smooth: "피부결보다는 다른 고민에 우선순위를 두겠습니다."
    },
    options: [
      { value: "각질이 잘 뜬다", text: "각질이 잘 떠요", key: "flaky" },
      { value: "오돌토돌하고 거칠다", text: "오돌토돌 / 거칠어요", key: "rough" },
      { value: "크게 불편하지 않다", text: "크게 불편하지 않아요", key: "smooth" }
    ]
  },
  {
    id: "shavingMakeupIrritation",
    label: "자극 요인",
    prompt: "면도나 메이크업처럼 피부에 반복적으로 자극이 되는 루틴이 있나요?",
    ack: {
      shaving: "면도 후 진정과 장벽 회복을 더 중요하게 보겠습니다.",
      makeup: "메이크업 전후 밀착과 클렌징 부담을 함께 보겠습니다.",
      both: "면도/메이크업 자극을 모두 고려해 진정 루틴을 강화하겠습니다.",
      none: "외부 루틴 자극은 낮게 반영하겠습니다."
    },
    options: [
      { value: "면도 자극이 있다", text: "면도 자극", key: "shaving" },
      { value: "메이크업 자극이 있다", text: "메이크업 자극", key: "makeup" },
      { value: "둘 다 있다", text: "둘 다 있어요", key: "both" },
      { value: "특별히 없다", text: "특별히 없어요", key: "none" }
    ]
  },
  {
    id: "sunExposure",
    label: "야외 활동",
    prompt: "햇빛이나 외부 환경에 노출되는 시간은 어느 정도인가요?",
    ack: {
      low: "실내 중심이면 기본 보습/진정 루틴을 우선할게요.",
      medium: "일상 자외선과 건조 환경을 함께 고려하겠습니다.",
      high: "야외 노출이 많다면 장벽과 선케어 연결이 중요하겠어요.",
      active: "땀과 마찰까지 고려해 산뜻한 루틴을 우선하겠습니다."
    },
    options: [
      { value: "대부분 실내", text: "대부분 실내", key: "low" },
      { value: "하루 1~2시간 외출", text: "1~2시간 외출", key: "medium" },
      { value: "야외 활동이 많다", text: "야외 활동 많음", key: "high" },
      { value: "운동/땀이 많다", text: "운동/땀 많음", key: "active" }
    ]
  },
  {
    id: "preferredTexture",
    label: "선호 제형",
    prompt: "스킨케어 제형은 어떤 느낌을 선호하세요?",
    ack: {
      light: "가벼운 제형 선호를 반영하겠습니다.",
      rich: "보호막과 보습감을 주는 제형도 열어두겠습니다.",
      watery: "수분감 있는 레이어링 루틴으로 볼게요.",
      noPreference: "제형 제한은 낮게 두겠습니다."
    },
    options: [
      { value: "가벼운 젤/로션", text: "가벼운 젤 / 로션", key: "light" },
      { value: "리치한 크림", text: "리치한 크림", key: "rich" },
      { value: "촉촉한 세럼/앰플", text: "촉촉한 세럼 / 앰플", key: "watery" },
      { value: "특별한 선호 없음", text: "상관없어요", key: "noPreference" }
    ]
  },
  {
    id: "avoidPreference",
    label: "피하고 싶은 것",
    prompt: "피하고 싶은 제품 특징이 있나요?",
    ack: {
      fragrance: "향 부담이 적은 제품을 우선하겠습니다.",
      heavy: "무거운 마무리감은 피해서 볼게요.",
      sticky: "끈적임 적은 사용감을 우선하겠습니다.",
      none: "제외 조건 없이 폭넓게 추천할 수 있겠어요."
    },
    options: [
      { value: "강한 향", text: "강한 향", key: "fragrance" },
      { value: "무거운 크림", text: "무거운 크림", key: "heavy" },
      { value: "끈적임", text: "끈적임", key: "sticky" },
      { value: "없음", text: "딱히 없어요", key: "none" }
    ]
  },
  {
    id: "goal",
    label: "원하는 결과",
    prompt: "이번 추천에서 가장 기대하는 결과는 무엇인가요?",
    ack: {
      calming: "진정 중심으로 최종 분석을 준비하겠습니다.",
      hydration: "보습 중심으로 최종 분석을 준비하겠습니다.",
      tone: "톤 개선 중심으로 최종 분석을 준비하겠습니다.",
      sebum: "피지 조절 중심으로 최종 분석을 준비하겠습니다."
    },
    options: [
      { value: "진정", text: "진정", key: "calming" },
      { value: "보습", text: "보습", key: "hydration" },
      { value: "톤 개선", text: "톤 개선", key: "tone" },
      { value: "피지 조절", text: "피지 조절", key: "sebum" }
    ]
  }
];

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
  addBotMessage("성별, 나이대, 루틴 성향, 피부 고민까지 조금 더 세밀하게 여쭤볼게요. 가격과 방송 알림은 추천 결과를 본 뒤 마지막에 안내드릴게요.");
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

  const question = skinQuestions[state.stepIndex];
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
  const total = skinQuestions.length + 1;
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
