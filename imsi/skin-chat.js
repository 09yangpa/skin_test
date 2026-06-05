const questionSteps = [
  {
    id: "cleanseAfter30",
    prompt: "세안 후 30분 뒤 피부가 어떤가요?",
    ack: {
      tight_dry: "수분 부족과 장벽 컨디션을 먼저 보겠습니다.",
      balanced: "기본 밸런스형으로 보고 다른 신호를 더 보겠습니다.",
      tzone_oily: "복합성 가능성을 먼저 체크하겠습니다.",
      overall_oily: "유분 조절과 모공 컨디션을 우선 보겠습니다."
    },
    options: [
      { value: "tight_dry", label: "당기고 건조해요" },
      { value: "balanced", label: "큰 변화 없어요" },
      { value: "tzone_oily", label: "T존만 번들거려요" },
      { value: "overall_oily", label: "전체적으로 번들거려요" }
    ]
  },
  {
    id: "oilyZone",
    prompt: "오후가 되면 어느 부위가 가장 먼저 번들거리나요?",
    ack: {
      tzone: "T존 중심 유분 패턴으로 정리하겠습니다.",
      cheeks: "볼과 턱의 컨디션 변화를 함께 보겠습니다.",
      all: "전체 유분형 가능성을 먼저 체크하겠습니다.",
      none: "유분보다는 다른 고민 요인을 더 보겠습니다."
    },
    options: [
      { value: "tzone", label: "이마 / 코" },
      { value: "cheeks", label: "볼 / 턱" },
      { value: "all", label: "얼굴 전체" },
      { value: "none", label: "거의 없어요" }
    ]
  },
  {
    id: "frequentIssue",
    prompt: "가장 자주 생기는 문제는 무엇인가요?",
    ack: {
      dryness: "보습 유지력과 장벽 쪽 우선순위를 높이겠습니다.",
      trouble: "트러블 흔적과 진정 우선순위를 높이겠습니다.",
      redness: "민감성과 붉은기 관리 쪽을 우선 보겠습니다.",
      pores: "모공과 피지 밸런스 쪽을 우선 보겠습니다.",
      tone: "톤 균일감과 피부결 정리를 함께 보겠습니다."
    },
    options: [
      { value: "dryness", label: "건조 / 각질" },
      { value: "trouble", label: "트러블 / 자국" },
      { value: "redness", label: "붉은기 / 가려움" },
      { value: "pores", label: "모공 / 피지" },
      { value: "tone", label: "칙칙함 / 톤" }
    ]
  },
  {
    id: "rednessItch",
    prompt: "붉은기나 가려움이 자주 있나요?",
    ack: {
      often: "민감도 우선순위를 높여서 추천하겠습니다.",
      sometimes: "민감도는 보통 수준으로 반영하겠습니다.",
      rarely: "민감성보다 다른 고민을 먼저 보겠습니다."
    },
    options: [
      { value: "often", label: "자주 있어요" },
      { value: "sometimes", label: "가끔 있어요" },
      { value: "rarely", label: "거의 없어요" }
    ]
  },
  {
    id: "reactionHistory",
    prompt: "새로운 화장품을 쓰면 뒤집힌 경험이 있나요?",
    ack: {
      yes_strong: "신제품 적응력이 낮은 편으로 보고 저자극 기준을 우선 적용하겠습니다.",
      sometimes: "성분 반응 이력을 보통 수준으로 반영하겠습니다.",
      no: "새 제품 적응은 비교적 무난한 편으로 보겠습니다."
    },
    options: [
      { value: "yes_strong", label: "자주 뒤집혀요" },
      { value: "sometimes", label: "가끔 있어요" },
      { value: "no", label: "거의 없어요" }
    ]
  },
  {
    id: "favoriteRoutine",
    prompt: "현재 쓰는 제품 중 만족하는 제품이 있나요?",
    ack: {
      hydration: "보습 친화적인 제형 선호로 반영하겠습니다.",
      calming: "진정 중심 루틴 선호로 반영하겠습니다.",
      light: "산뜻한 사용감 선호로 반영하겠습니다.",
      none: "선호 제형은 다른 응답과 사진으로 보완하겠습니다."
    },
    options: [
      { value: "hydration", label: "보습크림 / 수분세럼이 잘 맞아요" },
      { value: "calming", label: "진정 세럼 / 크림이 잘 맞아요" },
      { value: "light", label: "가벼운 로션 / 젤이 잘 맞아요" },
      { value: "none", label: "딱히 떠오르는 건 없어요" }
    ]
  },
  {
    id: "avoidPreference",
    prompt: "피하고 싶은 제형이나 성분이 있나요?",
    ack: {
      heavy: "가벼운 제형 우선으로 추천하겠습니다.",
      sticky: "끈적임 적은 루틴 위주로 좁히겠습니다.",
      fragrance: "향이 강하지 않은 제품을 우선 보겠습니다.",
      none: "제형 제한은 적은 편으로 보겠습니다."
    },
    options: [
      { value: "heavy", label: "무거운 크림은 싫어요" },
      { value: "sticky", label: "끈적이는 제형은 싫어요" },
      { value: "fragrance", label: "향이 강한 제품은 싫어요" },
      { value: "none", label: "딱히 피하는 건 없어요" }
    ]
  },
  {
    id: "makeupFrequency",
    prompt: "메이크업은 주 몇 회 정도 하나요?",
    ack: {
      rarely: "스킨케어 단독 사용감을 우선 보겠습니다.",
      few: "데일리와 메이크업 병행 균형으로 보겠습니다.",
      regular: "지속력과 밀림 여부를 함께 보겠습니다.",
      daily: "메이크업 친화 제형을 우선 보겠습니다."
    },
    options: [
      { value: "rarely", label: "거의 안 해요" },
      { value: "few", label: "주 1~2회" },
      { value: "regular", label: "주 3~4회" },
      { value: "daily", label: "주 5회 이상" }
    ]
  },
  {
    id: "desiredOutcome",
    prompt: "원하는 결과는 어느 쪽에 가장 가까운가요?",
    ack: {
      calming: "진정 중심으로 결과를 정리하겠습니다.",
      hydration: "보습 중심으로 결과를 정리하겠습니다.",
      brightening: "톤 개선 중심으로 결과를 정리하겠습니다.",
      sebum: "피지 조절 중심으로 결과를 정리하겠습니다."
    },
    options: [
      { value: "calming", label: "진정" },
      { value: "hydration", label: "보습" },
      { value: "brightening", label: "톤 개선" },
      { value: "sebum", label: "피지 조절" }
    ]
  },
  {
    id: "subscriptionPreference",
    prompt: "월 구독을 한다면 어떤 구성이 좋나요?",
    ack: {
      sample: "여러 제품을 가볍게 테스트하는 구성으로 이해하겠습니다.",
      full: "주력 제품 1~2개를 확실히 받는 구성을 우선 보겠습니다.",
      mixed: "정품과 샘플을 섞는 혼합형 구성을 우선 보겠습니다."
    },
    options: [
      { value: "sample", label: "샘플 위주" },
      { value: "full", label: "정품 1~2개" },
      { value: "mixed", label: "혼합형" }
    ]
  },
  {
    id: "photos",
    type: "upload",
    prompt: "마지막으로 얼굴 사진 1~3장을 올려주세요. 정면 1장과 측면 1장 정도면 온라인 1차 분석에 충분합니다."
  }
];

