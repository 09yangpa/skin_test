import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { MongoClient } from "mongodb";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = resolve(__dirname, "public");
const productDbPath = resolve(__dirname, "data/products.db");
const importDir = resolve(__dirname, "data/imports");

await loadDotEnv();

const port = Number(process.env.PORT || 3000);
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "";
const mongoDbName = process.env.SKIN_MONGO_DB || "castshop_gift_test";
const skinProductsCollection = process.env.SKIN_PRODUCTS_COLLECTION || "skin_products";
let mongoClientPromise = null;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const diagnosisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    profileTitle: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    skinType: { type: "string" },
    visibleSignals: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
    priorityConcerns: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
    routine: {
      type: "object",
      additionalProperties: false,
      properties: {
        morning: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
        evening: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
        weekly: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 }
      },
      required: ["morning", "evening", "weekly"]
    },
    ingredientFocus: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
    avoidOrCaution: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
    productDirection: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    storeVisitReason: { type: "string" },
    disclaimer: { type: "string" }
  },
  required: [
    "profileTitle",
    "confidence",
    "skinType",
    "visibleSignals",
    "priorityConcerns",
    "routine",
    "ingredientFocus",
    "avoidOrCaution",
    "productDirection",
    "storeVisitReason",
    "disclaimer"
  ]
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/health") {
      const productStatus = await getProductStatus();
      return sendJson(response, 200, {
        ok: true,
        hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        ...productStatus
      });
    }

    if (request.method === "POST" && url.pathname === "/api/skin-diagnosis") {
      return handleSkinDiagnosis(request, response);
    }

    if (request.method === "POST" && url.pathname === "/api/product-import/preview") {
      return handleProductImportPreview(request, response);
    }

    if (request.method === "POST" && url.pathname === "/api/product-import/commit") {
      return handleProductImportCommit(request, response);
    }

    if (request.method === "GET" && url.pathname === "/api/product-import/stats") {
      return handleProductImportStats(response);
    }

    if (request.method === "GET" || request.method === "HEAD") {
      return serveStatic(url.pathname, response, request.method === "HEAD");
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Unexpected server error" });
  }
});

server.listen(port, () => {
  console.log(`Skin AI local page: http://localhost:${port}`);
});

async function handleSkinDiagnosis(request, response) {
  const payload = await readJsonBody(request, 8 * 1024 * 1024);
  const answers = payload.answers && typeof payload.answers === "object" ? payload.answers : {};
  const images = Array.isArray(payload.images) ? payload.images.slice(0, 3) : [];
  const analysisSourceNote = buildPhotoAnalysisNote(images.length);

  if (!process.env.OPENAI_API_KEY) {
    const diagnosis = buildDemoDiagnosis(answers, images.length);
    diagnosis.obnfType = calculateObnfType(answers, diagnosis);
    return sendJson(response, 200, {
      mode: "demo",
      diagnosis,
      recommendations: await buildProductRecommendations(answers, diagnosis),
      note: [analysisSourceNote, "OPENAI_API_KEY가 없어 데모 결과를 반환했습니다. .env에 키를 넣으면 실제 OpenAI 분석으로 전환됩니다."]
        .filter(Boolean)
        .join(" ")
    });
  }

  const content = [
    {
      type: "input_text",
      text: buildPrompt(answers, images.length)
    },
    ...images.map((imageUrl) => ({
      type: "input_image",
      image_url: imageUrl
    }))
  ];

  const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are a Korean cosmetic skin-care concierge. Provide non-medical, cosmetic guidance only. Do not diagnose diseases. If a medical issue may be present, recommend seeing a dermatologist. Return only valid JSON matching the schema."
            }
          ]
        },
        {
          role: "user",
          content
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "skin_diagnosis",
          strict: true,
          schema: diagnosisSchema
        }
      }
    })
  });

  const result = await openAIResponse.json();

  if (!openAIResponse.ok) {
    console.error("OpenAI error", result);
    return sendJson(response, openAIResponse.status, {
      error: result.error?.message || "OpenAI 요청에 실패했습니다."
    });
  }

  const text = extractOutputText(result);
  let diagnosis;

  try {
    diagnosis = JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse model JSON", text, error);
    return sendJson(response, 502, { error: "AI 결과를 JSON으로 해석하지 못했습니다." });
  }
  diagnosis.obnfType = calculateObnfType(answers, diagnosis);

  sendJson(response, 200, {
    mode: "openai",
    diagnosis,
    note: analysisSourceNote,
    recommendations: await buildProductRecommendations(answers, diagnosis)
  });
}

