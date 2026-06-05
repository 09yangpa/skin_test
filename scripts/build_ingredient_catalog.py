#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

KCIA_PDF_URL = "https://kcia.or.kr/cid/files/%ED%91%9C%EC%A4%80%ED%99%94%EB%AA%85%EC%B9%AD%EB%AA%A9%EB%A1%9D"
KCIA_SOURCE_DATE = "2026-04-30"
COSING_SEARCH_URL = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
COSING_API_KEY = "285a77fd-1257-4271-8507-f0c6b2961203"

BENEFIT_TAGS = {"hydration", "barrier", "soothing", "oil_control", "brightening", "texture", "anti_aging"}
CAUTION_TAGS = {"fragrance", "acid_exfoliant", "retinoid", "essential_oil", "heavy_oil"}

COSING_FUNCTION_RULES = {
    "HUMECTANT": [("hydration", "benefit", 0.95)],
    "SKIN CONDITIONING - HUMECTANT": [("hydration", "benefit", 0.95)],
    "SKIN PROTECTING": [("barrier", "benefit", 0.88)],
    "EMOLLIENT": [("barrier", "benefit", 0.82)],
    "SKIN CONDITIONING": [("barrier", "benefit", 0.58)],
    "ANTIOXIDANT": [("anti_aging", "benefit", 0.7), ("brightening", "benefit", 0.5)],
    "ASTRINGENT": [("oil_control", "benefit", 0.65)],
    "ABSORBENT": [("oil_control", "benefit", 0.62)],
    "KERATOLYTIC": [("texture", "benefit", 0.82), ("acid_exfoliant", "caution", 0.72)],
    "EXFOLIANT": [("texture", "benefit", 0.82), ("acid_exfoliant", "caution", 0.72)],
    "PERFUMING": [("fragrance", "caution", 0.9)],
    "FRAGRANCE": [("fragrance", "caution", 0.95)],
    "DEODORANT": [("fragrance", "caution", 0.45)],
}