const productCatalog = [
  {
    id: "clabiane-gel",
    name: "클라비안 하이드레이션 젤",
    brand: "CLABIANE",
    description: "속당김이 심한 날에도 가볍게 수분을 채워주는 젤 타입 보습.",
    tags: ["dry", "combo", "oily", "pores", "hydration", "light", "sample", "mixed", "low", "medium"],
    image: "./assets/skin-care/clabiane-hydration-gel.png"
  },
  {
    id: "ditology-serum",
    name: "디톨로지 수딩 세럼",
    brand: "DITOLOGY",
    description: "붉은기와 예민함을 빠르게 진정시키는 데 초점을 둔 데일리 세럼.",
    tags: ["trouble", "redness", "high", "medium", "combo", "dry", "calming", "fragrance_free", "light", "mixed", "sample"],
    image: "./assets/skin-care/ditology-soothing-serum.png"
  },
  {
    id: "hucord-ampoule",
    name: "휴코드 앰플",
    brand: "HUCORD",
    description: "수분 밀도와 윤기를 함께 챙기고 싶은 피부에 맞는 앰플.",
    tags: ["dry", "tone", "hydration", "brightening", "medium", "mixed", "full", "regular_makeup"],
    image: "./assets/skin-care/hucord-ampoule.png"
  },
  {
    id: "lapeauan-kit",
    name: "라포앤 스타터 키트",
    brand: "LAPEAUAN",
    description: "민감성 고객이 가볍게 적응할 수 있도록 짜인 입문 구독 구성.",
    tags: ["high", "combo", "redness", "calming", "sample", "mixed", "fragrance_free", "light"],
    image: "./assets/skin-care/lapeauan-kit.png"
  },
  {
    id: "omorovicza-mist",
    name: "오모로비짜 퀸 미스트",
    brand: "OMOROVICZA",
    description: "메이크업 전후로 톤과 광채를 정돈하기 좋은 프렙 미스트.",
    tags: ["tone", "hydration", "brightening", "light", "sample", "mixed", "light_makeup", "regular_makeup", "daily_makeup", "low"],
    image: "./assets/skin-care/omorovicza-queen-mist.png"
  },
  {
    id: "soopjak-cream",
    name: "숲작 프로폴리스 크림",
    brand: "SOOPJAK",
    description: "민감하고 푸석한 피부를 보호막처럼 감싸는 크림 타입 보습.",
    tags: ["dry", "high", "trouble", "hydration", "calming", "full", "mixed", "rich"],
    image: "./assets/skin-care/soopjak-propolis-cream.jpg"
  }
];

