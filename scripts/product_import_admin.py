#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
import sqlite3
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from xml.etree import ElementTree as ET

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from build_ingredient_catalog import ensure_schema as ensure_ingredient_schema
from build_ingredient_catalog import match_product_ingredients, rebuild_roles, update_product_tags, write_reports

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

CATEGORY_PATTERNS = [
    ("cleanser", ["클렌저", "클렌징", "포밍", "폼", "cleansing", "cleanser", "wash"]),
    ("toner", ["토너", "로션", "스킨", "toner", "lotion"]),
    ("serum", ["세럼", "앰플", "에센스", "프로그램", "serum", "ampoule", "essence", "program"]),
    ("cream", ["크림", "젤크림", "밤", "cream", "balm"]),
    ("mask", ["마스크", "팩", "mask", "pack"]),
    ("oil", ["오일", "oil"]),
    ("lip", ["립", "lip"]),
    ("body", ["레그", "배쓰", "바디", "leg", "bath", "body"]),
]

BENEFIT_RULES = {
    "hydration": ["글리세린", "부틸렌글라이콜", "프로필렌글라이콜", "히알루론", "하이알루론", "소듐하이알루로네이트", "트레할로오스", "베타인", "우레아"],
    "barrier": ["판테놀", "세라마이드", "스쿠알란", "시어버터", "콜레스테롤", "피토스테롤", "카프릴릭/카프릭트라이글리세라이드", "카프릴릭/카프릭트리글리세라이드"],
    "soothing": ["판테놀", "알란토인", "병풀", "마데카", "마트리카리아", "카모마일", "토코페롤", "감초", "글리시리자"],
    "oil_control": ["나이아신아마이드", "카올린", "징크", "녹차", "티트리", "살리실릭"],
    "brightening": ["나이아신아마이드", "아스코빅", "비타민C", "토코페롤", "마데카화이트"],
    "texture": ["락틱애씨드", "시트릭애씨드", "글라이콜릭", "살리실릭", "카올린"],
    "anti_aging": ["레티놀", "레티노", "펩타이드", "아데노신", "콜라겐", "하이드록시프롤린"],
}

CAUTION_RULES = {
    "fragrance": ["향료", "리모넨", "리날룰", "시트랄", "제라니올", "시트로넬올", "벤질알코올"],
    "acid_exfoliant": ["락틱애씨드", "시트릭애씨드", "글라이콜릭", "살리실릭", "만델릭"],
    "retinoid": ["레티놀", "레티노", "레티닐"],
    "essential_oil": ["오렌지껍질오일", "라벤더오일", "티트리잎오일", "페퍼민트오일", "유칼립투스오일"],
    "heavy_oil": ["미네랄오일", "코코넛야자오일", "올리브오일", "마카다미아씨오일"],
}

COLUMN_CANDIDATES = {
    "brand": ["브랜드", "브랜드명", "brand", "maker brand"],
    "product_code": ["상품코드", "제품코드", "품번", "코드", "sku", "product code"],
    "product_name": ["상품명", "제품명", "품명", "상품", "제품", "product name", "name"],
    "barcode": ["바코드", "barcode", "ean", "jan"],
    "volume": ["용량", "규격", "용량/규격", "중량", "내용량", "volume", "size", "ml"],
    "price": ["소비자가", "판매가", "정가", "가격", "price", "retail"],
    "ingredients_raw": ["전성분", "전 성분", "전체성분", "성분", "ingredients", "ingredient", "inci"],
    "usage": ["사용방법", "사용법", "용법", "how to use", "usage"],
    "caution_text": ["사용 시", "주의사항", "사용시주의사항", "주의", "caution", "warning"],
    "maker": ["제조업자", "제조사", "제조원", "manufacturer", "maker"],
    "country": ["제조국", "원산지", "국가", "country"],
}

