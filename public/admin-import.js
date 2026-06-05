const form = document.getElementById("importForm");
const fileInput = document.getElementById("fileInput");
const fileLabel = document.getElementById("fileLabel");
const previewPanel = document.getElementById("previewPanel");
const commitPanel = document.getElementById("commitPanel");
const previewSummary = document.getElementById("previewSummary");
const previewMetrics = document.getElementById("previewMetrics");
const mappingGrid = document.getElementById("mappingGrid");
const previewTableBody = document.getElementById("previewTableBody");
const errorCard = document.getElementById("errorCard");
const errorList = document.getElementById("errorList");
const commitButton = document.getElementById("commitButton");
const commitSummary = document.getElementById("commitSummary");
const commitMetrics = document.getElementById("commitMetrics");
const refreshButton = document.getElementById("refreshButton");
const recentList = document.getElementById("recentList");
const toast = document.getElementById("toast");

let currentBatchId = null;

const fieldLabels = {
  brand: "브랜드",
  product_code: "상품코드",
  product_name: "상품명",
  barcode: "바코드",
  volume: "용량",
  price: "가격",
  ingredients_raw: "전성분",
  usage: "사용방법",
  caution_text: "주의사항",
  maker: "제조업자",
  country: "제조국"
};

init();

function init() {
  fileInput.addEventListener("change", () => {
    fileLabel.textContent = fileInput.files?.[0]?.name || "엑셀 파일 선택";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await previewImport();
  });

  commitButton.addEventListener("click", commitImport);
  refreshButton.addEventListener("click", loadStats);
  loadStats();
}

async function previewImport() {
  const formData = new FormData(form);
  if (!formData.get("brand") || !formData.get("file")) {
    showToast("브랜드와 파일을 모두 선택해 주세요.");
    return;
  }

  setBusy(true, "분석 중...");
  commitPanel.hidden = true;
  try {
    const response = await fetch("/api/product-import/preview", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "미리보기에 실패했습니다.");
    currentBatchId = data.batchId;
    renderPreview(data);
    await loadStats();
    showToast("엑셀 분석이 완료됐습니다.");
  } catch (error) {
    showToast(error.message || "미리보기 중 오류가 발생했습니다.");
  } finally {
    setBusy(false);
  }
}

async function commitImport() {
  if (!currentBatchId) return;
  commitButton.disabled = true;
  commitButton.textContent = "DB 반영 중...";
  try {
    const response = await fetch("/api/product-import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: currentBatchId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "DB 반영에 실패했습니다.");
    renderCommit(data);
    await loadStats();
    showToast("추천 DB 반영이 완료됐습니다.");
  } catch (error) {
    showToast(error.message || "DB 반영 중 오류가 발생했습니다.");
  } finally {
    commitButton.disabled = false;
    commitButton.textContent = "검수 후 DB 반영";
  }
}

async function loadStats() {
  try {
    const response = await fetch("/api/product-import/stats");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "상태 조회 실패");
    document.getElementById("productCount").textContent = formatNumber(data.productCount);
    document.getElementById("ingredientMasterCount").textContent = formatNumber(data.ingredientMasterCount);
    document.getElementById("matchedIngredientCount").textContent = formatNumber(data.matchedIngredientCount);
    document.getElementById("unmatchedIngredientCount").textContent = formatNumber(data.unmatchedIngredientCount);
    renderRecent(data.recentBatches || []);
  } catch (error) {
    showToast(error.message || "상태를 불러오지 못했습니다.");
  }
}

function renderPreview(data) {
  previewPanel.hidden = false;
  previewSummary.textContent = `${data.originalFilename} / ${data.sheetName} 시트의 ${data.productsDetected}개 상품 후보를 찾았습니다.`;
  previewMetrics.innerHTML = [
    metric("업로드 배치", `#${data.batchId}`),
    metric("인식 상품", formatNumber(data.productsDetected)),
    metric("DB 반영 가능", formatNumber(data.readyCount)),
    metric("확인 필요", formatNumber(data.errorCount)),
    metric("헤더 행", `${data.headerRow}행`)
  ].join("");

  const mappedLabels = data.mapping?.mappedLabels || {};
  mappingGrid.innerHTML = Object.keys(fieldLabels).map((field) => `
    <article class="mapping-item">
      <span>${escapeHtml(fieldLabels[field])}</span>
      <strong>${escapeHtml(mappedLabels[field] || "미감지")}</strong>
    </article>
  `).join("");

  previewTableBody.innerHTML = (data.previewRows || []).map((row) => `
    <tr>
      <td>${escapeHtml(row.row_number)}</td>
      <td>${escapeHtml(row.brand)}</td>
      <td>${escapeHtml(row.product_name)}</td>
      <td>${formatPrice(row.price)}</td>
      <td>${escapeHtml(row.category)}</td>
      <td>${escapeHtml(row.ingredients_count)}</td>
      <td><span class="status-pill ${row.status === "ready" ? "" : "error"}">${escapeHtml(row.status === "ready" ? "반영 가능" : row.error_message || "확인 필요")}</span></td>
    </tr>
  `).join("");

  if (data.errors?.length) {
    errorCard.hidden = false;
    errorList.innerHTML = data.errors.map((error) => `<li>${escapeHtml(error.row_number)}행: ${escapeHtml(error.message)}</li>`).join("");
  } else {
    errorCard.hidden = true;
    errorList.innerHTML = "";
  }
}

function renderCommit(data) {
  commitPanel.hidden = false;
  commitSummary.textContent = `${data.brand} 상품을 추천 DB에 반영했습니다. 기존 상품은 업데이트하고 신규 상품은 추가했습니다.`;
  commitMetrics.innerHTML = [
    metric("신규 추가", formatNumber(data.insertedCount || 0)),
    metric("기존 업데이트", formatNumber(data.updatedCount || 0)),
    metric("성분 매칭", formatNumber(data.matchedIngredientCount || 0)),
    metric("미분류 성분", formatNumber(data.unmatchedIngredientCount || 0))
  ].join("");
  commitPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRecent(items) {
  if (!items.length) {
    recentList.innerHTML = `<p>아직 업로드 기록이 없습니다.</p>`;
    return;
  }
  recentList.innerHTML = items.map((item) => `
    <article class="recent-item">
      <div>
        <strong>#${escapeHtml(item.id)} · ${escapeHtml(item.brand)} · ${escapeHtml(item.original_filename)}</strong>
        <small>${escapeHtml(item.status)} / 후보 ${formatNumber(item.products_detected)}개 / 반영 ${formatNumber(item.imported_count)}개 / 업데이트 ${formatNumber(item.updated_count)}개</small>
      </div>
      <small>${escapeHtml(item.imported_at || item.created_at || "")}</small>
    </article>
  `).join("");
}

function metric(label, value) {
  return `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function setBusy(isBusy, label = "자동 분석하기") {
  const button = document.getElementById("previewButton");
  button.disabled = isBusy;
  button.textContent = label;
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 3600);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function formatPrice(value) {
  const number = Number(value || 0);
  return number ? `${number.toLocaleString("ko-KR")}원` : "-";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