const state = {
  stepIndex: -1,
  answers: {},
  answerLabels: {},
  uploadedFiles: [],
  previewUrls: [],
  analysisStarted: false,
  complete: false
};

const chatThread = document.getElementById("chatThread");
const chatControls = document.getElementById("chatControls");
const progressText = document.getElementById("chatProgressText");
const progressFill = document.getElementById("chatProgressFill");
const snapshotStatus = document.getElementById("snapshotStatus");
const snapshotChips = document.getElementById("snapshotChips");

applyEmbeddedMode();
bootConversation();

function applyEmbeddedMode() {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get("embed") === "1") {
    document.body.classList.add("skin-chat-embedded");
  }
}

function bootConversation() {
  addBotBubble("THE BEAUTY AI", "안녕하세요. 더뷰티 AI 스킨 컨시어지입니다.");
  addBotBubble("THE BEAUTY AI", "이번 버전은 설문을 더 세분화해서 오프라인 상담 로직에 가깝게 맞춰봤습니다. 설문과 사진을 바탕으로 맞춤 루틴과 구독 구성을 제안해드릴게요.");
  moveToNextStep();
}

function moveToNextStep() {
  state.stepIndex += 1;
  updateProgress();

  const currentStep = questionSteps[state.stepIndex];
  if (!currentStep) {
    return;
  }

  addBotBubble("THE BEAUTY AI", currentStep.prompt);

  if (currentStep.type === "upload") {
    renderUploadControls();
    return;
  }

  renderOptionControls(currentStep);
}

function renderOptionControls(step) {
  chatControls.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "control-copy";
  wrapper.innerHTML = `
    <strong>빠르게 선택해 주세요</strong>
    <p>입력 대신 버튼 선택으로 흐름을 유지하는 방식입니다.</p>
  `;

  const choiceGrid = document.createElement("div");
  choiceGrid.className = "choice-grid";

  step.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.textContent = option.label;
    button.addEventListener("click", () => handleOptionChoice(step, option));
    choiceGrid.appendChild(button);
  });

  chatControls.append(wrapper, choiceGrid);
}

function renderUploadControls() {
  chatControls.innerHTML = `
    <div class="upload-panel">
      <div class="control-copy">
        <strong>사진 업로드 단계</strong>
        <p>프로토타입 기준으로 브라우저에서 미리보기만 생성합니다. 실제 서비스에서는 서버 저장/삭제 정책이 함께 필요합니다.</p>
      </div>
      <label class="upload-dropzone" for="skinPhotoInput">
        <span class="upload-counter" id="uploadCounter">0 / 3 images</span>
        <strong>정면 또는 측면 얼굴 사진을 올려주세요</strong>
        <p class="upload-note">필터 없는 사진이 가장 좋고, 최대 3장까지 올릴 수 있습니다.</p>
        <input id="skinPhotoInput" type="file" accept="image/*" multiple />
      </label>
      <div class="upload-preview-grid" id="uploadPreviewGrid"></div>
      <div class="action-row">
        <button type="button" class="upload-action" id="demoModeButton">데모 데이터로 체험</button>
        <button type="button" class="action-button action-button-primary" id="analyzePhotosButton" disabled>사진 분석 시작</button>
      </div>
    </div>
  `;

  const input = document.getElementById("skinPhotoInput");
  const analyzeButton = document.getElementById("analyzePhotosButton");
  const demoButton = document.getElementById("demoModeButton");

  input.addEventListener("change", handleFileChange);
  analyzeButton.addEventListener("click", () => startAnalysis(false));
  demoButton.addEventListener("click", () => startAnalysis(true));
}