REQUIRED_FIELDS = ["product_name", "ingredients_raw"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def clean_cell(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_header(value: str) -> str:
    return re.sub(r"[\s_\-/()\[\].:]+", "", clean_cell(value).casefold())


def col_to_index(cell_ref: str) -> int:
    letters = re.sub(r"[^A-Z]", "", cell_ref.upper())
    index = 0
    for char in letters:
        index = index * 26 + (ord(char) - ord("A") + 1)
    return index - 1


def read_text(node: Optional[ET.Element]) -> str:
    if node is None:
        return ""
    return "".join(node.itertext()).strip()


def load_shared_strings(zf: zipfile.ZipFile) -> List[str]:
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    return [read_text(si) for si in root.findall("main:si", NS)]


def workbook_sheets(zf: zipfile.ZipFile) -> List[Tuple[str, str]]:
    wb_root = ET.fromstring(zf.read("xl/workbook.xml"))
    rel_root = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rels = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rel_root.findall("pkgrel:Relationship", NS)}
    sheets = []
    for sheet in wb_root.findall("main:sheets/main:sheet", NS):
        name = sheet.attrib.get("name", "Sheet")
        rel_id = sheet.attrib.get(f"{{{NS['rel']}}}id")
        target = rels.get(rel_id or "", "")
        if target:
            sheets.append((name, "xl/" + target.lstrip("/")))
    return sheets


def read_sheet_rows(zf: zipfile.ZipFile, sheet_path: str, shared_strings: List[str]) -> List[List[str]]:
    root = ET.fromstring(zf.read(sheet_path))
    rows: List[List[str]] = []
    for row in root.findall(".//main:sheetData/main:row", NS):
        values: Dict[int, str] = {}
        for cell in row.findall("main:c", NS):
            ref = cell.attrib.get("r", "A1")
            idx = col_to_index(ref)
            cell_type = cell.attrib.get("t", "")
            value = ""
            if cell_type == "inlineStr":
                value = read_text(cell.find("main:is", NS))
            else:
                raw = read_text(cell.find("main:v", NS))
                if cell_type == "s" and raw.isdigit():
                    value = shared_strings[int(raw)] if int(raw) < len(shared_strings) else ""
                else:
                    value = raw
            values[idx] = clean_cell(value)
        if values:
            max_idx = max(values)
            rows.append([values.get(i, "") for i in range(max_idx + 1)])
    return rows


def read_csv_rows(path: Path) -> List[Tuple[str, List[List[str]]]]:
    raw = path.read_bytes()
    for encoding in ("utf-8-sig", "cp949", "utf-8"):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = raw.decode("utf-8", errors="replace")
    return [("CSV", [[clean_cell(cell) for cell in row] for row in csv.reader(text.splitlines())])]


def read_workbook(path: Path) -> List[Tuple[str, List[List[str]]]]:
    suffix = path.suffix.casefold()
    if suffix == ".csv":
        return read_csv_rows(path)
    if suffix != ".xlsx":
        raise ValueError("현재 첫 버전은 .xlsx와 .csv만 지원합니다. .xls는 xlsx로 저장 후 업로드해 주세요.")
    sheets: List[Tuple[str, List[List[str]]]] = []
    with zipfile.ZipFile(path) as zf:
        shared_strings = load_shared_strings(zf)
        for sheet_name, sheet_path in workbook_sheets(zf):
            sheets.append((sheet_name, read_sheet_rows(zf, sheet_path, shared_strings)))
    return sheets


def find_col(headers: List[str], field: str) -> Optional[int]:
    normalized_headers = [normalize_header(header) for header in headers]
    for candidate in COLUMN_CANDIDATES[field]:
        needle = normalize_header(candidate)
        for idx, header in enumerate(normalized_headers):
            if not header:
                continue
            if needle == header or needle in header or header in needle:
                return idx
    return None


def detect_mapping(headers: List[str]) -> Dict[str, Optional[int]]:
    return {field: find_col(headers, field) for field in COLUMN_CANDIDATES}


def mapping_score(mapping: Dict[str, Optional[int]]) -> int:
    score = 0
    if mapping.get("product_name") is not None:
        score += 5
    if mapping.get("ingredients_raw") is not None:
        score += 7
    if mapping.get("price") is not None:
        score += 2
    if mapping.get("volume") is not None:
        score += 2
    if mapping.get("barcode") is not None or mapping.get("product_code") is not None:
        score += 1
    return score


def find_best_sheet_and_header(sheets: List[Tuple[str, List[List[str]]]]) -> Tuple[str, int, List[str], Dict[str, Optional[int]]]:
    best: Optional[Tuple[int, str, int, List[str], Dict[str, Optional[int]]]] = None
    for sheet_name, rows in sheets:
        for idx, row in enumerate(rows[:40]):
            mapping = detect_mapping(row)
            score = mapping_score(mapping)
            non_empty = sum(1 for cell in row if clean_cell(cell))
            if non_empty < 2:
                continue
            candidate = (score, sheet_name, idx, row, mapping)
            if best is None or candidate[0] > best[0]:
                best = candidate
    if best is None or best[0] < 10:
        raise ValueError("상품명/전성분 컬럼을 자동으로 찾지 못했습니다. 엑셀 헤더명을 확인해 주세요.")
    _, sheet_name, header_idx, headers, mapping = best
    return sheet_name, header_idx, headers, mapping


def get_cell(row: List[str], idx: Optional[int]) -> str:
    if idx is None or idx >= len(row):
        return ""
    return clean_cell(row[idx])


def split_ingredients(raw: str) -> List[str]:
    value = raw.replace("\n", ",").replace("，", ",").replace("ㆍ", ",")
    parts = [clean_cell(part).strip(" ,") for part in value.split(",")]
    seen = set()
    result = []
    for part in parts:
        if not part:
            continue
        key = part.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(part)
    return result


def parse_price(value: str) -> int:
    digits = re.sub(r"[^0-9]", "", value or "")
    return int(digits) if digits else 0


def price_tier(price: int) -> str:
    if price <= 50000:
        return "low"
    if price <= 200000:
        return "mid"
    return "high"


def detect_category(product_name: str) -> str:
    source = product_name.casefold()
    for category, keywords in CATEGORY_PATTERNS:
        if any(keyword.casefold() in source for keyword in keywords):
            return category
    return "etc"


def tags_for_ingredients(ingredients: List[str], rules: Dict[str, List[str]]) -> List[str]:
    joined = " ".join(ingredients)
    tags = []
    for tag, keywords in rules.items():
        if any(keyword in joined for keyword in keywords):
            tags.append(tag)
    return tags


def parse_products(path: Path, default_brand: str) -> Dict[str, Any]:
    sheets = read_workbook(path)
    sheet_name, header_idx, headers, mapping = find_best_sheet_and_header(sheets)
    rows = dict(sheets)[sheet_name]
    products = []
    errors = []
    skipped_blank = 0

    for row_offset, row in enumerate(rows[header_idx + 1:], start=header_idx + 2):
        product_name = get_cell(row, mapping.get("product_name"))
        ingredients_raw = get_cell(row, mapping.get("ingredients_raw"))
        brand = get_cell(row, mapping.get("brand")) or default_brand
        if not any(clean_cell(cell) for cell in row):
            skipped_blank += 1
            continue
        if not product_name and not ingredients_raw:
            skipped_blank += 1
            continue
        row_errors = []
        if not product_name:
            row_errors.append("상품명 없음")
        if not ingredients_raw:
            row_errors.append("전성분 없음")
        ingredients = split_ingredients(ingredients_raw)
        if ingredients_raw and not ingredients:
            row_errors.append("전성분 분리 실패")

        price = parse_price(get_cell(row, mapping.get("price")))
        product = {
            "row_number": row_offset,
            "brand": brand,
            "product_code": get_cell(row, mapping.get("product_code")),
            "product_name": product_name,
            "barcode": get_cell(row, mapping.get("barcode")),
            "volume": get_cell(row, mapping.get("volume")),
            "price": price,
            "price_tier": price_tier(price),
            "category": detect_category(product_name),
            "ingredients_raw": ingredients_raw,
            "ingredients": ingredients,
            "ingredients_count": len(ingredients),
            "benefit_tags": tags_for_ingredients(ingredients, BENEFIT_RULES),
            "caution_tags": tags_for_ingredients(ingredients, CAUTION_RULES),
            "usage": get_cell(row, mapping.get("usage")),
            "caution_text": get_cell(row, mapping.get("caution_text")),
            "maker": get_cell(row, mapping.get("maker")),
            "country": get_cell(row, mapping.get("country")),
            "source_sheet": sheet_name,
            "status": "error" if row_errors else "ready",
            "error_message": ", ".join(row_errors),
            "raw_row": row,
        }
        products.append(product)
        for message in row_errors:
            errors.append({"row_number": row_offset, "field": "required", "message": message, "raw_row": row})

    return {
        "sheet_name": sheet_name,
        "header_idx": header_idx,
        "headers": headers,
        "mapping": mapping,
        "products": products,
        "errors": errors,
        "skipped_blank": skipped_blank,
    }


def ensure_import_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS import_batches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          brand TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          stored_path TEXT NOT NULL,
          status TEXT NOT NULL,
          sheet_name TEXT,
          header_row INTEGER,
          mapping_json TEXT NOT NULL DEFAULT '{}',
          total_rows INTEGER NOT NULL DEFAULT 0,
          products_detected INTEGER NOT NULL DEFAULT 0,
          ready_count INTEGER NOT NULL DEFAULT 0,
          missing_ingredients_count INTEGER NOT NULL DEFAULT 0,
          error_count INTEGER NOT NULL DEFAULT 0,
          imported_count INTEGER NOT NULL DEFAULT 0,
          updated_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          imported_at TEXT
        );

        CREATE TABLE IF NOT EXISTS product_import_staging (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          batch_id INTEGER NOT NULL,
          row_number INTEGER NOT NULL,
          brand TEXT NOT NULL,
          product_code TEXT,
          product_name TEXT NOT NULL,
          barcode TEXT,
          volume TEXT,
          price INTEGER NOT NULL DEFAULT 0,
          price_tier TEXT NOT NULL,
          category TEXT NOT NULL,
          ingredients_raw TEXT NOT NULL,
          ingredients_json TEXT NOT NULL DEFAULT '[]',
          ingredients_count INTEGER NOT NULL DEFAULT 0,
          benefit_tags TEXT NOT NULL DEFAULT '[]',
          caution_tags TEXT NOT NULL DEFAULT '[]',
          usage TEXT,
          caution_text TEXT,
          maker TEXT,
          country TEXT,
          source_sheet TEXT,
          status TEXT NOT NULL,
          error_message TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(batch_id) REFERENCES import_batches(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS product_import_errors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          batch_id INTEGER NOT NULL,
          row_number INTEGER,
          severity TEXT NOT NULL,
          field TEXT,
          message TEXT NOT NULL,
          raw_row_json TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(batch_id) REFERENCES import_batches(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);
        CREATE INDEX IF NOT EXISTS idx_product_import_staging_batch ON product_import_staging(batch_id);
        """
    )


def create_preview(conn: sqlite3.Connection, path: Path, brand: str, original_filename: str) -> Dict[str, Any]:
    ensure_import_schema(conn)
    parsed = parse_products(path, brand)
    products = parsed["products"]
    ready = [product for product in products if product["status"] == "ready"]
    missing_ingredients = [product for product in products if not product["ingredients_raw"]]
    cur = conn.execute(
        """
        INSERT INTO import_batches (
          brand, original_filename, stored_path, status, sheet_name, header_row, mapping_json,
          total_rows, products_detected, ready_count, missing_ingredients_count, error_count
        ) VALUES (?, ?, ?, 'previewed', ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            brand,
            original_filename,
            str(path),
            parsed["sheet_name"],
            parsed["header_idx"] + 1,
            json.dumps({
                "headers": parsed["headers"],
                "mapping": parsed["mapping"],
                "mappedLabels": mapping_labels(parsed["headers"], parsed["mapping"]),
            }, ensure_ascii=False),
            len(products),
            len(products),
            len(ready),
            len(missing_ingredients),
            len(parsed["errors"]),
        ),
    )
    batch_id = int(cur.lastrowid)

    for product in products:
        if not product["product_name"]:
            continue
        conn.execute(
            """
            INSERT INTO product_import_staging (
              batch_id, row_number, brand, product_code, product_name, barcode, volume,
              price, price_tier, category, ingredients_raw, ingredients_json, ingredients_count,
              benefit_tags, caution_tags, usage, caution_text, maker, country, source_sheet,
              status, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                batch_id,
                product["row_number"],
                product["brand"],
                product["product_code"],
                product["product_name"],
                product["barcode"],
                product["volume"],
                product["price"],
                product["price_tier"],
                product["category"],
                product["ingredients_raw"],
                json.dumps(product["ingredients"], ensure_ascii=False),
                product["ingredients_count"],
                json.dumps(product["benefit_tags"], ensure_ascii=False),
                json.dumps(product["caution_tags"], ensure_ascii=False),
                product["usage"],
                product["caution_text"],
                product["maker"],
                product["country"],
                product["source_sheet"],
                product["status"],
                product["error_message"],
            ),
        )

    for error in parsed["errors"]:
        conn.execute(
            """
            INSERT INTO product_import_errors (batch_id, row_number, severity, field, message, raw_row_json)
            VALUES (?, ?, 'error', ?, ?, ?)
            """,
            (batch_id, error["row_number"], error["field"], error["message"], json.dumps(error["raw_row"], ensure_ascii=False)),
        )

    conn.commit()
    return batch_summary(conn, batch_id)


def mapping_labels(headers: List[str], mapping: Dict[str, Optional[int]]) -> Dict[str, str]:
    labels = {}
    for field, idx in mapping.items():
        labels[field] = headers[idx] if idx is not None and idx < len(headers) else ""
    return labels


def json_array(value: str) -> List[str]:
    try:
        parsed = json.loads(value or "[]")
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def find_existing_product(conn: sqlite3.Connection, row: sqlite3.Row) -> Optional[int]:
    if row["barcode"]:
        found = conn.execute(
            "SELECT id FROM products WHERE brand = ? AND barcode = ? LIMIT 1",
            (row["brand"], row["barcode"]),
        ).fetchone()
        if found:
            return int(found["id"])
    if row["product_code"]:
        found = conn.execute(
            "SELECT id FROM products WHERE brand = ? AND product_code = ? LIMIT 1",
            (row["brand"], row["product_code"]),
        ).fetchone()
        if found:
            return int(found["id"])
    found = conn.execute(
        "SELECT id FROM products WHERE brand = ? AND product_name = ? LIMIT 1",
        (row["brand"], row["product_name"]),
    ).fetchone()
    return int(found["id"]) if found else None


def commit_batch(conn: sqlite3.Connection, batch_id: int) -> Dict[str, Any]:
    ensure_import_schema(conn)
    ensure_ingredient_schema(conn)
    batch = conn.execute("SELECT * FROM import_batches WHERE id = ?", (batch_id,)).fetchone()
    if not batch:
        raise ValueError(f"Import batch {batch_id} not found.")

    rows = conn.execute(
        "SELECT * FROM product_import_staging WHERE batch_id = ? AND status = 'ready' ORDER BY row_number",
        (batch_id,),
    ).fetchall()
    inserted = 0
    updated = 0
    touched_product_ids: List[int] = []

    for row in rows:
        existing_id = find_existing_product(conn, row)
        values = (
            row["brand"], row["product_code"], row["product_name"], row["barcode"], row["volume"],
            row["price"], row["price_tier"], row["category"], row["ingredients_raw"],
            row["benefit_tags"], row["caution_tags"], row["usage"], row["caution_text"],
            row["maker"], row["country"], batch["original_filename"], row["source_sheet"],
        )
        if existing_id:
            conn.execute(
                """
                UPDATE products
                   SET brand = ?, product_code = ?, product_name = ?, barcode = ?, volume = ?,
                       price = ?, price_tier = ?, category = ?, ingredients_raw = ?, benefit_tags = ?,
                       caution_tags = ?, usage = ?, caution_text = ?, maker = ?, country = ?,
                       source_file = ?, source_sheet = ?, recommendation_ready = 1
                 WHERE id = ?
                """,
                (*values, existing_id),
            )
            product_id = existing_id
            updated += 1
            conn.execute("DELETE FROM product_ingredients WHERE product_id = ?", (product_id,))
            conn.execute("DELETE FROM product_ingredient_matches WHERE product_id = ?", (product_id,))
        else:
            cur = conn.execute(
                """
                INSERT INTO products (
                  brand, product_code, product_name, barcode, volume, price, price_tier, category,
                  ingredients_raw, benefit_tags, caution_tags, usage, caution_text, maker, country,
                  source_file, source_sheet, recommendation_ready
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                """,
                values,
            )
            product_id = int(cur.lastrowid)
            inserted += 1

        ingredients = json_array(row["ingredients_json"])
        conn.executemany(
            "INSERT INTO product_ingredients (product_id, ingredient_name, ingredient_order) VALUES (?, ?, ?)",
            [(product_id, ingredient, index + 1) for index, ingredient in enumerate(ingredients)],
        )
        touched_product_ids.append(product_id)

    matched_count, unmatched_count = match_product_ingredients(conn)
    rebuild_roles(conn)
    update_product_tags(conn)
    conn.execute(
        """
        UPDATE import_batches
           SET status = 'imported', imported_count = ?, updated_count = ?, imported_at = ?
         WHERE id = ?
        """,
        (inserted, updated, now_iso(), batch_id),
    )
    conn.commit()
    report = write_reports(conn, Path("data/reports"), {
        "last_import_batch_id": batch_id,
        "inserted_count": inserted,
        "updated_count": updated,
        "matched_count_after_import": matched_count,
        "unmatched_count_after_import": unmatched_count,
    })
    summary = batch_summary(conn, batch_id)
    summary["insertedCount"] = inserted
    summary["updatedCount"] = updated
    summary["matchedIngredientCount"] = matched_count
    summary["unmatchedIngredientCount"] = unmatched_count
    summary["report"] = report
    summary["touchedProductIds"] = touched_product_ids[:20]
    return summary


def batch_summary(conn: sqlite3.Connection, batch_id: int) -> Dict[str, Any]:
    conn.row_factory = sqlite3.Row
    batch = conn.execute("SELECT * FROM import_batches WHERE id = ?", (batch_id,)).fetchone()
    if not batch:
        raise ValueError(f"Import batch {batch_id} not found.")
    mapping = json.loads(batch["mapping_json"] or "{}")
    preview_rows = conn.execute(
        """
        SELECT row_number, brand, product_name, price, price_tier, category, volume,
               ingredients_count, status, error_message
          FROM product_import_staging
         WHERE batch_id = ?
         ORDER BY row_number
         LIMIT 20
        """,
        (batch_id,),
    ).fetchall()
    errors = conn.execute(
        """
        SELECT row_number, field, message
          FROM product_import_errors
         WHERE batch_id = ?
         ORDER BY row_number
         LIMIT 20
        """,
        (batch_id,),
    ).fetchall()
    return {
        "batchId": batch["id"],
        "brand": batch["brand"],
        "originalFilename": batch["original_filename"],
        "status": batch["status"],
        "sheetName": batch["sheet_name"],
        "headerRow": batch["header_row"],
        "mapping": mapping,
        "totalRows": batch["total_rows"],
        "productsDetected": batch["products_detected"],
        "readyCount": batch["ready_count"],
        "missingIngredientsCount": batch["missing_ingredients_count"],
        "errorCount": batch["error_count"],
        "importedCount": batch["imported_count"],
        "updatedCount": batch["updated_count"],
        "previewRows": [dict(row) for row in preview_rows],
        "errors": [dict(row) for row in errors],
    }


def stats(conn: sqlite3.Connection) -> Dict[str, Any]:
    ensure_import_schema(conn)
    ensure_ingredient_schema(conn)
    def count(sql: str) -> int:
        return int(conn.execute(sql).fetchone()[0])
    recent = conn.execute(
        """
        SELECT id, brand, original_filename, status, products_detected, ready_count,
               imported_count, updated_count, created_at, imported_at
          FROM import_batches
         ORDER BY id DESC
         LIMIT 10
        """
    ).fetchall()
    return {
        "productCount": count("SELECT COUNT(*) FROM products WHERE recommendation_ready = 1"),
        "ingredientMasterCount": count("SELECT COUNT(*) FROM ingredient_master"),
        "matchedIngredientCount": count("SELECT COUNT(*) FROM product_ingredient_matches"),
        "unmatchedIngredientCount": count("SELECT COUNT(*) FROM ingredient_unmatched"),
        "recentBatches": [dict(row) for row in recent],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Preview and import brand product Excel files.")
    parser.add_argument("mode", choices=["preview", "commit", "stats"])
    parser.add_argument("--db", default="data/products.db")
    parser.add_argument("--file", default="")
    parser.add_argument("--brand", default="")
    parser.add_argument("--original-filename", default="")
    parser.add_argument("--batch-id", type=int, default=0)
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    try:
        if args.mode == "preview":
            if not args.file or not args.brand:
                raise ValueError("preview mode requires --file and --brand")
            result = create_preview(conn, Path(args.file), args.brand, args.original_filename or Path(args.file).name)
        elif args.mode == "commit":
            if not args.batch_id:
                raise ValueError("commit mode requires --batch-id")
            result = commit_batch(conn, args.batch_id)
        else:
            result = stats(conn)
    finally:
        conn.close()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