async function handleProductImportPreview(request, response) {
  const form = await readMultipartForm(request, 35 * 1024 * 1024);
  const brand = String(form.fields.brand || "").trim();
  const file = form.files.file;

  if (!brand) {
    return sendJson(response, 400, { error: "브랜드명을 입력해 주세요." });
  }
  if (!file) {
    return sendJson(response, 400, { error: "업로드할 엑셀 파일을 선택해 주세요." });
  }

  const extension = extname(file.filename).toLowerCase();
  if (![".xlsx", ".csv"].includes(extension)) {
    return sendJson(response, 400, { error: "현재는 .xlsx 또는 .csv 파일만 지원합니다. .xls는 xlsx로 저장 후 업로드해 주세요." });
  }

  const safeBrand = sanitizeFileSegment(brand);
  const safeName = sanitizeFileSegment(file.filename.replace(extension, ""));
  const storedName = `${formatTimestampForFile()}_${safeName}${extension}`;
  const brandImportDir = resolve(importDir, safeBrand);
  await mkdir(brandImportDir, { recursive: true });
  const storedPath = resolve(brandImportDir, storedName);
  await writeFile(storedPath, file.data);

  try {
    const result = await runProductImportScript([
      "preview",
      "--db",
      productDbPath,
      "--file",
      storedPath,
      "--brand",
      brand,
      "--original-filename",
      file.filename
    ]);
    sendJson(response, 200, result);
  } catch (error) {
    console.error("Product import preview failed", error);
    sendJson(response, 500, { error: error.message || "엑셀 미리보기에 실패했습니다." });
  }
}

async function handleProductImportCommit(request, response) {
  const payload = await readJsonBody(request, 1024 * 1024);
  const batchId = Number(payload.batchId || 0);
  if (!batchId) {
    return sendJson(response, 400, { error: "batchId가 필요합니다." });
  }

  try {
    const result = await runProductImportScript([
      "commit",
      "--db",
      productDbPath,
      "--batch-id",
      String(batchId)
    ]);
    sendJson(response, 200, result);
  } catch (error) {
    console.error("Product import commit failed", error);
    sendJson(response, 500, { error: error.message || "DB 반영에 실패했습니다." });
  }
}

async function handleProductImportStats(response) {
  try {
    const result = await runProductImportScript([
      "stats",
      "--db",
      productDbPath
    ]);
    sendJson(response, 200, result);
  } catch (error) {
    console.error("Product import stats failed", error);
    sendJson(response, 500, { error: error.message || "import 상태 조회에 실패했습니다." });
  }
}

function buildPrompt(answers, imageCount = 0) {
  const sourceInstruction = buildPromptSourceInstruction(imageCount);
  return [
    sourceInstruction,
    "의료 진단이 아니라 화장품/스킨케어 추천을 위한 1차 뷰티 상담으로만 표현해줘.",
    "피부질환명 단정, 치료 표현, 약 처방 표현은 피하고 필요한 경우 피부과 상담을 권유해줘.",
    "답변은 schema에 맞는 JSON만 반환해줘.",
    "",
    `설문 응답: ${JSON.stringify(answers, null, 2)}`
  ].join("\n");
}

function buildPromptSourceInstruction(imageCount = 0) {
  if (!imageCount) {
    return "얼굴 사진이 제공되지 않았으므로 아래 설문 응답만 바탕으로 한국어 피부 컨시어지 결과를 작성해줘. 사진 관찰 표현은 쓰지 말고, 설문 기반 추정이라고 표현해줘.";
  }
  if (imageCount < 3) {
    return `아래 설문과 업로드된 얼굴 사진 ${imageCount}장을 바탕으로 한국어 피부 컨시어지 결과를 작성해줘. 사진이 권장 3장보다 적으므로 보이지 않는 부위는 단정하지 말고 설문 기반으로 보정해줘.`;
  }
  return "아래 설문과 얼굴 사진 3장을 바탕으로 한국어 피부 컨시어지 결과를 작성해줘.";
}

function buildPhotoAnalysisNote(imageCount = 0) {
  if (!imageCount) {
    return "사진이 없어 설문지를 기준으로 결과를 도출합니다. 사진은 저장되지 않습니다.";
  }
  if (imageCount < 3) {
    return `업로드한 사진 ${imageCount}장을 참고하고, 부족한 부분은 설문지를 기준으로 보정해 결과를 도출합니다. 사진은 저장되지 않습니다.`;
  }
  return "업로드한 사진 3장을 함께 참고해 결과를 도출합니다. 사진은 저장되지 않습니다.";
}