function handleOptionChoice(step, option) {
  state.answers[step.id] = option.value;
  state.answerLabels[step.id] = option.label;
  addUserBubble("YOU", option.label);
  refreshSnapshot();

  chatControls.innerHTML = "";
  const acknowledgement = step.ack?.[option.value];
  if (acknowledgement) {
    addBotBubble("THE BEAUTY AI", acknowledgement);
  }

  window.setTimeout(moveToNextStep, 220);
}

function handleFileChange(event) {
  const nextFiles = Array.from(event.target.files || []).slice(0, 3);
  cleanupPreviewUrls();

  state.uploadedFiles = nextFiles;
  state.previewUrls = nextFiles.map((file) => URL.createObjectURL(file));

  const previewGrid = document.getElementById("uploadPreviewGrid");
  const counter = document.getElementById("uploadCounter");
  const analyzeButton = document.getElementById("analyzePhotosButton");

  if (!previewGrid || !counter || !analyzeButton) {
    return;
  }

  counter.textContent = `${nextFiles.length} / 3 images`;
  previewGrid.innerHTML = "";

  state.previewUrls.forEach((url, index) => {
    const figure = document.createElement("figure");
    figure.className = "upload-preview-card";
    figure.innerHTML = `
      <img src="${url}" alt="업로드한 얼굴 사진 미리보기 ${index + 1}" />
      <figcaption>업로드 이미지 ${index + 1}</figcaption>
    `;
    previewGrid.appendChild(figure);
  });

  analyzeButton.disabled = nextFiles.length === 0;
}

function startAnalysis(isDemoMode) {
  if (!isDemoMode && state.uploadedFiles.length === 0) {
    return;
  }

  state.analysisStarted = true;
  state.answers.photos = isDemoMode ? "demo" : "uploaded";
  state.answerLabels.photos = isDemoMode
    ? "데모 데이터 사용"
    : `사진 ${state.uploadedFiles.length}장 업로드 완료`;
  refreshSnapshot();

  addUserBubble("YOU", state.answerLabels.photos);
  addBotBubble(
    "THE BEAUTY AI",
    isDemoMode
      ? "데모 데이터 기준으로 분석 흐름을 재생하겠습니다."
      : "사진을 확인했습니다. 설문 응답과 함께 온라인 1차 분석을 시작할게요."
  );

  renderAnalysisCard();
  chatControls.innerHTML = "";

  const analysisSteps = [
    "유수분 밸런스와 표면 컨디션 정리 중",
    "붉은기, 트러블, 민감 반응 가능성 추정 중",
    "톤 경향과 제품 적합도 매칭 중"
  ];

  const stepNodes = Array.from(document.querySelectorAll(".analysis-step"));
  let activeIndex = 0;

  const interval = window.setInterval(() => {
    stepNodes.forEach((node, index) => {
      node.classList.remove("is-active");
      if (index < activeIndex) {
        node.classList.add("is-done");
      }
    });

    const node = stepNodes[activeIndex];
    if (node) {
      node.classList.add("is-active");
    }

    activeIndex += 1;

    if (activeIndex > analysisSteps.length) {
      window.clearInterval(interval);
      window.setTimeout(() => {
        const result = buildResult();
        renderResult(result);
        state.complete = true;
        updateProgress(true);
      }, 260);
    }
  }, 780);
}

function renderAnalysisCard() {
  const row = document.createElement("div");
  row.className = "chat-row is-bot";
  row.innerHTML = `
    <div class="analysis-card" id="analysisCard">
      <p class="result-label">Analysis in progress</p>
      <h3>온라인 1차 진단을 정리하고 있어요</h3>
      <p class="offer-note">최종 결과는 사진과 설문을 함께 본 가이드형 제안입니다. 의료 진단이 아니라 맞춤 추천을 위한 프리뷰입니다.</p>
      <div class="analysis-step-list">
        <div class="analysis-step">
          <span class="analysis-step-dot" aria-hidden="true"></span>
          <div>
            <p class="analysis-step-label">Step 1</p>
            <strong>유수분 밸런스와 표면 컨디션 정리 중</strong>
          </div>
        </div>
        <div class="analysis-step">
          <span class="analysis-step-dot" aria-hidden="true"></span>
          <div>
            <p class="analysis-step-label">Step 2</p>
            <strong>붉은기, 트러블, 민감 반응 가능성 추정 중</strong>
          </div>
        </div>
        <div class="analysis-step">
          <span class="analysis-step-dot" aria-hidden="true"></span>
          <div>
            <p class="analysis-step-label">Step 3</p>
            <strong>톤 경향과 제품 적합도 매칭 중</strong>
          </div>
        </div>
      </div>
    </div>
  `;
  chatThread.appendChild(row);
  scrollThreadToBottom();
}