NAME_RULES = [
    (r"글리세린|글라이콜|히알루론|하이알루론|하이알루로네이트|베타인|트레할로오스|우레아|Glycerin|Glycol|Hyaluron|Betaine|Trehalose|Urea", "hydration", "benefit", 0.9, "보습 관련 키워드"),
    (r"판테놀|세라마이드|스쿠알란|시어버터|콜레스테롤|피토스테롤|트라이글리세라이드|트리글리세라이드|Panthenol|Ceramide|Squalane|Shea|Cholesterol|Phytosterol|Triglyceride", "barrier", "benefit", 0.86, "장벽 관련 키워드"),
    (r"판테놀|알란토인|병풀|마데카|카모마일|마트리카리아|감초|토코페롤|Allantoin|Centella|Madecass|Chamomile|Glycyrrhiza|Tocopherol", "soothing", "benefit", 0.78, "진정 관련 키워드"),
    (r"나이아신아마이드|징크|카올린|녹차|티트리|Niacinamide|Zinc|Kaolin|Green Tea|Tea Tree", "oil_control", "benefit", 0.78, "피지/모공 관련 키워드"),
    (r"나이아신아마이드|아스코|비타민C|토코페롤|Niacinamide|Ascorb|Vitamin C|Tocopherol", "brightening", "benefit", 0.72, "톤 균일감 관련 키워드"),
    (r"락틱애씨드|시트릭애씨드|글라이콜릭|살리실릭|만델릭|Lactic Acid|Citric Acid|Glycolic|Salicylic|Mandelic", "texture", "benefit", 0.76, "피부결 관련 키워드"),
    (r"레티놀|레티노|펩타이드|아데노신|콜라겐|Retinol|Retino|Peptide|Adenosine|Collagen", "anti_aging", "benefit", 0.82, "탄력 관련 키워드"),
    (r"향료|리모넨|리날룰|시트랄|제라니올|시트로넬올|벤질알코올|헥실신남알|아이오논|Fragrance|Parfum|Limonene|Linalool|Citral|Geraniol|Citronellol|Benzyl Alcohol|Ionone", "fragrance", "caution", 0.92, "향료/알러젠 키워드"),
    (r"락틱애씨드|시트릭애씨드|글라이콜릭|살리실릭|만델릭|Lactic Acid|Citric Acid|Glycolic|Salicylic|Mandelic", "acid_exfoliant", "caution", 0.78, "산/필링 성분 키워드"),
    (r"레티놀|레티노|레티닐|Retinol|Retino|Retinyl", "retinoid", "caution", 0.95, "레티노이드 키워드"),
    (r"오일|Oil|라벤더오일|티트리.*오일|페퍼민트.*오일|유칼립투스.*오일|Lavender Oil|Tea Tree Oil|Peppermint Oil|Eucalyptus Oil", "essential_oil", "caution", 0.65, "에센셜오일 가능성"),
    (r"미네랄오일|코코넛.*오일|올리브.*오일|마카다미아.*오일|Mineral Oil|Coconut Oil|Olive Oil|Macadamia Oil", "heavy_oil", "caution", 0.72, "무거운 오일감 키워드"),
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def normalize_name(value: str) -> str:
    value = str(value or "").strip()
    value = value.replace("，", ",").replace("ㆍ", "/")
    value = re.sub(r"\s+", "", value)
    value = value.replace("·", "").replace("ㆍ", "")
    return value.casefold()


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def split_aliases(value: str) -> List[str]:
    if not value:
        return []
    parts = re.split(r"[|;,]", value)
    return [clean_text(part) for part in parts if clean_text(part)]


def json_array(value: Any) -> List[Any]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except Exception:
        return []
    return parsed if isinstance(parsed, list) else []


def download_kcia_pdf(pdf_path: Path) -> None:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(
        KCIA_PDF_URL,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://kcia.or.kr/cid/main/",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        data = response.read()
    if not data.startswith(b"%PDF"):
        raise RuntimeError("Downloaded KCIA file is not a PDF. The source page may have changed.")
    pdf_path.write_bytes(data)


def append_cell(previous: str, addition: str, joiner: str) -> str:
    addition = clean_text(addition)
    if not addition:
        return previous
    if not previous:
        return addition
    return f"{previous}{joiner}{addition}".strip()


def parse_kcia_pdf(pdf_path: Path) -> List[Dict[str, Any]]:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("pypdf is required. Use the bundled workspace Python or install pypdf.") from exc

    reader = PdfReader(str(pdf_path))
    records: List[Dict[str, Any]] = []

    for page in reader.pages:
        text = page.extract_text(extraction_mode="layout") or ""
        header = next((line for line in text.splitlines() if "성분코드" in line and "표준 성분명" in line), "")
        if not header:
            continue
        english_start = header.find("표준 영문명")
        old_korean_start = header.find("구명칭")
        old_english_start = header.find("구영문명")
        if min(english_start, old_korean_start, old_english_start) < 0:
            continue
        # The PDF centers header labels inside each table column. Actual row text starts
        # earlier, so column boundaries are more reliable at the midpoints between labels.
        korean_end = (header.find("표준 성분명") + english_start) // 2
        english_end = (english_start + old_korean_start) // 2
        old_korean_end = (old_korean_start + old_english_start) // 2

        current: Optional[Dict[str, Any]] = None
        for line in text.splitlines():
            if not line.strip() or "성분코드" in line or "성분사전" in line or "기준" in line:
                continue

            match = re.match(r"^\s*(\d{1,6})\s+", line)
            if match:
                if current:
                    records.append(current)
                code = int(match.group(1))
                korean_start = match.end()
                current = {
                    "kcia_code": code,
                    "korean_name": clean_text(line[korean_start:korean_end]),
                    "inci_name": clean_text(line[korean_end:english_end]),
                    "old_korean_names": clean_text(line[english_end:old_korean_end]),
                    "old_inci_names": clean_text(line[old_korean_end:]),
                }
                continue

            if current:
                current["korean_name"] = append_cell(current["korean_name"], line[10:korean_end], "")
                current["inci_name"] = append_cell(current["inci_name"], line[korean_end:english_end], " ")
                current["old_korean_names"] = append_cell(current["old_korean_names"], line[english_end:old_korean_end], "")
                current["old_inci_names"] = append_cell(current["old_inci_names"], line[old_korean_end:], " ")

        if current:
            records.append(current)

    deduped: Dict[int, Dict[str, Any]] = {}
    for record in records:
        if record["kcia_code"] and record["korean_name"]:
            deduped[record["kcia_code"]] = record
    return [deduped[key] for key in sorted(deduped)]


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS ingredient_master (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          kcia_code INTEGER UNIQUE,
          korean_name TEXT NOT NULL,
          inci_name TEXT,
          old_korean_names TEXT NOT NULL DEFAULT '[]',
          old_inci_names TEXT NOT NULL DEFAULT '[]',
          source TEXT NOT NULL,
          source_date TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ingredient_alias (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ingredient_id INTEGER NOT NULL,
          alias_name TEXT NOT NULL,
          normalized_alias TEXT NOT NULL,
          alias_type TEXT NOT NULL,
          source TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(ingredient_id) REFERENCES ingredient_master(id) ON DELETE CASCADE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredient_alias_unique
          ON ingredient_alias(ingredient_id, normalized_alias, alias_type);
        CREATE INDEX IF NOT EXISTS idx_ingredient_alias_normalized
          ON ingredient_alias(normalized_alias);
        CREATE INDEX IF NOT EXISTS idx_ingredient_master_inci
          ON ingredient_master(inci_name);

        CREATE TABLE IF NOT EXISTS cosing_ingredient_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ingredient_id INTEGER NOT NULL,
          inci_name TEXT NOT NULL,
          cas_no TEXT NOT NULL DEFAULT '[]',
          ec_no TEXT NOT NULL DEFAULT '[]',
          chemical_description TEXT,
          functions TEXT NOT NULL DEFAULT '[]',
          status TEXT,
          perfuming TEXT,
          restrictions TEXT NOT NULL DEFAULT '[]',
          cosing_substance_id TEXT,
          raw_json TEXT NOT NULL,
          synced_at TEXT NOT NULL,
          FOREIGN KEY(ingredient_id) REFERENCES ingredient_master(id) ON DELETE CASCADE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_cosing_ingredient_unique
          ON cosing_ingredient_data(ingredient_id, inci_name);

        CREATE TABLE IF NOT EXISTS ingredient_roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ingredient_id INTEGER NOT NULL,
          role TEXT NOT NULL,
          skin_tag TEXT NOT NULL,
          effect_type TEXT NOT NULL,
          confidence REAL NOT NULL,
          reason TEXT,
          source TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(ingredient_id) REFERENCES ingredient_master(id) ON DELETE CASCADE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredient_roles_unique
          ON ingredient_roles(ingredient_id, skin_tag, effect_type, source, role);

        CREATE TABLE IF NOT EXISTS ingredient_regulations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ingredient_id INTEGER NOT NULL,
          country TEXT NOT NULL,
          status TEXT NOT NULL,
          restriction_text TEXT,
          source TEXT NOT NULL,
          synced_at TEXT NOT NULL,
          FOREIGN KEY(ingredient_id) REFERENCES ingredient_master(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS product_ingredient_matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_ingredient_id INTEGER NOT NULL UNIQUE,
          product_id INTEGER NOT NULL,
          raw_ingredient_name TEXT NOT NULL,
          normalized_raw_name TEXT NOT NULL,
          ingredient_id INTEGER NOT NULL,
          match_type TEXT NOT NULL,
          match_score REAL NOT NULL,
          matched_alias TEXT NOT NULL,
          ingredient_order INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(product_ingredient_id) REFERENCES product_ingredients(id) ON DELETE CASCADE,
          FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY(ingredient_id) REFERENCES ingredient_master(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_product_ingredient_matches_product
          ON product_ingredient_matches(product_id);
        CREATE INDEX IF NOT EXISTS idx_product_ingredient_matches_ingredient
          ON product_ingredient_matches(ingredient_id);

        CREATE TABLE IF NOT EXISTS ingredient_unmatched (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          raw_ingredient_name TEXT NOT NULL,
          normalized_raw_name TEXT NOT NULL UNIQUE,
          example_product_id INTEGER,
          product_count INTEGER NOT NULL DEFAULT 0,
          first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """
    )


def rebuild_kcia_master(conn: sqlite3.Connection, records: List[Dict[str, Any]]) -> None:
    conn.execute("DELETE FROM ingredient_alias")
    conn.execute("DELETE FROM ingredient_roles")
    conn.execute("DELETE FROM cosing_ingredient_data")
    conn.execute("DELETE FROM ingredient_regulations")
    conn.execute("DELETE FROM product_ingredient_matches")
    conn.execute("DELETE FROM ingredient_unmatched")
    conn.execute("DELETE FROM ingredient_master")

    for record in records:
        old_ko = split_aliases(record["old_korean_names"])
        old_en = split_aliases(record["old_inci_names"])
        cur = conn.execute(
            """
            INSERT INTO ingredient_master (
              kcia_code, korean_name, inci_name, old_korean_names, old_inci_names,
              source, source_date, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'KCIA', ?, ?)
            """,
            (
                record["kcia_code"],
                record["korean_name"],
                record["inci_name"],
                json.dumps(old_ko, ensure_ascii=False),
                json.dumps(old_en, ensure_ascii=False),
                KCIA_SOURCE_DATE,
                now_iso(),
            ),
        )
        ingredient_id = int(cur.lastrowid)
        aliases = [
            (record["korean_name"], "korean_standard"),
            (record["inci_name"], "inci_standard"),
            *[(alias, "korean_old") for alias in old_ko],
            *[(alias, "inci_old") for alias in old_en],
        ]
        for alias_name, alias_type in aliases:
            alias_name = clean_text(alias_name)
            normalized = normalize_name(alias_name)
            if not alias_name or not normalized:
                continue
            conn.execute(
                """
                INSERT OR IGNORE INTO ingredient_alias (
                  ingredient_id, alias_name, normalized_alias, alias_type, source
                ) VALUES (?, ?, ?, ?, 'KCIA')
                """,
                (ingredient_id, alias_name, normalized, alias_type),
            )


def query_cosing_exact(inci_name: str, timeout: int = 20) -> Optional[Dict[str, Any]]:
    inci_name = clean_text(inci_name).upper()
    if not inci_name:
        return None
    query = {
        "bool": {
            "must": [
                {"term": {"inciName": inci_name}},
                {"term": {"itemType": "ingredient"}},
            ]
        }
    }
    boundary = f"----skin-cosing-{uuid.uuid4().hex}"
    body = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="query"; filename="blob"\r\n'
        "Content-Type: application/json\r\n\r\n"
        f"{json.dumps(query)}\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")
    params = urllib.parse.urlencode({
        "apiKey": COSING_API_KEY,
        "text": "*",
        "pageSize": 5,
        "pageNumber": 1,
    })
    request = urllib.request.Request(
        f"{COSING_SEARCH_URL}?{params}",
        data=body,
        method="POST",
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "User-Agent": "Mozilla/5.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None

    for result in payload.get("results", []):
        metadata = result.get("metadata", {})
        names = [name.upper() for name in metadata.get("inciName", [])]
        glossary = [name.upper() for name in metadata.get("nameOfCommonIngredientsGlossary", [])]
        if inci_name in names or inci_name in glossary:
            return result
    return None


def first_value(metadata: Dict[str, Any], key: str) -> str:
    value = metadata.get(key, [])
    if isinstance(value, list):
        return clean_text(value[0]) if value else ""
    return clean_text(value)


def list_value(metadata: Dict[str, Any], key: str) -> List[str]:
    value = metadata.get(key, [])
    if isinstance(value, list):
        return [clean_text(item) for item in value if clean_text(item)]
    cleaned = clean_text(value)
    return [cleaned] if cleaned else []


def upsert_cosing_data(conn: sqlite3.Connection, ingredient_id: int, inci_name: str, result: Dict[str, Any]) -> None:
    metadata = result.get("metadata", {})
    conn.execute(
        """
        INSERT INTO cosing_ingredient_data (
          ingredient_id, inci_name, cas_no, ec_no, chemical_description, functions,
          status, perfuming, restrictions, cosing_substance_id, raw_json, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ingredient_id, inci_name) DO UPDATE SET
          cas_no = excluded.cas_no,
          ec_no = excluded.ec_no,
          chemical_description = excluded.chemical_description,
          functions = excluded.functions,
          status = excluded.status,
          perfuming = excluded.perfuming,
          restrictions = excluded.restrictions,
          cosing_substance_id = excluded.cosing_substance_id,
          raw_json = excluded.raw_json,
          synced_at = excluded.synced_at
        """,
        (
            ingredient_id,
            inci_name,
            json.dumps(list_value(metadata, "casNo"), ensure_ascii=False),
            json.dumps(list_value(metadata, "ecNo"), ensure_ascii=False),
            first_value(metadata, "chemicalDescription"),
            json.dumps(list_value(metadata, "functionName"), ensure_ascii=False),
            first_value(metadata, "status"),
            first_value(metadata, "perfuming"),
            json.dumps({
                "annexNo": list_value(metadata, "annexNo"),
                "cosmeticRestriction": list_value(metadata, "cosmeticRestriction"),
                "otherRestrictions": list_value(metadata, "otherRestrictions"),
                "maximumConcentration": list_value(metadata, "maximumConcentration"),
                "wordingOfConditions": list_value(metadata, "wordingOfConditions"),
            }, ensure_ascii=False),
            first_value(metadata, "substanceId"),
            json.dumps(result, ensure_ascii=False),
            now_iso(),
        ),
    )


def add_role(conn: sqlite3.Connection, ingredient_id: int, role: str, skin_tag: str, effect_type: str, confidence: float, reason: str, source: str) -> None:
    if effect_type == "benefit" and skin_tag not in BENEFIT_TAGS:
        return
    if effect_type == "caution" and skin_tag not in CAUTION_TAGS:
        return
    conn.execute(
        """
        INSERT OR IGNORE INTO ingredient_roles (
          ingredient_id, role, skin_tag, effect_type, confidence, reason, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (ingredient_id, role, skin_tag, effect_type, confidence, reason, source),
    )


def rebuild_roles(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM ingredient_roles")
    rows = conn.execute(
        """
        SELECT im.id, im.korean_name, im.inci_name, cd.functions
          FROM ingredient_master im
          LEFT JOIN cosing_ingredient_data cd ON cd.ingredient_id = im.id
        """
    ).fetchall()
    for row in rows:
        ingredient_id = int(row["id"])
        combined_name = f"{row['korean_name'] or ''} {row['inci_name'] or ''}"
        for function_name in json_array(row["functions"]):
            normalized_function = clean_text(function_name).upper()
            for skin_tag, effect_type, confidence in COSING_FUNCTION_RULES.get(normalized_function, []):
                add_role(
                    conn,
                    ingredient_id,
                    normalized_function,
                    skin_tag,
                    effect_type,
                    confidence,
                    f"CosIng function: {normalized_function}",
                    "CosIng",
                )
        for pattern, skin_tag, effect_type, confidence, reason in NAME_RULES:
            if re.search(pattern, combined_name, re.IGNORECASE):
                add_role(conn, ingredient_id, "name_keyword", skin_tag, effect_type, confidence, reason, "local_rule")


def enrich_cosing_for_used_ingredients(conn: sqlite3.Connection, limit: Optional[int], delay: float, timeout: int) -> Tuple[int, int]:
    rows = conn.execute(
        """
        SELECT im.id, im.inci_name, COUNT(*) AS used_count
          FROM ingredient_master im
          JOIN product_ingredient_matches pim ON pim.ingredient_id = im.id
         WHERE im.inci_name IS NOT NULL
           AND TRIM(im.inci_name) != ''
         GROUP BY im.id, im.inci_name
         ORDER BY used_count DESC, im.id
        """
    ).fetchall()
    if limit is not None:
        rows = rows[:limit]

    attempted = 0
    matched = 0
    for row in rows:
        ingredient_id = int(row["id"])
        inci_name = clean_text(row["inci_name"]).upper()
        if not inci_name:
            continue
        attempted += 1
        result = query_cosing_exact(inci_name, timeout=timeout)
        if result:
            upsert_cosing_data(conn, ingredient_id, inci_name, result)
            matched += 1
            conn.commit()
        if attempted % 25 == 0:
            print(f"CosIng progress: {attempted}/{len(rows)} attempted, {matched} matched", flush=True)
        if delay:
            time.sleep(delay)
    return attempted, matched


def match_product_ingredients(conn: sqlite3.Connection) -> Tuple[int, int]:
    alias_rows = conn.execute(
        "SELECT ingredient_id, alias_name, normalized_alias, alias_type FROM ingredient_alias"
    ).fetchall()
    alias_map: Dict[str, sqlite3.Row] = {}
    preferred = {
        "korean_standard": 5,
        "korean_old": 4,
        "inci_standard": 3,
        "inci_old": 2,
    }
    for row in alias_rows:
        key = row["normalized_alias"]
        current = alias_map.get(key)
        if current is None or preferred.get(row["alias_type"], 0) > preferred.get(current["alias_type"], 0):
            alias_map[key] = row

    product_rows = conn.execute(
        """
        SELECT id, product_id, ingredient_name, ingredient_order
          FROM product_ingredients
         ORDER BY product_id, ingredient_order
        """
    ).fetchall()

    conn.execute("DELETE FROM product_ingredient_matches")
    conn.execute("DELETE FROM ingredient_unmatched")
    matched = 0
    unmatched_by_key: Dict[str, Dict[str, Any]] = {}

    for row in product_rows:
        raw_name = clean_text(row["ingredient_name"])
        normalized = normalize_name(raw_name)
        alias = alias_map.get(normalized)
        if alias:
            matched += 1
            conn.execute(
                """
                INSERT OR REPLACE INTO product_ingredient_matches (
                  product_ingredient_id, product_id, raw_ingredient_name, normalized_raw_name,
                  ingredient_id, match_type, match_score, matched_alias, ingredient_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["id"],
                    row["product_id"],
                    raw_name,
                    normalized,
                    alias["ingredient_id"],
                    alias["alias_type"],
                    1.0,
                    alias["alias_name"],
                    row["ingredient_order"],
                ),
            )
        elif normalized:
            item = unmatched_by_key.setdefault(
                normalized,
                {
                    "raw_ingredient_name": raw_name,
                    "normalized_raw_name": normalized,
                    "example_product_id": row["product_id"],
                    "product_ids": set(),
                },
            )
            item["product_ids"].add(row["product_id"])

    for item in unmatched_by_key.values():
        conn.execute(
            """
            INSERT INTO ingredient_unmatched (
              raw_ingredient_name, normalized_raw_name, example_product_id,
              product_count, first_seen_at, last_seen_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                item["raw_ingredient_name"],
                item["normalized_raw_name"],
                item["example_product_id"],
                len(item["product_ids"]),
                now_iso(),
                now_iso(),
            ),
        )

    return matched, len(unmatched_by_key)


def update_product_tags(conn: sqlite3.Connection) -> None:
    products = conn.execute("SELECT id, benefit_tags, caution_tags FROM products").fetchall()
    for product in products:
        role_rows = conn.execute(
            """
            SELECT DISTINCT ir.skin_tag, ir.effect_type
              FROM product_ingredient_matches pim
              JOIN ingredient_roles ir ON ir.ingredient_id = pim.ingredient_id
             WHERE pim.product_id = ?
            """,
            (product["id"],),
        ).fetchall()
        benefit_tags = set(json_array(product["benefit_tags"]))
        caution_tags = set(json_array(product["caution_tags"]))
        for row in role_rows:
            if row["effect_type"] == "benefit":
                benefit_tags.add(row["skin_tag"])
            elif row["effect_type"] == "caution":
                caution_tags.add(row["skin_tag"])
        conn.execute(
            "UPDATE products SET benefit_tags = ?, caution_tags = ? WHERE id = ?",
            (
                json.dumps(sorted(tag for tag in benefit_tags if tag in BENEFIT_TAGS), ensure_ascii=False),
                json.dumps(sorted(tag for tag in caution_tags if tag in CAUTION_TAGS), ensure_ascii=False),
                product["id"],
            ),
        )


def write_reports(conn: sqlite3.Connection, report_dir: Path, extra: Dict[str, Any]) -> Dict[str, Any]:
    report_dir.mkdir(parents=True, exist_ok=True)
    summary = {
        **extra,
        "ingredient_master_count": conn.execute("SELECT COUNT(*) FROM ingredient_master").fetchone()[0],
        "ingredient_alias_count": conn.execute("SELECT COUNT(*) FROM ingredient_alias").fetchone()[0],
        "cosing_enriched_count": conn.execute("SELECT COUNT(*) FROM cosing_ingredient_data").fetchone()[0],
        "ingredient_role_count": conn.execute("SELECT COUNT(*) FROM ingredient_roles").fetchone()[0],
        "product_ingredient_count": conn.execute("SELECT COUNT(*) FROM product_ingredients").fetchone()[0],
        "matched_product_ingredient_count": conn.execute("SELECT COUNT(*) FROM product_ingredient_matches").fetchone()[0],
        "unmatched_unique_count": conn.execute("SELECT COUNT(*) FROM ingredient_unmatched").fetchone()[0],
    }
    (report_dir / "ingredient_catalog_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    unmatched_rows = conn.execute(
        """
        SELECT iu.raw_ingredient_name, iu.product_count, p.brand, p.product_name
          FROM ingredient_unmatched iu
          LEFT JOIN products p ON p.id = iu.example_product_id
         ORDER BY iu.product_count DESC, iu.raw_ingredient_name
        """
    ).fetchall()
    with (report_dir / "unmatched_ingredients.csv").open("w", encoding="utf-8-sig", newline="") as fp:
        writer = csv.writer(fp)
        writer.writerow(["raw_ingredient_name", "product_count", "example_brand", "example_product_name"])
        for row in unmatched_rows:
            writer.writerow([row["raw_ingredient_name"], row["product_count"], row["brand"], row["product_name"]])

    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local ingredient catalog and match product ingredients.")
    parser.add_argument("--db", default="data/products.db", help="SQLite DB path")
    parser.add_argument("--kcia-pdf", default="data/sources/kcia_standard_ingredient_names.pdf", help="KCIA standard ingredient names PDF path")
    parser.add_argument("--download-kcia", action="store_true", help="Download the latest KCIA PDF before parsing")
    parser.add_argument("--skip-cosing", action="store_true", help="Skip CosIng function enrichment")
    parser.add_argument("--cosing-limit", type=int, default=None, help="Limit CosIng API enrichment count for quick tests")
    parser.add_argument("--cosing-delay", type=float, default=0.08, help="Delay between CosIng API calls")
    parser.add_argument("--cosing-timeout", type=int, default=6, help="CosIng API timeout per ingredient")
    parser.add_argument("--report-dir", default="data/reports", help="Report output directory")
    args = parser.parse_args()

    db_path = Path(args.db)
    pdf_path = Path(args.kcia_pdf)
    if args.download_kcia or not pdf_path.exists() or not pdf_path.read_bytes().startswith(b"%PDF"):
        download_kcia_pdf(pdf_path)

    records = parse_kcia_pdf(pdf_path)
    if not records:
        raise RuntimeError("No KCIA ingredient records parsed.")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        ensure_schema(conn)
        rebuild_kcia_master(conn, records)
        matched_count, unmatched_count = match_product_ingredients(conn)
        conn.commit()
        cosing_attempted = 0
        cosing_matched = 0
        if not args.skip_cosing:
            cosing_attempted, cosing_matched = enrich_cosing_for_used_ingredients(
                conn,
                limit=args.cosing_limit,
                delay=args.cosing_delay,
                timeout=args.cosing_timeout,
            )
        rebuild_roles(conn)
        update_product_tags(conn)
        conn.commit()
        summary = write_reports(
            conn,
            Path(args.report_dir),
            {
                "kcia_source_date": KCIA_SOURCE_DATE,
                "kcia_records_parsed": len(records),
                "cosing_attempted": cosing_attempted,
                "cosing_matched": cosing_matched,
                "matched_count_before_roles": matched_count,
                "unmatched_count_before_roles": unmatched_count,
            },
        )
    finally:
        conn.close()

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