function buildDemoDiagnosis(answers, imageCount = 0) {
  const concern = answers.concern || "수분 밸런스";
  const sensitivity = answers.sensitivity || "보통";
  const hasPhotos = imageCount > 0;

  return {
    profileTitle: `${concern} 중심의 수분-진정 밸런스 타입`,
    confidence: "medium",
    skinType: "복합성 또는 수분 부족형으로 추정",
    visibleSignals: [
      hasPhotos
        ? "사진과 설문을 함께 보면 부위별 컨디션 차이가 있을 수 있습니다."
        : "사진이 없어 설문 응답을 기준으로 피부 컨디션을 추정합니다.",
      "세안 후 당김이나 오후 유분감이 동시에 나타나는 패턴을 우선 고려합니다.",
      "붉은기와 트러블 흔적은 자극을 줄인 루틴으로 천천히 관리하는 편이 좋습니다."
    ],
    priorityConcerns: [concern, `${sensitivity} 민감도 관리`, "피부 장벽 부담 줄이기"],
    routine: {
      morning: ["약산성 클렌저 또는 물세안", "수분 세럼", "가벼운 보습제", "자외선 차단제"],
      evening: ["저자극 클렌징", "진정 토너 또는 에센스", "장벽 보습 크림", "국소 고민 부위 케어"],
      weekly: ["주 1회 저자극 각질 케어", "피부가 예민한 날은 기능성 제품 쉬기"]
    },
    ingredientFocus: ["히알루론산", "판테놀", "세라마이드", "나이아신아마이드", "병풀 추출물"],
    avoidOrCaution: ["고함량 산 성분을 매일 쓰는 루틴", "강한 향이나 알코올감이 큰 제품", "스크럽처럼 마찰이 큰 케어"],
    productDirection: ["가벼운 수분 세럼", "장벽 보습 크림", "진정 중심 앰플", "데일리 선크림"],
    storeVisitReason: "매장에서는 조명과 기기 측정으로 유분, 수분, 톤 편차를 더 정확히 확인할 수 있어 다음 제품 구성을 좁히기 좋습니다.",
    disclaimer: "이 결과는 의료 진단이 아닌 화장품 선택을 위한 참고용입니다. 통증, 심한 가려움, 염증이 지속되면 피부과 전문의 상담을 권장합니다."
  };
}

function calculateObnfType(answers, diagnosis = {}) {
  const text = [
    answers.gender,
    answers.ageRange,
    answers.afterCleanse,
    answers.oilTiming,
    answers.concern,
    answers.sensitivity,
    answers.breakoutFrequency,
    answers.texture,
    answers.shavingMakeupIrritation,
    answers.sunExposure,
    answers.preferredTexture,
    answers.avoidPreference,
    answers.goal,
    diagnosis.profileTitle,
    diagnosis.skinType,
    ...(diagnosis.visibleSignals || []),
    ...(diagnosis.priorityConcerns || []),
    ...(diagnosis.ingredientFocus || []),
    ...(diagnosis.avoidOrCaution || [])
  ].filter(Boolean).join(" ");

  const oilScore = clampScore(
    38
    + scoreIf(text, /전체적으로 번들|오전부터|피지 조절|모공과 피지/, 24)
    + scoreIf(text, /T존만 번들|점심 이후|트러블|운동\/땀|유분|피지|모공|번들/, 16)
    + scoreIf(text, /10대|20대/, 6)
    - scoreIf(text, /많이 당긴다|수분 부족|속당김|거의 없다|각질이 잘 뜬다|건조/, 22)
    - scoreIf(text, /리치한 크림/, 6)
  );

  const sensitivityScore = clampScore(
    30
    + scoreIf(text, /높음|붉은기|예민|민감|따갑|면도 자극|둘 다 있다/, 30)
    + scoreIf(text, /보통|가끔|오돌토돌|거칠|각질|메이크업 자극|강한 향/, 14)
    + scoreIf(text, /많이 당긴다|장벽|진정|자극|스크럽|알코올|향료/, 12)
    - scoreIf(text, /낮음|거의 없어요|특별히 없다|큰 변화 없다/, 18)
  );

  const pigmentScore = clampScore(
    24
    + scoreIf(text, /칙칙함|톤 불균형|톤 개선|브라이트|미백|색소|자국/, 32)
    + scoreIf(text, /트러블과 자국|야외 활동이 많다|하루 1~2시간|운동\/땀/, 16)
    + scoreIf(text, /30대|40대|50대/, 8)
    - scoreIf(text, /대부분 실내/, 8)
  );

  const lineScore = clampScore(
    20
    + scoreIf(text, /50대/, 42)
    + scoreIf(text, /40대/, 34)
    + scoreIf(text, /30대/, 20)
    + scoreIf(text, /탄력|노화|주름|라인|리프팅|아데노신|펩타이드|10분 이상/, 24)
    + scoreIf(text, /야외 활동이 많다|운동\/땀/, 8)
    - scoreIf(text, /10대|20대/, 12)
  );

  const code = [
    oilScore >= 50 ? "O" : "X",
    sensitivityScore >= 50 ? "S" : "B",
    pigmentScore >= 50 ? "P" : "N",
    lineScore >= 50 ? "L" : "F"
  ].join("");

  const axes = [
    buildObnfAxis("oil", code[0], oilScore, "O", "X", "유분/피지", "유분과 피지 분비가 빠르게 올라오는 편", "유분보다 건조/수분 부족 신호가 더 큰 편"),
    buildObnfAxis("barrier", code[1], sensitivityScore, "S", "B", "민감/장벽", "민감 반응과 장벽 부담을 우선 관리", "장벽 반응이 비교적 안정적인 편"),
    buildObnfAxis("pigment", code[2], pigmentScore, "P", "N", "톤/색소", "톤, 자국, 색소 균일감 관리 우선", "색소보다 수분/피지/장벽 균형이 우선"),
    buildObnfAxis("firmness", code[3], lineScore, "L", "F", "탄력/라인", "탄력, 주름, 라인 케어 우선", "탄력은 예방 중심으로 관리")
  ];

  return {
    code,
    title: `${code} 타입`,
    basis: "설문 답변과 AI 리포트 키워드를 함께 반영한 내부 추천 지표",
    summary: buildObnfSummary(code),
    axes,
    routineFocus: buildObnfRoutineFocus(code)
  };
}