function buildResult() {
  const skinType = inferSkinType();
  const concern = inferConcern();
  const sensitivity = inferSensitivity();
  const goal = inferGoal();
  const usagePattern = inferUsagePattern();
  const subscriptionPreference = inferSubscriptionPreference();

  const traitLabels = {
    skinType: {
      dry: "건성 경향",
      oily: "지성 경향",
      combo: "복합성 경향",
      normal: "중성에 가까운 밸런스"
    },
    concern: {
      trouble: "트러블 / 자국 관리",
      dryness: "보습 유지력 강화",
      redness: "붉은기 / 가려움 관리",
      tone: "톤 균일감 정리",
      pores: "모공 / 피지 밸런스"
    },
    sensitivity: {
      high: "민감성 높음",
      medium: "민감성 보통",
      low: "민감 반응 낮음"
    },
    goal: {
      calming: "진정 우선",
      hydration: "보습 우선",
      brightening: "톤 개선 우선",
      sebum: "피지 조절 우선"
    },
    usagePattern: {
      minimal: "거의 노메이크업",
      light_makeup: "주 1~2회 메이크업",
      regular_makeup: "주 3~4회 메이크업",
      daily_makeup: "주 5회 이상 메이크업"
    },
    subscriptionPreference: {
      sample: "샘플 위주",
      full: "정품 1~2개 위주",
      mixed: "혼합형 구성"
    }
  };

  const recommendations = getRecommendations({
    skinType,
    concern,
    sensitivity,
    goal,
    usagePattern,
    subscriptionPreference,
    avoidPreference: state.answers.avoidPreference || "none",
    favoriteRoutine: state.answers.favoriteRoutine || "none"
  });

  const subscriptionNotes = {
    sample: "여러 제품을 가볍게 써보는 샘플 중심 구성이 잘 맞습니다. 반응을 확인한 뒤 다음 회차에서 정품 비중을 높이는 방식이 안전합니다.",
    full: "주력 제품 1~2개를 확실히 받고 싶은 정품 중심 구성이 잘 맞습니다. 매달 루틴을 크게 바꾸기보다 핵심 품목을 유지하는 방식입니다.",
    mixed: "정품과 샘플을 섞어 실패 확률을 줄이는 혼합 구성이 가장 자연스럽습니다. 현재 테스트 단계에서는 이 방식이 가장 설득력이 큽니다."
  };

  return {
    skinType,
    concern,
    sensitivity,
    goal,
    usagePattern,
    subscriptionPreference,
    title: `${traitLabels.skinType[skinType]} + ${traitLabels.sensitivity[sensitivity]} + ${traitLabels.goal[goal]}`,
    summary: buildSummary({
      skinType,
      concern,
      sensitivity,
      goal,
      avoidPreference: state.answers.avoidPreference || "none"
    }),
    traits: [
      { label: "피부 타입", value: traitLabels.skinType[skinType] },
      { label: "자주 생기는 문제", value: traitLabels.concern[concern] },
      { label: "민감도", value: traitLabels.sensitivity[sensitivity] },
      { label: "원하는 결과", value: traitLabels.goal[goal] },
      { label: "메이크업 빈도", value: traitLabels.usagePattern[usagePattern] },
      { label: "구독 선호", value: traitLabels.subscriptionPreference[subscriptionPreference] }
    ],
    footnote:
      "이번 버전은 설문 항목을 늘려 오프라인 상담 기준에 조금 더 가깝게 맞춘 프리뷰입니다. 사진 결과는 보조 신호로만 사용하고, 오프라인 방문 시 더 정밀하게 보정할 수 있습니다.",
    recommendations,
    subscriptionNote: subscriptionNotes[subscriptionPreference],
    offerTags: [
      traitLabels.goal[goal],
      traitLabels.subscriptionPreference[subscriptionPreference],
      traitLabels.sensitivity[sensitivity]
    ]
  };
}

