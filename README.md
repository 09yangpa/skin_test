# Skin AI Local Modal

로컬에서 실행하는 채팅형 피부진단 웹페이지 + 모달 프로토타입입니다. 기존 `imsi/` 정적 프로토타입은 보존하고, 새 로컬 앱은 루트의 `server.js`와 `public/`에 분리했습니다.

## 실행

Node.js `22.5.0` 이상을 권장합니다. 이 앱은 로컬 SQLite 연결에 Node의 `node:sqlite` 모듈을 사용합니다.

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 다른 컴퓨터에서 로컬 실행

이 저장소는 코드만 공유하고, 실제 API 키와 상품 DB는 각 컴퓨터에서 따로 준비하는 방식이 안전합니다.

현재 컴퓨터에서 GitHub 저장소를 연결해 올릴 때:

```bash
git remote add origin https://github.com/YOUR_ID/YOUR_REPO.git
git branch -M main
git push -u origin main
```

다른 컴퓨터에서 받을 때:

```bash
git clone https://github.com/YOUR_ID/YOUR_REPO.git
cd YOUR_REPO
cp .env.example .env
npm run dev
```

`.env`에는 각 컴퓨터에서 직접 OpenAI API 키를 넣습니다. `.env` 파일은 git에 올라가지 않습니다.

```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
```

상품 추천 DB까지 같은 상태로 쓰려면 현재 컴퓨터의 `data/products.db`를 다른 컴퓨터의 같은 위치로 별도 복사합니다.

```text
data/products.db
```

DB를 복사하지 않아도 화면과 피부진단 API는 실행할 수 있지만, 기존 상품 전성분 기반 추천 데이터는 비어 있는 상태로 시작합니다. 다른 컴퓨터에서 관리자 화면(`/admin-import.html`)으로 엑셀을 다시 업로드해 DB를 새로 만들 수도 있습니다.

## 흐름

1. 랜딩 페이지에서 `채팅으로 진단하기`를 누릅니다.
2. 모달 안에서 AI 컨시어지가 성별, 나이대, 루틴 성향, 피부 상태 질문을 순서대로 묻습니다.
3. 사용자는 버튼 선택으로 답합니다.
4. 마지막에 얼굴 사진 1~3장을 업로드합니다.
5. 서버가 설문 답변과 사진을 OpenAI Responses API로 전달합니다.
6. 응답 JSON과 전성분 DB 기반 추천 제품/가격을 채팅 안의 결과 카드로 렌더링합니다.
7. 마지막에는 방송/프로모션 스케줄이 붙었을 때 알림을 받을 수 있는 설정 CTA를 보여줍니다.

## OpenAI 연결

브라우저에 API 키를 넣지 않습니다. 서버 환경변수로만 설정합니다.

```bash
cp .env.example .env
```

`.env`에 값을 넣습니다.

```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
```

키가 없으면 `/api/skin-diagnosis`는 데모 결과를 반환합니다. 키가 있으면 서버가 OpenAI Responses API에 사진과 설문을 전달하고 JSON 결과를 받아 화면에 렌더링합니다.

## 파일 구조

```text
server.js          # 정적 파일 서빙 + /api/skin-diagnosis OpenAI 프록시
public/index.html  # 실제 랜딩 페이지와 채팅형 피부진단 모달
public/styles.css  # 페이지/모달/채팅 스타일
public/app.js      # 채팅 질문 플로우, 사진 압축, API 호출, 결과 렌더링
imsi/              # 예전 정적 프로토타입 보존
```

## 주의

이 결과는 의료 진단이 아니라 화장품/스킨케어 추천을 위한 참고 정보입니다. 피부 질환이 의심되거나 통증, 염증, 심한 가려움이 지속되면 피부과 상담을 권장해야 합니다.

## Product Recommendation DB

전성분이 있는 브랜드 엑셀만 로컬 SQLite DB에 넣어 피부진단 후 상품 추천에 사용합니다.

```bash
python3 scripts/import_product_excels.py
```

기본 import 대상은 현재 테스트용 Downloads 파일입니다.

- 상품 리스트_키스킨.xlsx: 전성분 컬럼 없음, 자동 제외
- 상품리스트_온라인상품고시정보 및 POS등록_르누하.xlsx: 전성분 있는 행 import
- 상품리스트_온라인상품고시정보 및 POS등록_피지오더미.xlsx: 전성분 있는 행 import
- 상품리스트_온라인상품고시정보 및 POS등록_더캐스트 2026_시래.xlsx: 전성분 있는 행 import

생성 파일:

```text
data/products.db
```

현재 추천 엔진은 다음을 기준으로 점수를 계산합니다.

- 가점: 글리세린, 판테놀, 스쿠알란, 세라마이드, 히알루론산, 나이아신아마이드 등
- 감점/주의: 향료, 리모넨, 리날룰, 산/필링 성분, 레티노이드, 무거운 오일감 등
- 루틴 순서: 클렌저 → 토너/로션 → 세럼/앰플 → 크림/젤크림 → 주간 스페셜 케어
- 선택지: 부담 적은 시작, 데일리 밸런스, 집중 케어

피부진단 API 응답에는 `recommendations`가 포함됩니다.

나중에 구독서비스를 붙일 때는 고객 피부상태, 이전 발송 상품, 선호 브랜드, 가격대, 제외 성분을 별도 테이블로 저장하고 매월 중복을 피하는 추천 조합을 만들 수 있습니다.

## Product Excel Admin

브랜드별 엑셀 형식이 조금씩 달라도 화면에서 업로드해 미리보기 후 DB에 반영할 수 있습니다.

```text
http://localhost:3000/admin-import.html
```

관리자 화면 흐름:

1. 브랜드명을 입력합니다.
2. `.xlsx` 또는 `.csv` 상품 파일을 선택합니다.
3. `미리보기 분석`을 누르면 상품명, 가격, 용량, 전성분, 사용방법, 주의사항 컬럼을 자동 추정합니다.
4. 미리보기 결과가 맞으면 `검수 후 DB 반영`을 누릅니다.
5. 반영 후 전성분을 분리하고 대한화장품협회 표준 성분명 DB와 매칭한 뒤 추천 태그를 갱신합니다.

서버 API:

```text
POST /api/product-import/preview
POST /api/product-import/commit
GET  /api/product-import/stats
```

업로드한 원본 파일은 `data/imports/`에 저장되고, import 이력과 검수 데이터는 `data/products.db`의 `import_batches`, `product_import_staging`, `product_import_errors` 테이블에 남습니다.