function scoreIf(text, pattern, value) {
  return pattern.test(text) ? value : 0;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildObnfAxis(key, letter, score, activeLetter, inactiveLetter, label, activeMeaning, inactiveMeaning) {
  const active = letter === activeLetter;
  return {
    key,
    letter,
    opposite: active ? inactiveLetter : activeLetter,
    label,
    score,
    meaning: active ? activeMeaning : inactiveMeaning
  };
}

function buildObnfSummary(code) {
  const parts = [];
  parts.push(code[0] === "O" ? "유분/피지 활성 신호가 있어 산뜻한 밸런스가 중요합니다." : "유분보다 수분 유지와 보호막 보완이 더 중요합니다.");
  parts.push(code[1] === "S" ? "민감·장벽 반응이 있어 저자극 루틴을 우선합니다." : "장벽 반응은 비교적 안정적으로 보고 기능성 선택지를 조금 열어둘 수 있습니다.");
  parts.push(code[2] === "P" ? "톤, 자국, 색소 균일감 케어를 함께 봅니다." : "색소보다는 현재 컨디션 균형을 먼저 맞추는 쪽으로 봅니다.");
  parts.push(code[3] === "L" ? "탄력/라인 케어 비중을 높입니다." : "탄력은 고강도보다 예방과 기본 보습 중심으로 관리합니다.");
  return parts.join(" ");
}

function buildObnfRoutineFocus(code) {
  const focus = [];
  focus.push(code[0] === "O" ? "가벼운 수분 제형과 피지 밸런스 성분 우선" : "보습 지속력과 장벽 크림 우선");
  focus.push(code[1] === "S" ? "향료, 산 성분, 레티노이드는 천천히 도입" : "피부 반응을 보며 기능성 성분 단계적 추가");
  focus.push(code[2] === "P" ? "나이아신아마이드, 비타민 계열, 선케어 연결" : "톤 케어보다 수분/장벽/피지 기본기 우선");
  focus.push(code[3] === "L" ? "펩타이드, 아데노신, 고보습 탄력 루틴 검토" : "과한 안티에이징보다 데일리 예방 케어");
  return focus;
}

function extractOutputText(result) {
  if (typeof result.output_text === "string") {
    return result.output_text;
  }

  const chunks = [];
  for (const item of result.output || []) {
    for (const part of item.content || []) {
      if (part.type === "output_text" && typeof part.text === "string") {
        chunks.push(part.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

async function getMongoDb() {
  if (!mongoUri) return null;
  if (!mongoClientPromise) {
    const client = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    mongoClientPromise = client.connect();
  }
  const client = await mongoClientPromise;
  return client.db(mongoDbName);
}

async function getProductStatus() {
  try {
    const db = await getMongoDb();
    if (!db) {
      return {
        productDbProvider: "mongodb",
        productDbReady: false,
        productDbError: "MONGO_URI가 설정되지 않았습니다.",
        productCount: 0,
        productDbName: mongoDbName,
        productCollection: skinProductsCollection,
        localSqliteReady: existsSync(productDbPath)
      };
    }
    const productCount = await db.collection(skinProductsCollection).countDocuments({ recommendationReady: true });
    return {
      productDbProvider: "mongodb",
      productDbReady: true,
      productCount,
      productDbName: mongoDbName,
      productCollection: skinProductsCollection,
      localSqliteReady: existsSync(productDbPath)
    };
  } catch (error) {
    return {
      productDbProvider: "mongodb",
      productDbReady: false,
      productDbError: error.message || "MongoDB 상품 DB 연결 실패",
      productCount: 0,
      productDbName: mongoDbName,
      productCollection: skinProductsCollection,
      localSqliteReady: existsSync(productDbPath)
    };
  }
}

async function loadProductsFromDb() {
  const db = await getMongoDb();
  if (!db) return [];

  const products = await db.collection(skinProductsCollection)
    .find({ recommendationReady: true })
    .project({
      _id: 1,
      sqliteId: 1,
      brand: 1,
      productCode: 1,
      productName: 1,
      barcode: 1,
      price: 1,
      priceTier: 1,
      category: 1,
      volume: 1,
      ingredientsRaw: 1,
      benefitTags: 1,
      cautionTags: 1,
      usage: 1,
      cautionText: 1,
      ingredientNames: 1,
      ingredients: 1,
      matchedIngredients: 1
    })
    .toArray();

  return products.map(normalizeMongoProduct);
}

function normalizeMongoProduct(product) {
  const ingredientNames = Array.isArray(product.ingredientNames)
    ? product.ingredientNames
    : Array.isArray(product.ingredients)
      ? product.ingredients.map((item) => typeof item === "string" ? item : item?.name).filter(Boolean)
      : [];

  return {
    id: product.sqliteId || product._id,
    brand: product.brand || "",
    product_code: product.productCode || "",
    product_name: product.productName || "",
    barcode: product.barcode || "",
    price: Number(product.price || 0),
    price_tier: product.priceTier || "",
    category: product.category || "etc",
    volume: product.volume || "",
    ingredients_raw: product.ingredientsRaw || "",
    benefit_tags: asArray(product.benefitTags),
    caution_tags: asArray(product.cautionTags),
    usage: product.usage || "",
    caution_text: product.cautionText || "",
    ingredients: ingredientNames,
    matchedIngredients: asArray(product.matchedIngredients)
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function buildProductRecommendations(answers, diagnosis) {
  const products = await loadProductsFromDb();
  if (!products.length) {
    return {
      summary: "MongoDB 추천 컬렉션에 전성분 상품이 아직 없거나 연결되지 않았습니다.",
      profile: buildRecommendationProfile(answers, diagnosis),
      routine: [],
      priceTiers: [],
      avoidProducts: [],
      totalProductsScored: 0
    };
  }

  const profile = buildRecommendationProfile(answers, diagnosis);
  const scored = products
    .map((product) => scoreProduct(product, profile))
    .sort((left, right) => right.score - left.score);

  const positiveProducts = scored.filter((item) => item.score > 0);
  const routine = buildRoutineRecommendations(positiveProducts, profile);
  const priceTiers = buildPriceTierRecommendations(positiveProducts, profile);
  const avoidProducts = scored
    .filter((item) => item.riskScore >= profile.riskThreshold || item.score < 0)
    .slice(0, 5)
    .map(toRecommendationProduct);

  return {
    summary: `${products.length}개 전성분 상품 중 ${positiveProducts.length}개를 피부 상태와 성분 기준으로 후보화했습니다.`,
    profile,
    routine,
    priceTiers,
    avoidProducts,
    totalProductsScored: products.length
  };
}

function buildRecommendationProfile(answers, diagnosis) {
  const wantedBenefits = new Set();
  const avoidCautions = new Set();
  const notes = [];

  const gender = answers.gender || "";
  const ageRange = answers.ageRange || "";
  const routineStyle = answers.routineStyle || "";
  const routineTime = answers.routineTime || "";
  const budgetPreference = answers.budgetPreference || "";
  const subscriptionPreference = answers.subscriptionPreference || "";
  const preferredTexture = answers.preferredTexture || "";
  const sunExposure = answers.sunExposure || "";
  const repeatedIrritation = answers.shavingMakeupIrritation || "";
  const concern = `${answers.concern || ""} ${diagnosis?.priorityConcerns?.join(" ") || ""}`;
  const goal = `${answers.goal || ""} ${diagnosis?.ingredientFocus?.join(" ") || ""}`;
  const sensitivity = `${answers.sensitivity || ""} ${diagnosis?.skinType || ""}`;
  const skinSignals = `${concern} ${goal} ${sensitivity} ${answers.afterCleanse || ""} ${answers.oilTiming || ""} ${answers.breakoutFrequency || ""} ${answers.texture || ""} ${preferredTexture} ${sunExposure} ${repeatedIrritation}`;
  const compactRoutine = /올인원|2~3단계|1분 이하|3분 정도/.test(`${routineStyle} ${routineTime}`);
  const layeredRoutine = /여러 단계|10분 이상|5분 정도/.test(`${routineStyle} ${routineTime}`);

  if (/남성/.test(gender) && !layeredRoutine) {
    notes.push("남성 고객에게 부담이 적은 짧고 실용적인 루틴을 우선합니다.");
  }
  if (/여성/.test(gender) && layeredRoutine) {
    notes.push("여러 단계를 시도할 의향이 있어 고민별 레이어드 루틴을 열어둡니다.");
  }
  if (compactRoutine) {
    notes.push("올인원/짧은 관리 시간에 맞춰 제품 수를 줄인 핵심 루틴을 우선합니다.");
  }
  if (layeredRoutine) {
    notes.push("관리 시간이 충분해 토너, 세럼, 크림, 주간 케어를 단계별로 조합합니다.");
  }
  if (/30대|40대|50대/.test(ageRange)) {
    wantedBenefits.add("anti_aging");
    wantedBenefits.add("barrier");
    notes.push("나이대 특성을 반영해 장벽과 탄력 케어 비중을 높입니다.");
  }
  if (/10대|20대/.test(ageRange)) {
    wantedBenefits.add("soothing");
    if (/트러블|피지|번들|모공/.test(skinSignals)) {
      wantedBenefits.add("oil_control");
    }
  }

  if (/수분|속당김|건조|보습|각질|뜬다|당긴다/.test(skinSignals)) {
    wantedBenefits.add("hydration");
    wantedBenefits.add("barrier");
    notes.push("수분 부족과 장벽 보완을 우선합니다.");
  }
  if (/붉은|예민|민감|진정|따갑|면도/.test(skinSignals)) {
    wantedBenefits.add("soothing");
    wantedBenefits.add("barrier");
    avoidCautions.add("fragrance");
    avoidCautions.add("essential_oil");
    notes.push("민감 신호가 있어 향료/에센셜오일 부담을 낮춥니다.");
  }
  if (/트러블|모공|피지|번들|유분|전체적으로 번들|오전부터|점심 이후|운동|땀/.test(skinSignals)) {
    wantedBenefits.add("oil_control");
    wantedBenefits.add("texture");
    notes.push("피지와 모공 부담을 줄이는 성분을 가점 처리합니다.");
  }
  if (/톤|칙칙|미백|브라이트|야외 활동/.test(skinSignals)) {
    wantedBenefits.add("brightening");
    notes.push("톤 균일감 관련 성분을 보조 가점으로 봅니다.");
  }
  if (/오돌토돌|거칠|결|필링|메이크업/.test(skinSignals)) {
    wantedBenefits.add("texture");
  }
  if (/메이크업/.test(repeatedIrritation)) {
    wantedBenefits.add("hydration");
    notes.push("메이크업 밀착과 클렌징 부담을 고려해 수분감과 결 정돈을 함께 봅니다.");
  }
  if (/야외 활동|운동|땀/.test(sunExposure)) {
    wantedBenefits.add("soothing");
    wantedBenefits.add("barrier");
    avoidCautions.add("heavy_oil");
    notes.push("야외/운동 노출이 있어 산뜻한 장벽 케어를 우선합니다.");
  }

  if (/높음|민감|예민/.test(sensitivity)) {
    avoidCautions.add("acid_exfoliant");
    avoidCautions.add("retinoid");
  }
  if (answers.avoidPreference === "강한 향") {
    avoidCautions.add("fragrance");
    avoidCautions.add("essential_oil");
  }
  if (answers.avoidPreference === "무거운 크림") {
    avoidCautions.add("heavy_oil");
  }
  if (answers.goal === "피지 조절") {
    avoidCautions.add("heavy_oil");
  }
  if (/가벼운 젤|끈적임|운동|땀/.test(`${preferredTexture} ${answers.avoidPreference || ""} ${sunExposure}`)) {
    avoidCautions.add("heavy_oil");
  }

  if (!wantedBenefits.size) {
    wantedBenefits.add("hydration");
    wantedBenefits.add("barrier");
  }

  return {
    wantedBenefits: Array.from(wantedBenefits),
    avoidCautions: Array.from(avoidCautions),
    gender,
    ageRange,
    routineStyle,
    routineTime,
    budgetPreference,
    subscriptionPreference,
    preferredTexture,
    sensitivity: answers.sensitivity || "",
    goal: answers.goal || "",
    concern: answers.concern || "",
    compactRoutine,
    layeredRoutine,
    notes: dedupe(notes),
    riskThreshold: /높음/.test(sensitivity) ? 4 : 6
  };
}

function scoreProduct(product, profile) {
  let score = 0;
  let riskScore = 0;
  const reasons = [];
  const cautions = [];

  for (const tag of profile.wantedBenefits) {
    if (product.benefit_tags.includes(tag)) {
      score += benefitWeight(tag);
      reasons.push(`${benefitLabel(tag)} 관련 성분 포함`);
    }
  }

  for (const tag of product.caution_tags) {
    const weight = cautionWeight(tag);
    riskScore += weight;
    if (profile.avoidCautions.includes(tag)) {
      score -= weight * 2;
      cautions.push(`${cautionLabel(tag)} 주의`);
    } else {
      score -= Math.max(1, Math.floor(weight / 2));
      cautions.push(`${cautionLabel(tag)} 포함`);
    }
  }

  score += categoryFitScore(product.category, profile);
  score += pricePreferenceScore(product.price_tier, profile.budgetPreference);
  if (product.category === "body" || product.category === "lip") score -= 8;

  return {
    ...product,
    score,
    riskScore,
    reasons: dedupe(reasons).slice(0, 5),
    cautions: dedupe(cautions).slice(0, 5)
  };
}

function benefitWeight(tag) {
  return {
    hydration: 10,
    barrier: 12,
    soothing: 11,
    oil_control: 8,
    brightening: 7,
    texture: 5,
    anti_aging: 4
  }[tag] || 4;
}

function cautionWeight(tag) {
  return {
    fragrance: 4,
    essential_oil: 4,
    acid_exfoliant: 3,
    retinoid: 6,
    heavy_oil: 2
  }[tag] || 2;
}

function categoryFitScore(category, profile) {
  if (category === "cleanser") return profile.sensitivity === "높음" ? 5 : 4;
  if (category === "toner") return profile.compactRoutine ? 1 : 4;
  if (category === "serum") return profile.layeredRoutine ? 9 : 7;
  if (category === "cream") return profile.wantedBenefits.includes("barrier") ? 10 : 6;
  if (category === "mask") return profile.layeredRoutine ? 5 : 1;
  if (category === "etc") return 1;
  return 0;
}

function pricePreferenceScore(priceTier, budgetPreference) {
  if (/저가/.test(budgetPreference)) {
    if (priceTier === "low") return 8;
    if (priceTier === "mid") return 2;
    if (priceTier === "high") return -5;
  }
  if (/중가/.test(budgetPreference)) {
    if (priceTier === "mid") return 7;
    if (priceTier === "low") return 3;
    if (priceTier === "high") return 1;
  }
  if (/고가/.test(budgetPreference)) {
    if (priceTier === "high") return 6;
    if (priceTier === "mid") return 3;
  }
  if (/적합도/.test(budgetPreference)) {
    return 1;
  }
  return 0;
}

function buildRoutineRecommendations(scoredProducts, profile) {
  const routineSlots = profile.compactRoutine
    ? [
        { category: "cleanser", title: "1. 저자극 클렌저", instruction: "저녁 세안만큼은 부드럽게 정리해 다음 제품 흡수를 준비합니다." },
        { category: "serum", title: "2. 핵심 세럼/앰플", instruction: "가장 큰 고민을 겨냥한 제품 1개만 얹어 루틴을 짧게 가져갑니다." },
        { category: "cream", title: "3. 올인원 마무리 크림", instruction: "수분과 장벽감을 한 번에 잠그는 제품을 우선합니다." }
      ]
    : [
        { category: "cleanser", title: "1. 클렌저", instruction: "아침에는 가볍게, 저녁에는 노폐물과 선케어를 부드럽게 정리합니다." },
        { category: "toner", title: "2. 토너/로션", instruction: "세안 후 피부결을 정돈하고 다음 단계 흡수를 돕습니다." },
        { category: "serum", title: "3. 세럼/앰플", instruction: "고민 성분을 집중적으로 얹는 단계입니다." },
        { category: "cream", title: "4. 크림/젤크림", instruction: "수분과 장벽감을 잠그는 마무리 단계입니다." },
        { category: "mask", title: "5. 주간 스페셜 케어", instruction: "피부 컨디션이 괜찮은 날 주 1~2회 보조로 사용합니다." }
      ];

  return routineSlots
    .map((slot) => {
      const products = scoredProducts
        .filter((product) => product.category === slot.category)
        .slice(0, 2)
        .map(toRecommendationProduct);
      return products.length ? { ...slot, products } : null;
    })
    .filter(Boolean);
}

function buildPriceTierRecommendations(scoredProducts, profile) {
  const tiers = [
    { key: "low", label: "부담 적은 시작", description: "처음 써보기 좋고 매일 편하게 이어가기 좋은 제품" },
    { key: "mid", label: "데일리 밸런스", description: "성분, 사용감, 가격의 균형을 맞춘 꾸준한 관리 제품" },
    { key: "high", label: "집중 케어", description: "특정 피부 고민을 더 세밀하게 관리하고 싶을 때의 선택지" }
  ];
  const preferredTier = preferredPriceTier(profile.budgetPreference);
  const orderedTiers = preferredTier
    ? [...tiers].sort((left, right) => (left.key === preferredTier ? -1 : right.key === preferredTier ? 1 : 0))
    : tiers;

  return orderedTiers.map((tier) => ({
    ...tier,
    preferred: tier.key === preferredTier,
    label: tier.key === preferredTier ? `${tier.label} · 선호` : tier.label,
    products: scoredProducts
      .filter((product) => product.price_tier === tier.key)
      .slice(0, 3)
      .map(toRecommendationProduct)
  }));
}

function preferredPriceTier(budgetPreference) {
  if (/저가/.test(budgetPreference)) return "low";
  if (/중가/.test(budgetPreference)) return "mid";
  if (/고가/.test(budgetPreference)) return "high";
  return "";
}

function toRecommendationProduct(product) {
  return {
    id: product.id,
    brand: product.brand,
    productName: product.product_name,
    price: product.price,
    priceTier: product.price_tier,
    category: product.category,
    volume: product.volume,
    score: product.score,
    riskScore: product.riskScore,
    reasons: product.reasons.length ? product.reasons : ["현재 피부 목표와 기본 보습 루틴에 맞는 후보입니다."],
    cautions: product.cautions,
    keyIngredients: pickKeyIngredients(product.ingredients)
  };
}

function pickKeyIngredients(ingredients) {
  const keywords = [
    "글리세린",
    "판테놀",
    "세라마이드",
    "스쿠알란",
    "나이아신아마이드",
    "히알루론",
    "알란토인",
    "토코페롤",
    "락틱애씨드",
    "레티노"
  ];
  return ingredients.filter((ingredient) => keywords.some((keyword) => ingredient.includes(keyword))).slice(0, 5);
}

function benefitLabel(tag) {
  return {
    hydration: "수분/보습",
    barrier: "장벽 보완",
    soothing: "진정",
    oil_control: "피지/모공",
    brightening: "톤 개선",
    texture: "피부결",
    anti_aging: "탄력/안티에이징"
  }[tag] || tag;
}

function cautionLabel(tag) {
  return {
    fragrance: "향료",
    essential_oil: "에센셜오일",
    acid_exfoliant: "산/필링 성분",
    retinoid: "레티노이드",
    heavy_oil: "무거운 오일감"
  }[tag] || tag;
}

function dedupe(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function serveStatic(pathname, response, headOnly) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    return sendText(response, 403, "Forbidden");
  }

  const targetPath = existsSync(filePath) ? filePath : join(publicDir, "index.html");
  const ext = extname(targetPath);
  const contentType = mimeTypes[ext] || "application/octet-stream";

  response.writeHead(200, { "Content-Type": contentType });
  if (!headOnly) {
    response.end(await readFile(targetPath));
  } else {
    response.end();
  }
}

async function readJsonBody(request, maxBytes) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBytes) {
      throw new Error("Request body too large");
    }
  }
  return body ? JSON.parse(body) : {};
}

async function readRawBody(request, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) {
      throw new Error("Request body too large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readMultipartForm(request, maxBytes) {
  const contentType = request.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    throw new Error("multipart boundary를 찾지 못했습니다.");
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const body = await readRawBody(request, maxBytes);
  const rawParts = splitBuffer(body, Buffer.from(`--${boundary}`));
  const fields = {};
  const files = {};

  for (let part of rawParts) {
    if (!part.length) continue;
    if (part.equals(Buffer.from("--\r\n")) || part.equals(Buffer.from("--"))) continue;
    if (part.subarray(0, 2).toString() === "\r\n") {
      part = part.subarray(2);
    }
    if (part.subarray(-2).toString() === "\r\n") {
      part = part.subarray(0, -2);
    }
    if (part.subarray(-2).toString() === "--") {
      part = part.subarray(0, -2);
    }

    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;

    const headerText = part.subarray(0, headerEnd).toString("utf8");
    const data = part.subarray(headerEnd + 4);
    const disposition = headerText.split(/\r?\n/).find((line) => line.toLowerCase().startsWith("content-disposition")) || "";
    const nameMatch = disposition.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const filenameMatch = disposition.match(/filename="([^"]*)"/);

    if (filenameMatch) {
      files[name] = {
        filename: filenameMatch[1] || "upload.xlsx",
        data
      };
    } else {
      fields[name] = data.toString("utf8");
    }
  }

  return { fields, files };
}

function splitBuffer(buffer, separator) {
  const parts = [];
  let start = 0;
  let index = buffer.indexOf(separator, start);
  while (index !== -1) {
    parts.push(buffer.subarray(start, index));
    start = index + separator.length;
    index = buffer.indexOf(separator, start);
  }
  parts.push(buffer.subarray(start));
  return parts;
}

function runProductImportScript(args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("python3", [resolve(__dirname, "scripts/product_import_admin.py"), ...args], {
      cwd: __dirname
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code !== 0) {
        return rejectPromise(new Error(stderr || stdout || `product import script exited with ${code}`));
      }
      try {
        resolvePromise(JSON.parse(stdout));
      } catch (error) {
        rejectPromise(new Error(`import 결과 JSON 해석 실패: ${stdout || stderr}`));
      }
    });
  });
}

function sanitizeFileSegment(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/[\\/:"*?<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "upload";
}

function formatTimestampForFile() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join("") + "_" + [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join("");
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(text);
}

async function loadDotEnv() {
  const envPath = resolve(__dirname, ".env");
  if (!existsSync(envPath)) return;

  const file = await readFile(envPath, "utf8");
  for (const line of file.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