function renderResult(result) {
  addBotBubble("THE BEAUTY AI", "결과가 준비됐어요. 아래 리포트는 온라인 1차 상담 기준의 맞춤 제안입니다.");

  const resultRow = document.createElement("div");
  resultRow.className = "chat-row is-bot";
  resultRow.innerHTML = `
    <div class="result-card">
      <p class="result-label">Primary match</p>
      <h3>${result.title}</h3>
      <p class="result-summary">${result.summary}</p>
      <div class="result-traits">
        ${result.traits
          .map(
            (trait) => `
              <article class="result-trait">
                <span>${trait.label}</span>
                <strong>${trait.value}</strong>
              </article>
            `
          )
          .join("")}
      </div>
      <p class="result-footnote">${result.footnote}</p>
    </div>
  `;
  chatThread.appendChild(resultRow);

  const recommendationRow = document.createElement("div");
  recommendationRow.className = "chat-row is-bot";
  recommendationRow.innerHTML = `
    <div class="recommendation-card">
      <p class="result-label">Product match</p>
      <h3>이 조합이 가장 자연스럽게 이어집니다</h3>
      <p class="offer-note">피부 컨디션과 사용 부담을 기준으로 바로 구독 구성에 넣기 쉬운 제품을 골랐습니다.</p>
      <div class="product-grid">
        ${result.recommendations
          .map(
            (product) => `
              <article class="product-card">
                <img src="${product.image}" alt="${product.name}" loading="lazy" />
                <div class="product-card-copy">
                  <p class="product-card-brand">${product.brand}</p>
                  <h4>${product.name}</h4>
                  <p>${product.description}</p>
                  <div class="tag-list">
                    ${product.matchTags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
                  </div>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </div>
  `;
  chatThread.appendChild(recommendationRow);

  const subscriptionRow = document.createElement("div");
  subscriptionRow.className = "chat-row is-bot";
  subscriptionRow.innerHTML = `
    <div class="subscription-card">
      <p class="result-label">Subscription offer</p>
      <h3>월 구독으로 자연스럽게 전환하기</h3>
      <p class="subscription-note">${result.subscriptionNote}</p>
      <div class="subscription-price-row">
        <div>
          <span class="subscription-price-label">Monthly plan</span>
          <strong>KRW 30,000</strong>
        </div>
        <div>
          <span class="subscription-price-label">Perceived value</span>
          <strong>up to KRW 150,000</strong>
        </div>
      </div>
      <div class="tag-list">
        ${result.offerTags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
      </div>
      <p class="offer-note">오프라인 방문 시에는 기기 측정과 톤 체크를 추가해 다음 달 구성 정확도를 높였다고 설명하면 설득력이 커집니다.</p>
    </div>
  `;
  chatThread.appendChild(subscriptionRow);

  renderResultActions();
  refreshSnapshot(result);
  window.requestAnimationFrame(() => {
    resultRow.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderResultActions() {
  chatControls.innerHTML = `
    <div class="control-copy">
      <strong>다음 행동을 바로 유도할 수 있습니다</strong>
      <p>프로토타입 단계에서는 CTA 위치와 문구만 검증해도 충분합니다.</p>
    </div>
    <div class="chat-actions-bottom">
      <a class="action-button action-button-primary" href="./shop.html">추천 제품 보러가기</a>
      <a class="action-button action-button-secondary" href="./index.html">오프라인 방문 흐름 연결</a>
      <button type="button" class="action-button action-button-secondary" id="restartAssessmentButton">다시 진단하기</button>
    </div>
  `;

  const restartButton = document.getElementById("restartAssessmentButton");
  restartButton?.addEventListener("click", restartAssessment);
}

function restartAssessment() {
  cleanupPreviewUrls();
  state.stepIndex = -1;
  state.answers = {};
  state.answerLabels = {};
  state.uploadedFiles = [];
  state.previewUrls = [];
  state.analysisStarted = false;
  state.complete = false;
  chatThread.innerHTML = "";
  chatControls.innerHTML = "";
  refreshSnapshot();
  updateProgress();
  bootConversation();
}

function inferSkinType() {
  const cleanseAfter30 = state.answers.cleanseAfter30;
  const oilyZone = state.answers.oilyZone;
  const frequentIssue = state.answers.frequentIssue;

  if (cleanseAfter30 === "tight_dry") return "dry";
  if (cleanseAfter30 === "overall_oily") return "oily";
  if (cleanseAfter30 === "tzone_oily") return "combo";
  if (oilyZone === "all") return "oily";
  if (oilyZone === "tzone" || oilyZone === "cheeks") return "combo";
  if (oilyZone === "none" && frequentIssue === "dryness") return "dry";
  return "normal";
}

function inferConcern() {
  const frequentIssue = state.answers.frequentIssue;
  const desiredOutcome = state.answers.desiredOutcome;

  if (frequentIssue) {
    return frequentIssue;
  }

  if (desiredOutcome === "calming") return "redness";
  if (desiredOutcome === "hydration") return "dryness";
  if (desiredOutcome === "brightening") return "tone";
  if (desiredOutcome === "sebum") return "pores";
  return "tone";
}

function inferSensitivity() {
  const rednessItch = state.answers.rednessItch;
  const reactionHistory = state.answers.reactionHistory;
  const avoidPreference = state.answers.avoidPreference;

  if (reactionHistory === "yes_strong" || rednessItch === "often") {
    return "high";
  }

  if (reactionHistory === "sometimes" || rednessItch === "sometimes" || avoidPreference === "fragrance") {
    return "medium";
  }

  return "low";
}

function inferGoal() {
  return state.answers.desiredOutcome || "hydration";
}

function inferUsagePattern() {
  const makeupFrequency = state.answers.makeupFrequency;
  if (makeupFrequency === "few") return "light_makeup";
  if (makeupFrequency === "regular") return "regular_makeup";
  if (makeupFrequency === "daily") return "daily_makeup";
  return "minimal";
}

function inferSubscriptionPreference() {
  return state.answers.subscriptionPreference || "mixed";
}

function buildSummary({ skinType, concern, sensitivity, goal, avoidPreference }) {
  const summaryParts = [];

  if (skinType === "dry") {
    summaryParts.push("세안 후 당김과 보습 부족 신호가 뚜렷해 보여 보습 밀도와 장벽 보호를 먼저 맞추는 편이 좋습니다.");
  } else if (skinType === "combo") {
    summaryParts.push("오후 유분 상승 부위와 초기 세안 반응을 함께 보면 T존과 U존 관리 포인트가 다른 복합 패턴에 가깝습니다.");
  } else if (skinType === "oily") {
    summaryParts.push("유분 상승 속도가 빠른 편으로 보여 산뜻하지만 과하게 건조하지 않은 밸런스형 루틴이 적합합니다.");
  } else {
    summaryParts.push("현재 응답 기준으로는 큰 치우침보다 계절과 사용 제품에 따라 컨디션이 바뀌는 밸런스형에 가깝습니다.");
  }

  if (sensitivity === "high") {
    summaryParts.push("붉은기나 반응 이력이 있어 성분 수를 과하게 늘리기보다 진정과 저자극 기준을 우선 적용하는 편이 안전합니다.");
  } else if (sensitivity === "medium") {
    summaryParts.push("민감도는 보통 수준으로 보이며, 효과감 있는 제품은 하나씩 단계적으로 추가하는 방식이 안정적입니다.");
  } else {
    summaryParts.push("새 제품 적응력은 비교적 무난한 편으로 보여 원하는 결과 중심으로 제품 강도를 조절할 수 있습니다.");
  }

  if (goal === "calming") {
    summaryParts.push("이번 추천은 진정과 붉은기 완화 쪽으로 우선순위를 두었습니다.");
  } else if (goal === "hydration") {
    summaryParts.push("이번 추천은 보습 지속력과 들뜸 완화에 초점을 두었습니다.");
  } else if (goal === "brightening") {
    summaryParts.push("이번 추천은 톤 정돈과 메이크업 전 컨디션 개선 쪽에 초점을 두었습니다.");
  } else if (goal === "sebum") {
    summaryParts.push("이번 추천은 피지 조절과 모공 부담을 줄이는 방향에 초점을 두었습니다.");
  }

  if (avoidPreference === "heavy") {
    summaryParts.push("무거운 크림은 피하고 싶다는 응답을 반영해 가벼운 제형 위주로 좁혔습니다.");
  } else if (avoidPreference === "sticky") {
    summaryParts.push("끈적임을 줄인 사용감을 우선 반영했습니다.");
  } else if (avoidPreference === "fragrance") {
    summaryParts.push("향에 민감할 수 있어 향 부담이 적은 제품을 우선 고려했습니다.");
  }

  if (concern === "trouble") {
    summaryParts.push("트러블 흔적 관리까지 이어질 수 있도록 진정 중심 구성으로 묶는 편이 자연스럽습니다.");
  } else if (concern === "pores") {
    summaryParts.push("모공과 피지 이슈가 겹칠 수 있어 유분 조절과 수분 유지 균형이 중요합니다.");
  }

  return summaryParts.join(" ");
}

function getRecommendations(criteria) {
  const displayTagMap = {
    dry: "건조",
    oily: "유분 밸런스",
    combo: "복합성",
    normal: "밸런스",
    trouble: "트러블 케어",
    dryness: "보습 집중",
    redness: "붉은기 케어",
    tone: "톤 정돈",
    pores: "모공 / 피지",
    high: "민감 케어",
    medium: "데일리 안정성",
    low: "효과감",
    calming: "진정",
    hydration: "보습",
    brightening: "톤 개선",
    sebum: "피지 조절",
    light: "가벼운 제형",
    rich: "리치 보습",
    fragrance_free: "향 최소화",
    sample: "샘플 중심",
    full: "정품 중심",
    mixed: "혼합 구성",
    minimal: "스킨케어 중심",
    light_makeup: "메이크업 병행",
    regular_makeup: "메이크업 고려",
    daily_makeup: "메이크업 친화"
  };

  const mappedPreferenceTags = {
    heavy: "light",
    sticky: "light",
    fragrance: "fragrance_free",
    none: "balanced",
    hydration: "hydration",
    calming: "calming",
    light: "light"
  };

  const matchValues = new Set([
    criteria.skinType,
    criteria.concern,
    criteria.sensitivity,
    criteria.goal,
    criteria.usagePattern,
    criteria.subscriptionPreference,
    mappedPreferenceTags[criteria.avoidPreference],
    mappedPreferenceTags[criteria.favoriteRoutine]
  ].filter(Boolean));

  if (criteria.concern === "pores") matchValues.add("sebum");
  if (criteria.concern === "redness" || criteria.concern === "trouble") matchValues.add("calming");
  if (criteria.concern === "tone") matchValues.add("brightening");
  if (criteria.skinType === "dry") matchValues.add("hydration");
  if (criteria.skinType === "oily" || criteria.skinType === "combo") matchValues.add("light");
  if (criteria.sensitivity === "high") matchValues.add("fragrance_free");

  return productCatalog
    .map((product) => {
      let score = 0;
      product.tags.forEach((tag) => {
        if (matchValues.has(tag)) {
          if (tag === criteria.skinType || tag === criteria.concern || tag === criteria.goal) {
            score += 3;
          } else if (tag === criteria.sensitivity || tag === criteria.subscriptionPreference) {
            score += 2;
          } else {
            score += 1;
          }
        }
      });

      return {
        ...product,
        score,
        matchTags: product.tags
          .filter((tag) => matchValues.has(tag))
          .slice(0, 3)
          .map((tag) => displayTagMap[tag] || tag)
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

function refreshSnapshot(result) {
  const labels = Object.values(state.answerLabels);
  snapshotStatus.textContent = state.complete
    ? "온라인 1차 진단이 완료되었습니다."
    : labels.length > 0
      ? `현재까지 ${labels.length}개 항목이 정리되었습니다.`
      : "아직 상담이 시작되지 않았습니다.";

  snapshotChips.innerHTML = "";

  labels.forEach((label) => {
    const chip = document.createElement("span");
    chip.className = "snapshot-chip";
    chip.textContent = label;
    snapshotChips.appendChild(chip);
  });

  if (result) {
    const resultChip = document.createElement("span");
    resultChip.className = "snapshot-chip";
    resultChip.textContent = result.title;
    snapshotChips.appendChild(resultChip);
  }
}

function updateProgress(isComplete = false) {
  const totalSteps = questionSteps.length;
  const currentValue = isComplete
    ? totalSteps
    : Math.min(Math.max(state.stepIndex, 0), totalSteps);

  progressText.textContent = `${currentValue} / ${totalSteps}`;
  progressFill.style.width = `${(currentValue / totalSteps) * 100}%`;
}

function addBotBubble(meta, message) {
  addBubble("is-bot", "bot-bubble", meta, message);
}

function addUserBubble(meta, message) {
  addBubble("is-user", "user-bubble", meta, message);
}

function addBubble(rowClass, bubbleClass, meta, message) {
  const row = document.createElement("div");
  row.className = `chat-row ${rowClass}`;
  row.innerHTML = `
    <div class="${bubbleClass}">
      <div class="chat-meta">${meta}</div>
      <p>${message}</p>
    </div>
  `;
  chatThread.appendChild(row);
  scrollThreadToBottom();
}

function scrollThreadToBottom() {
  window.requestAnimationFrame(() => {
    chatThread.scrollTop = chatThread.scrollHeight;
  });
}

function cleanupPreviewUrls() {
  state.previewUrls.forEach((url) => URL.revokeObjectURL(url));
}
