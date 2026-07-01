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
  const rawAnswers = payload.answers && typeof payload.answers === "object" ? payload.answers : {};
  const answers = normalizeSkinAnswers(rawAnswers);
  const images = Array.isArray(payload.images) ? payload.images.slice(0, 3) : [];
  const analysisSourceNote = buildPhotoAnalysisNote(images.length);

  if (!process.env.OPENAI_API_KEY) {
    const diagnosis = buildDemoDiagnosis(answers, images.length);
    diagnosis.skinMbtiType = calculateSkinMbtiType(answers, diagnosis);
    diagnosis.obnfType = calculateObnfType(answers, diagnosis);
    diagnosis.professionalReport = buildProfessionalSkinReport(answers, diagnosis, {
      imageCount: images.length,
      hasPhotoAnalysis: false,
      mode: "demo"
    });
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
    if (openAIResponse.status >= 500) {
      const diagnosis = buildDemoDiagnosis(answers, images.length);
      diagnosis.skinMbtiType = calculateSkinMbtiType(answers, diagnosis);
      diagnosis.obnfType = calculateObnfType(answers, diagnosis);
      diagnosis.professionalReport = buildProfessionalSkinReport(answers, diagnosis, {
        imageCount: images.length,
        hasPhotoAnalysis: false,
        mode: "demo_fallback"
      });
      return sendJson(response, 200, {
        mode: "demo_fallback",
        diagnosis,
        note: [
          analysisSourceNote,
          "OpenAI 응답이 일시적으로 실패해 로컬 추천 룰 기반 결과로 먼저 표시했습니다. 잠시 뒤 다시 진단하면 실제 OpenAI 분석으로 전환될 수 있습니다."
        ].join(" "),
        recommendations: await buildProductRecommendations(answers, diagnosis)
      });
    }
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
  diagnosis.skinMbtiType = calculateSkinMbtiType(answers, diagnosis);
  diagnosis.obnfType = calculateObnfType(answers, diagnosis);
  diagnosis.professionalReport = buildProfessionalSkinReport(answers, diagnosis, {
    imageCount: images.length,
    hasPhotoAnalysis: images.length > 0,
    mode: "openai"
  });

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
    "설문은 Q2 나이대에 따라 A코스(10대·20대: 피지 제어 및 트러블 집중 케어) 또는 B코스(30대 이상: 장벽 강화 및 안티에이징)로 분기됩니다.",
    "서버가 OSHS, DRBA, AGER, SENS 4가지 스킨케어 타입과 OBNF 코드를 별도로 병행 산출하므로, JSON 결과의 profileTitle, skinType, productDirection은 이 타입 체계와 충돌하지 않게 작성해줘.",
    "OSHS는 산뜻 촉촉 트러블 안심형, DRBA는 장벽 탄탄 속건조 해결형, AGER는 얼리 안티에이징 탄력 광채형, SENS는 초민감 장벽 보호형입니다.",
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

function normalizeSkinAnswers(rawAnswers = {}) {
  const answers = { ...rawAnswers };
  const ageRange = answers.ageRange || "";

  answers.ageCourse = answers.ageCourse || (/10대|20대/.test(ageRange) ? "A_10_20" : "B_30_50");
  answers.concern = answers.concern || answers.youngConcern || answers.matureConcern || "";
  answers.oilTiming = answers.oilTiming || deriveOilTiming(answers);
  answers.sensitivity = answers.sensitivity || deriveSensitivity(answers);
  answers.breakoutFrequency = answers.breakoutFrequency || deriveBreakoutFrequency(answers);
  answers.texture = answers.texture || deriveTexture(answers);
  answers.goal = answers.goal || deriveGoal(answers);
  answers.preferredTexture = answers.preferredTexture || derivePreferredTexture(answers);
  answers.routineTime = answers.routineTime || deriveRoutineTime(answers.routineStyle);
  answers.sunExposure = answers.sunExposure || "";
  answers.shavingMakeupIrritation = answers.shavingMakeupIrritation || "";

  return answers;
}

function deriveOilTiming(answers) {
  const text = `${answers.youngOilTiming || ""} ${answers.afterCleanse || ""}`;
  if (/오전/.test(text)) return "오전부터";
  if (/점심|오후/.test(text)) return "점심 이후";
  if (/T존/.test(text)) return "점심 이후";
  if (/전체.*번들|얼굴 전체.*번들/.test(text)) return "오전부터";
  if (/저녁|밤늦게|거의 없음|건조|당기/.test(text)) return "거의 없다";
  return "";
}

function deriveSensitivity(answers) {
  const text = `${answers.youngConcern || ""} ${answers.matureConcern || ""} ${answers.matureRecovery || ""} ${answers.afterCleanse || ""} ${answers.avoidPreference || ""}`;
  if (/예민|따가|붉|확 뒤집|회복이 느리/.test(text)) return "높음";
  if (/트러블|붉은 자국|컨디션|계절|강한 향|당기/.test(text)) return "보통";
  return "낮음";
}

function deriveBreakoutFrequency(answers) {
  const text = `${answers.youngConcern || ""} ${answers.matureConcern || ""}`;
  if (/갑작스러운 트러블/.test(text)) return "자주 올라온다";
  if (/피지|모공|예민|붉/.test(text)) return "컨디션에 따라";
  return "거의 없다";
}

function deriveTexture(answers) {
  const text = `${answers.youngConcern || ""} ${answers.matureConcern || ""} ${answers.afterCleanse || ""}`;
  if (/건조|속당김|당기/.test(text)) return "각질이 잘 뜬다";
  if (/칙칙|톤|잡티|기미|주름|탄력/.test(text)) return "오돌토돌하고 거칠다";
  return "크게 불편하지 않다";
}

function deriveGoal(answers) {
  const text = `${answers.youngConcern || ""} ${answers.matureConcern || ""} ${answers.matureRecovery || ""}`;
  if (/예민|따가|붉|트러블/.test(text)) return "진정";
  if (/탄력|주름|리프팅|회복/.test(text)) return "탄력/안티에이징";
  if (/잡티|기미|칙칙|톤|광채/.test(text)) return "톤 개선";
  if (/모공|피지|유분/.test(text)) return "피지 조절";
  if (/건조|속당김|수분/.test(text)) return "보습";
  return "진정";
}

function derivePreferredTexture(answers) {
  const text = `${answers.youngConcern || ""} ${answers.matureConcern || ""} ${answers.youngOilTiming || ""} ${answers.afterCleanse || ""} ${answers.avoidPreference || ""}`;
  if (/피지|모공|오전|점심|무겁|끈적|번들/.test(text)) return "가벼운 젤/로션";
  if (/건조|속당김|탄력|주름|장벽/.test(text)) return "리치한 크림";
  return "특별한 선호 없음";
}

function deriveRoutineTime(routineStyle = "") {
  if (/올인원/.test(routineStyle)) return "1분 이하";
  if (/미니멀/.test(routineStyle)) return "3분 정도";
  if (/베이직/.test(routineStyle)) return "5분 정도";
  if (/맥시멀/.test(routineStyle)) return "10분 이상도 가능";
  return "";
}

function buildDemoDiagnosis(answers, imageCount = 0) {
  const skinMbtiType = calculateSkinMbtiType(answers);
  const concern = answers.concern || "수분 밸런스";
  const sensitivity = answers.sensitivity || "보통";
  const hasPhotos = imageCount > 0;

  return {
    profileTitle: skinMbtiType.title,
    confidence: "medium",
    skinType: skinMbtiType.summary,
    visibleSignals: [
      hasPhotos
        ? "사진과 설문을 함께 보면 부위별 컨디션 차이가 있을 수 있습니다."
        : "사진이 없어 설문 응답을 기준으로 피부 컨디션을 추정합니다.",
      `선택한 코스와 주요 고민을 기준으로 ${skinMbtiType.code} 타입 가능성을 우선 반영합니다.`,
      "세안 후 느낌, 유분 패턴, 회복력 답변을 함께 보정해 루틴 방향을 정합니다."
    ],
    priorityConcerns: [concern, `${sensitivity} 민감도 관리`, skinMbtiType.code],
    routine: buildDemoRoutineByType(skinMbtiType.code, answers),
    ingredientFocus: ingredientFocusByType(skinMbtiType.code),
    avoidOrCaution: cautionFocusByType(skinMbtiType.code, answers),
    productDirection: productDirectionByType(skinMbtiType.code),
    storeVisitReason: "매장에서는 조명과 기기 측정으로 유분, 수분, 톤 편차를 더 정확히 확인할 수 있어 다음 제품 구성을 좁히기 좋습니다.",
    disclaimer: "이 결과는 의료 진단이 아닌 화장품 선택을 위한 참고용입니다. 통증, 심한 가려움, 염증이 지속되면 피부과 전문의 상담을 권장합니다."
  };
}

const skincareTypeDefinitions = {
  OSHS: {
    title: "산뜻 촉촉 트러블 안심형",
    summary: "피지와 트러블 신호가 두드러져 산뜻한 수분 밸런스가 중요한 타입",
    recommendedSolution: "과도한 피지 부담은 낮추고 수분은 채우는 산뜻한 수분 케어와 진정 성분을 우선 추천합니다."
  },
  DRBA: {
    title: "장벽 탄탄 속건조 해결형",
    summary: "세안 후 당김과 건조 신호가 커서 깊은 보습과 장벽 보완이 필요한 타입",
    recommendedSolution: "히알루론산처럼 수분을 끌어당기는 성분과 세라마이드, 판테놀 기반 장벽 케어를 우선 추천합니다."
  },
  AGER: {
    title: "얼리 안티에이징 탄력 광채형",
    summary: "피부 회복력, 탄력, 톤 균일감 고민을 함께 관리해야 하는 타입",
    recommendedSolution: "펩타이드, 아데노신, 나이아신아마이드 등 탄력과 광채 방향의 성분을 피부 반응에 맞춰 단계적으로 추천합니다."
  },
  SENS: {
    title: "초민감 장벽 보호형",
    summary: "붉어짐, 따가움, 계절성 뒤집힘처럼 장벽 반응이 예민한 타입",
    recommendedSolution: "성분 구성이 단순하고 향 부담이 낮은 시카, 판테놀 베이스 진정 케어를 우선 추천합니다."
  }
};

function calculateSkinMbtiType(rawAnswers = {}, diagnosis = {}) {
  const answers = normalizeSkinAnswers(rawAnswers);
  const text = [
    answers.gender,
    answers.ageRange,
    answers.ageCourse,
    answers.youngConcern,
    answers.youngOilTiming,
    answers.matureConcern,
    answers.matureRecovery,
    answers.afterCleanse,
    answers.routineStyle,
    answers.avoidPreference,
    answers.concern,
    answers.oilTiming,
    answers.sensitivity,
    answers.goal,
    diagnosis.profileTitle,
    diagnosis.skinType,
    ...(diagnosis.visibleSignals || []),
    ...(diagnosis.priorityConcerns || [])
  ].filter(Boolean).join(" ");

  const scores = {
    OSHS: 0,
    DRBA: 0,
    AGER: 0,
    SENS: 0
  };

  scores.OSHS += scoreIf(text, /10대|20대|A_10_20/, 10);
  scores.OSHS += scoreIf(text, /트러블|붉은 자국|모공|피지|유분|오전|점심|번들/, 34);
  scores.OSHS -= scoreIf(text, /극심한 건조|속당김|유분이 거의 없음|전체적으로 당기/, 10);

  scores.DRBA += scoreIf(text, /건조|속당김|당기|유분이 거의 없음|수분|장벽|리치한 크림/, 38);
  scores.DRBA += scoreIf(text, /세안 후 유독 심한|극심한 건조|전체적으로 당기/, 18);

  scores.AGER += scoreIf(text, /30대|40대|50대|B_30_50/, 14);
  scores.AGER += scoreIf(text, /탄력|주름|리프팅|회복이 느리|베개 자국|잡티|기미|칙칙|광채|톤/, 36);
  scores.AGER += scoreIf(text, /컨디션이나 계절/, 8);

  scores.SENS += scoreIf(text, /예민|따가|붉|민감|뒤집|강한 향|계절/, 40);
  scores.SENS += scoreIf(text, /높음|진정|장벽 보호/, 12);

  if (!Object.values(scores).some((score) => score > 0)) {
    scores.DRBA = 10;
  }

  const priority = ["SENS", "DRBA", "AGER", "OSHS"];
  const code = Object.keys(scores)
    .sort((left, right) => (scores[right] - scores[left]) || (priority.indexOf(left) - priority.indexOf(right)))[0];
  const definition = skincareTypeDefinitions[code];

  return {
    code,
    title: `${code} · ${definition.title}`,
    summary: definition.summary,
    recommendedSolution: definition.recommendedSolution,
    basis: "나이대 분기, 피부 특성, 주요 고민을 조합한 내부 스킨케어 타입 지표",
    matchedSignals: buildSkinMbtiSignals(code, answers, text),
    score: scores[code]
  };
}

function buildSkinMbtiSignals(code, answers, text) {
  const signals = [];
  if (/10대|20대/.test(answers.ageRange)) signals.push("10대·20대 A코스");
  if (/30대|40대|50대/.test(answers.ageRange)) signals.push("30대 이상 B코스");
  if (/피지|모공|오전|점심|번들/.test(text)) signals.push("피지/모공 신호");
  if (/건조|속당김|당기/.test(text)) signals.push("속건조/장벽 신호");
  if (/탄력|주름|회복|잡티|기미|톤/.test(text)) signals.push("탄력/광채 신호");
  if (/예민|따가|붉|뒤집|강한 향/.test(text)) signals.push("민감/진정 신호");
  signals.push(`${code} 추천 타입`);
  return dedupe(signals).slice(0, 5);
}

function buildDemoRoutineByType(code, answers = {}) {
  const compact = /올인원|미니멀/.test(answers.routineStyle || "");
  const baseMorning = compact
    ? ["약산성 클렌저 또는 물세안", "핵심 세럼", "보습제 겸 선케어"]
    : ["약산성 클렌저 또는 물세안", "토너/에센스", "핵심 세럼", "보습제", "자외선 차단제"];

  const typeEvening = {
    OSHS: ["저자극 클렌징", "피지 밸런스 세럼", "가벼운 수분 젤크림"],
    DRBA: ["저자극 클렌징", "수분 앰플", "장벽 보습 크림"],
    AGER: ["저자극 클렌징", "탄력/광채 세럼", "보습 탄력 크림"],
    SENS: ["저자극 클렌징", "진정 앰플", "장벽 보호 크림"]
  };

  return {
    morning: baseMorning,
    evening: typeEvening[code] || typeEvening.DRBA,
    weekly: code === "SENS"
      ? ["피부가 예민한 날은 기능성 제품 쉬기", "마찰이 큰 스크럽 피하기"]
      : ["주 1회 컨디션 보조 케어", "피부 반응을 보며 기능성 성분 단계적 도입"]
  };
}

function ingredientFocusByType(code) {
  return {
    OSHS: ["판테놀", "알란토인", "나이아신아마이드", "가벼운 보습 성분", "피지 밸런스 성분"],
    DRBA: ["히알루론산", "글리세린", "세라마이드", "판테놀", "스쿠알란"],
    AGER: ["펩타이드", "아데노신", "나이아신아마이드", "토코페롤", "세라마이드"],
    SENS: ["판테놀", "병풀 추출물", "알란토인", "세라마이드", "저자극 보습 성분"]
  }[code] || ["히알루론산", "판테놀", "세라마이드"];
}

function cautionFocusByType(code, answers = {}) {
  const base = [];
  if (answers.avoidPreference === "강한 향" || code === "SENS") base.push("향료와 에센셜오일이 강한 제품은 천천히 테스트");
  if (code === "OSHS") base.push("무겁고 답답한 오일감의 과한 레이어링");
  if (code === "DRBA") base.push("세안 직후 보습 없이 오래 방치하는 습관");
  if (code === "AGER") base.push("레티노이드와 산 성분을 같은 날 과하게 겹치는 루틴");
  if (code === "SENS") base.push("고함량 산 성분, 레티노이드, 스크럽처럼 자극이 큰 케어");
  return dedupe([...base, "새 제품은 팔 안쪽 또는 턱선에 먼저 소량 테스트"]).slice(0, 5);
}

function productDirectionByType(code) {
  return {
    OSHS: ["산뜻한 수분 세럼", "피지 밸런스 젤크림", "저자극 클렌저", "진정 앰플"],
    DRBA: ["수분 앰플", "장벽 보습 크림", "보습 토너", "저자극 클렌저"],
    AGER: ["탄력 세럼", "광채 앰플", "보습 탄력 크림", "데일리 선케어"],
    SENS: ["진정 앰플", "장벽 보호 크림", "향 부담 낮은 보습제", "저자극 클렌저"]
  }[code] || ["수분 세럼", "장벽 크림", "저자극 클렌저"];
}

function calculateObnfType(answers, diagnosis = {}) {
  const normalizedAnswers = normalizeSkinAnswers(answers);
  const text = [
    normalizedAnswers.gender,
    normalizedAnswers.ageRange,
    normalizedAnswers.ageCourse,
    normalizedAnswers.youngConcern,
    normalizedAnswers.youngOilTiming,
    normalizedAnswers.matureConcern,
    normalizedAnswers.matureRecovery,
    normalizedAnswers.afterCleanse,
    normalizedAnswers.oilTiming,
    normalizedAnswers.concern,
    normalizedAnswers.sensitivity,
    normalizedAnswers.breakoutFrequency,
    normalizedAnswers.texture,
    normalizedAnswers.shavingMakeupIrritation,
    normalizedAnswers.sunExposure,
    normalizedAnswers.preferredTexture,
    normalizedAnswers.avoidPreference,
    normalizedAnswers.goal,
    diagnosis.skinMbtiType?.code,
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
    + scoreIf(text, /칙칙함|칙칙한|톤 불균형|톤 개선|브라이트|미백|색소|자국|잡티|기미/, 32)
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
  answers = normalizeSkinAnswers(answers);
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
  const branchSignals = `${answers.youngConcern || ""} ${answers.youngOilTiming || ""} ${answers.matureConcern || ""} ${answers.matureRecovery || ""} ${answers.ageCourse || ""} ${diagnosis?.skinMbtiType?.code || ""}`;
  const concern = `${answers.concern || ""} ${branchSignals} ${diagnosis?.priorityConcerns?.join(" ") || ""}`;
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
  if (/탄력|주름|리프팅|회복이 느리|잡티|기미/.test(skinSignals)) {
    wantedBenefits.add("anti_aging");
    wantedBenefits.add("barrier");
    notes.push("탄력, 회복력, 광채 고민을 반영해 기능성 케어를 보조 가점으로 봅니다.");
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

function buildProfessionalSkinReport(rawAnswers = {}, diagnosis = {}, meta = {}) {
  const answers = normalizeSkinAnswers(rawAnswers);
  const text = [
    answers.gender,
    answers.ageRange,
    answers.ageCourse,
    answers.youngConcern,
    answers.youngOilTiming,
    answers.matureConcern,
    answers.matureRecovery,
    answers.afterCleanse,
    answers.routineStyle,
    answers.avoidPreference,
    answers.concern,
    answers.oilTiming,
    answers.sensitivity,
    answers.breakoutFrequency,
    answers.texture,
    answers.goal,
    diagnosis.profileTitle,
    diagnosis.skinType,
    ...(Array.isArray(diagnosis.visibleSignals) ? diagnosis.visibleSignals : []),
    ...(Array.isArray(diagnosis.priorityConcerns) ? diagnosis.priorityConcerns : []),
    ...(Array.isArray(diagnosis.ingredientFocus) ? diagnosis.ingredientFocus : []),
    ...(Array.isArray(diagnosis.avoidOrCaution) ? diagnosis.avoidOrCaution : [])
  ].filter(Boolean).join(" ");

  const attention = {
    pores: reportScore(22, text, [
      [/모공|피지|유분|번들|오전|점심|T존/, 42],
      [/10대|20대|A_10_20/, 8],
      [/건조|속당김|거의 없음/, -8]
    ]),
    texture: reportScore(20, text, [
      [/피부결|거칠|오돌토돌|각질|칙칙|메이크업/, 38],
      [/건조|속당김|장벽/, 14]
    ]),
    rednessSensitivity: reportScore(18, text, [
      [/붉|예민|민감|따갑|진정|강한 향|뒤집|계절/, 50],
      [/트러블|장벽/, 12]
    ]),
    oilSebum: reportScore(18, text, [
      [/피지|유분|번들|오전부터|얼굴 전체|T존|모공/, 52],
      [/건조|당김|유분이 거의 없음/, -14]
    ]),
    hydration: reportScore(16, text, [
      [/건조|속당김|당기|수분|보습|히알루론|글리세린|세라마이드/, 54],
      [/유분이 거의 없음|전체적으로 당기/, 12]
    ]),
    barrier: reportScore(18, text, [
      [/장벽|예민|민감|따갑|붉|회복이 느리|계절|강한 향|속당김/, 50]
    ]),
    pigmentationTone: reportScore(14, text, [
      [/색소|잡티|기미|칙칙|톤|광채|브라이트|나이아신아마이드|자국/, 48],
      [/30대|40대|50대/, 8]
    ]),
    firmnessLine: reportScore(12, text, [
      [/탄력|라인|리프팅|주름|회복|베개 자국|펩타이드|아데노신/, 52],
      [/40대|50대/, 16],
      [/30대/, 8],
      [/10대|20대/, -8]
    ]),
    wrinklePotential: reportScore(10, text, [
      [/주름|탄력|라인|건조|속당김|회복이 느리|50대/, 50],
      [/40대/, 18],
      [/30대/, 10]
    ]),
    breakoutPotential: reportScore(14, text, [
      [/트러블|여드름|피지|모공|붉은 자국|번들|오전/, 54],
      [/예민|장벽/, 8]
    ])
  };

  const averageAttention = Object.values(attention).reduce((sum, value) => sum + value, 0) / Object.keys(attention).length;
  const overallScore = clampScore(100 - averageAttention + (meta.imageCount ? 3 : -4));
  const topKeys = Object.keys(attention).sort((left, right) => attention[right] - attention[left]).slice(0, 3);
  const topLabels = topKeys.map((key) => professionalCategoryMeta[key].label);
  const hasPhotoAnalysis = Boolean(meta.hasPhotoAnalysis);
  const imageCount = Number(meta.imageCount || 0);

  return {
    version: "professional_report_v1",
    sourceNotice:
      "이 결과는 휴대폰 사진과 설문 답변을 바탕으로 한 AI 피부 컨디션 분석입니다. 전문 장비의 UV/수분/탄력 실측 결과가 아닌 화장품 추천 참고용 분석입니다.",
    overallScore: {
      score: overallScore,
      label: overallScore >= 76 ? "안정 관리권" : overallScore >= 58 ? "집중 관리권" : "우선 관리권",
      summary: `현재는 ${topLabels.join(", ")} 항목을 우선 관리하면 전체 컨디션을 가장 빠르게 정돈할 수 있습니다.`
    },
    conditionSummary: {
      headline: `${diagnosis.skinMbtiType?.code || "AI"} 타입 기반 ${topLabels[0] || "피부 컨디션"} 우선 리포트`,
      description: `${answers.ageRange || "선택 나이대"} ${answers.ageCourse === "A_10_20" ? "A코스" : "B코스"} 답변과 ${imageCount ? `사진 ${imageCount}장` : "설문"} 정보를 함께 정리했습니다.`,
      keyFindings: dedupe([
        ...(Array.isArray(diagnosis.priorityConcerns) ? diagnosis.priorityConcerns : []),
        ...topLabels,
        diagnosis.obnfType?.code ? `OBNF ${diagnosis.obnfType.code}` : ""
      ]).slice(0, 6)
    },
    categoryAnalysis: Object.entries(professionalCategoryMeta).map(([key, metaItem]) =>
      buildProfessionalCategory(key, metaItem, attention[key], answers, diagnosis)
    ),
    zoneObservations: buildZoneObservations(attention, answers, diagnosis, { imageCount }),
    photoReliability: {
      level: hasPhotoAnalysis ? (imageCount >= 3 ? "상" : "중") : "설문 중심",
      score: hasPhotoAnalysis ? clampScore(58 + imageCount * 12) : 42,
      imageCount,
      summary: hasPhotoAnalysis
        ? `업로드된 사진 ${imageCount}장을 참고했습니다. 조명과 각도 차이가 있을 수 있어 설문 답변으로 보정했습니다.`
        : "사진이 없어 설문 답변과 피부 고민 패턴을 기준으로 분석했습니다.",
      limitations: [
        "UV 색소침착, 포피린, 실제 수분량, 탄력 실측값은 전문 장비 없이 단정하지 않습니다.",
        "조명, 화장 여부, 카메라 보정, 촬영 각도에 따라 시각 신호가 달라질 수 있습니다."
      ]
    },
    surveyAdjustment: buildSurveyAdjustments(answers, diagnosis),
    cautionIngredients: buildProfessionalIngredientCautions(answers, diagnosis),
    recommendedIngredients: dedupe([
      ...(Array.isArray(diagnosis.ingredientFocus) ? diagnosis.ingredientFocus : []),
      ...ingredientFocusByType(diagnosis.skinMbtiType?.code || "DRBA")
    ]).slice(0, 8),
    routineGuide: {
      morning: Array.isArray(diagnosis.routine?.morning) ? diagnosis.routine.morning : [],
      evening: Array.isArray(diagnosis.routine?.evening) ? diagnosis.routine.evening : [],
      weekly: Array.isArray(diagnosis.routine?.weekly) ? diagnosis.routine.weekly : []
    },
    productRecommendationReason:
      "추천 제품은 전성분 DB의 보습, 장벽, 진정, 피지, 탄력, 톤 관련 태그와 현재 관리 우선도를 조합해 후보화합니다.",
    disclaimer:
      "의료 진단이 아닌 화장품 추천 참고용 분석입니다. 통증, 심한 염증, 가려움이 지속되면 피부과 전문의 상담을 권장합니다."
  };
}

const professionalCategoryMeta = {
  pores: {
    label: "모공",
    low: "모공 부담은 낮게 보입니다.",
    mid: "T존과 볼 주변 모공 변화를 꾸준히 관찰해 주세요.",
    high: "피지와 모공이 함께 두드러질 수 있어 산뜻한 피지 밸런스 케어가 필요합니다.",
    care: "무거운 오일막보다 가벼운 수분 세럼과 저자극 클렌징을 우선하세요."
  },
  texture: {
    label: "피부결",
    low: "피부결 거침 신호는 크지 않습니다.",
    mid: "건조나 각질 때문에 표면 결이 거칠어 보일 수 있습니다.",
    high: "각질, 건조, 컨디션 저하로 피부결 정돈이 우선입니다.",
    care: "과한 스크럽보다 수분 유지와 장벽 보습을 먼저 잡아주세요."
  },
  rednessSensitivity: {
    label: "홍조/민감",
    low: "붉어짐과 민감 반응은 낮은 편으로 봅니다.",
    mid: "컨디션에 따라 붉어짐이나 따가움이 생길 수 있습니다.",
    high: "홍조와 민감 신호가 높아 진정과 장벽 보호가 핵심입니다.",
    care: "향료, 에센셜오일, 고함량 산 성분은 천천히 테스트하세요."
  },
  oilSebum: {
    label: "유분/피지 경향",
    low: "피지보다 수분 유지가 더 중요한 상태로 보입니다.",
    mid: "오후 유분과 건조가 함께 나타나는 복합 패턴일 수 있습니다.",
    high: "유분이 빠르게 올라오는 패턴으로 피지 밸런스가 필요합니다.",
    care: "번들거림을 줄이되 보습을 빼지 않는 산뜻한 수분 루틴이 좋습니다."
  },
  hydration: {
    label: "수분 부족 신호",
    low: "수분 부족 신호는 낮게 보입니다.",
    mid: "세안 후 당김이나 컨디션별 속건조를 관리해 주세요.",
    high: "속당김과 건조 신호가 커서 수분 공급과 밀폐 보습이 필요합니다.",
    care: "히알루론산, 글리세린, 세라마이드, 판테놀 계열을 우선하세요."
  },
  barrier: {
    label: "장벽 컨디션",
    low: "장벽 부담은 비교적 안정적으로 봅니다.",
    mid: "계절과 컨디션에 따라 장벽 반응이 흔들릴 수 있습니다.",
    high: "장벽 부담이 높아 기능성보다 회복 루틴이 먼저입니다.",
    care: "클렌징 강도를 낮추고 판테놀, 세라마이드 중심으로 단순화하세요."
  },
  pigmentationTone: {
    label: "색소/톤 균일도",
    low: "톤 균일도 관련 우선도는 낮은 편입니다.",
    mid: "칙칙함이나 자국이 누적되지 않도록 선케어와 브라이트닝을 연결하세요.",
    high: "잡티, 자국, 칙칙함 관리 우선도가 높습니다.",
    care: "나이아신아마이드와 데일리 선케어를 함께 보는 것이 좋습니다."
  },
  firmnessLine: {
    label: "탄력/라인",
    low: "탄력은 예방 관리 중심으로 충분합니다.",
    mid: "회복력과 라인 변화를 가볍게 관리하기 좋은 단계입니다.",
    high: "탄력 저하와 라인 고민을 보습 장벽과 함께 관리해야 합니다.",
    care: "펩타이드, 아데노신, 세라마이드 기반 탄력 보습을 추천합니다."
  },
  wrinklePotential: {
    label: "주름 가능성",
    low: "주름 가능성은 예방 관리 중심으로 봅니다.",
    mid: "건조와 표정 라인으로 잔주름이 도드라질 수 있습니다.",
    high: "건조, 탄력 저하, 회복력 답변상 주름 관리 우선도가 높습니다.",
    care: "자극적인 고함량보다 보습 탄력 루틴을 꾸준히 연결하세요."
  },
  breakoutPotential: {
    label: "트러블 가능성",
    low: "트러블 가능성은 낮은 편으로 봅니다.",
    mid: "피지와 장벽 컨디션에 따라 트러블이 반복될 수 있습니다.",
    high: "피지, 붉은 자국, 트러블 답변상 진정 케어가 필요합니다.",
    care: "논코메도제닉에 가까운 산뜻한 제형과 진정 성분을 우선하세요."
  }
};

function buildProfessionalCategory(key, metaItem, score, answers, diagnosis) {
  const level = score >= 66 ? "높음" : score >= 38 ? "보통" : "낮음";
  return {
    key,
    label: metaItem.label,
    score,
    level,
    summary: score >= 66 ? metaItem.high : score >= 38 ? metaItem.mid : metaItem.low,
    evidence: buildCategoryEvidence(key, answers, diagnosis).slice(0, 3),
    recommendation: metaItem.care
  };
}

function buildCategoryEvidence(key, answers, diagnosis) {
  const evidence = [];
  const add = (condition, text) => {
    if (condition) evidence.push(text);
  };
  add(Boolean(answers.youngConcern || answers.matureConcern), `주요 고민: ${answers.youngConcern || answers.matureConcern}`);
  add(Boolean(answers.afterCleanse), `세안 후 느낌: ${answers.afterCleanse}`);
  add(Boolean(answers.youngOilTiming), `유분 패턴: ${answers.youngOilTiming}`);
  add(Boolean(answers.matureRecovery), `회복력: ${answers.matureRecovery}`);
  add(Boolean(answers.avoidPreference && answers.avoidPreference !== "없음"), `피하고 싶은 특징: ${answers.avoidPreference}`);
  if (/firmnessLine|wrinklePotential|pigmentationTone/.test(key) && diagnosis.skinMbtiType?.code === "AGER") {
    evidence.push("AGER 타입 매칭");
  }
  if (/rednessSensitivity|barrier/.test(key) && diagnosis.skinMbtiType?.code === "SENS") {
    evidence.push("SENS 타입 매칭");
  }
  if (/pores|oilSebum|breakoutPotential/.test(key) && diagnosis.skinMbtiType?.code === "OSHS") {
    evidence.push("OSHS 타입 매칭");
  }
  if (/hydration|barrier|texture/.test(key) && diagnosis.skinMbtiType?.code === "DRBA") {
    evidence.push("DRBA 타입 매칭");
  }
  return dedupe(evidence);
}

function buildZoneObservations(attention, answers, diagnosis, meta = {}) {
  const noPhotoPrefix = meta.imageCount ? "" : "사진 미제공으로 ";
  const toneHigh = attention.pigmentationTone >= 50;
  const oilHigh = attention.oilSebum >= 50;
  const barrierHigh = attention.barrier >= 50;
  const lineHigh = attention.firmnessLine >= 50 || attention.wrinklePotential >= 50;
  return [
    {
      key: "forehead",
      label: "이마",
      level: oilHigh || lineHigh ? "관찰 필요" : "안정",
      observation: `${noPhotoPrefix}${oilHigh ? "번들거림과 모공성 유분 신호를 함께 봅니다." : "큰 유분 신호보다는 기본 보습 유지가 중요합니다."}`,
      care: lineHigh ? "표정 라인 부위는 보습 탄력 제품을 얇게 반복하세요." : "아침에는 가벼운 수분막과 선케어를 연결하세요."
    },
    {
      key: "tzone",
      label: "코/T존",
      level: oilHigh || attention.pores >= 50 ? "우선 관리" : "보통",
      observation: `${noPhotoPrefix}${oilHigh ? "피지와 모공 관리 우선도가 가장 높은 부위로 봅니다." : "과세안보다 유수분 균형 유지가 좋습니다."}`,
      care: "저자극 세안 후 산뜻한 수분 세럼으로 피지 보상 분비를 줄여주세요."
    },
    {
      key: "cheeks",
      label: "양 볼",
      level: barrierHigh || attention.hydration >= 50 ? "우선 관리" : "보통",
      observation: `${noPhotoPrefix}${barrierHigh ? "붉어짐, 속건조, 장벽 부담이 드러나기 쉬운 부위입니다." : "수분 유지와 톤 균일감을 함께 보면 좋습니다."}`,
      care: "판테놀, 세라마이드, 병풀 계열을 얇게 레이어링하세요."
    },
    {
      key: "mouthLine",
      label: "입가/팔자",
      level: lineHigh || attention.hydration >= 50 ? "관찰 필요" : "안정",
      observation: `${noPhotoPrefix}${lineHigh ? "건조와 탄력 저하가 겹치면 팔자 라인이 도드라져 보일 수 있습니다." : "건조 누적을 막는 예방 케어가 적합합니다."}`,
      care: "저녁에는 보습 크림을 한 번 더 덧발라 수분 증발을 줄여주세요."
    },
    {
      key: "jawline",
      label: "턱/라인",
      level: attention.breakoutPotential >= 50 || lineHigh ? "관찰 필요" : "보통",
      observation: `${noPhotoPrefix}${attention.breakoutPotential >= 50 ? "트러블과 마찰 반응을 함께 체크해야 하는 부위입니다." : "라인 탄력과 클렌징 잔여감을 함께 관리하세요."}`,
      care: "마찰이 큰 스크럽을 피하고 세안 잔여물이 남지 않게 정리하세요."
    }
  ];
}

function buildSurveyAdjustments(answers, diagnosis) {
  return dedupe([
    answers.ageCourse === "A_10_20"
      ? "10대·20대 A코스 답변을 반영해 피지, 트러블, 산뜻한 사용감을 우선 보정했습니다."
      : "30대 이상 B코스 답변을 반영해 장벽, 탄력, 회복력 관점을 우선 보정했습니다.",
    answers.routineStyle ? `루틴 성향(${answers.routineStyle})에 맞춰 제품 단계 수를 조절합니다.` : "",
    answers.avoidPreference && answers.avoidPreference !== "없음"
      ? `피하고 싶은 특징(${answers.avoidPreference})을 주의 성분 판단에 반영했습니다.`
      : "",
    diagnosis.skinMbtiType?.code ? `${diagnosis.skinMbtiType.code} 스킨케어 타입을 성분 추천 방향에 반영했습니다.` : "",
    diagnosis.obnfType?.code ? `${diagnosis.obnfType.code} OBNF 지표를 루틴 강도 조절에 반영했습니다.` : ""
  ]);
}

function buildProfessionalIngredientCautions(answers, diagnosis) {
  return dedupe([
    ...(Array.isArray(diagnosis.avoidOrCaution) ? diagnosis.avoidOrCaution : []),
    /예민|민감|붉|따갑|강한 향/.test(`${answers.sensitivity} ${answers.matureConcern} ${answers.avoidPreference}`) ? "향료" : "",
    /예민|민감|장벽|속당김/.test(`${answers.sensitivity} ${answers.afterCleanse} ${diagnosis.skinType}`) ? "고함량 산/필링 성분" : "",
    /탄력|주름|예민|장벽/.test(`${answers.goal} ${answers.matureConcern} ${diagnosis.skinType}`) ? "레티노이드 고빈도 사용" : "",
    /피지|모공|번들|트러블/.test(`${answers.concern} ${answers.youngOilTiming} ${answers.afterCleanse}`) ? "무거운 오일막 제형" : ""
  ]).slice(0, 6);
}

function reportScore(base, text, rules) {
  return clampScore(rules.reduce((score, [pattern, value]) => score + scoreIf(text, pattern, value), base));
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
