#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import zipfile
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from xml.etree import ElementTree as ET

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

DEFAULT_SOURCES = [
    "/Users/hanseungyeup/Downloads/상품 리스트_키스킨.xlsx",
    "/Users/hanseungyeup/Downloads/상품리스트_온라인상품고시정보 및 POS등록_르누하.xlsx",
    "/Users/hanseungyeup/Downloads/상품리스트_온라인상품고시정보 및 POS등록_피지오더미.xlsx",
    "/Users/hanseungyeup/Downloads/상품리스트_온라인상품고시정보 및 POS등록_더캐스트 2026_시래.xlsx",
]

CATEGORY_PATTERNS = [
    ("cleanser", ["클렌저", "클렌징", "포밍", "폼", "cleansing", "cleanser"]),
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


def clean_cell(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def find_header(rows: List[List[str]]) -> Optional[Tuple[int, List[str]]]:
    for idx, row in enumerate(rows):
        joined = " ".join(row)
        if "상품명" in joined and "전성분" in joined:
            return idx, row
    return None


def find_col(headers: List[str], needles: Iterable[str]) -> Optional[int]:
    for needle in needles:
        for idx, header in enumerate(headers):
            if needle in clean_cell(header):
                return idx
    return None


def split_ingredients(raw: str) -> List[str]:
    value = raw.replace("\n", ",").replace("，", ",")
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


def detect_category(product_name: str) -> str:
    source = product_name.casefold()
    for category, keywords in CATEGORY_PATTERNS:
        if any(keyword.casefold() in source for keyword in keywords):
            return category
    return "etc"


def price_tier(price: int) -> str:
    if price <= 50000:
        return "low"
    if price <= 200000:
        return "mid"
    return "high"


def parse_price(value: str) -> int:
    digits = re.sub(r"[^0-9]", "", value or "")
    return int(digits) if digits else 0


def tags_for_ingredients(ingredients: List[str], rules: Dict[str, List[str]]) -> List[str]:
    joined = " ".join(ingredients)
    tags = []
    for tag, keywords in rules.items():
        if any(keyword in joined for keyword in keywords):
            tags.append(tag)
    return tags


def iter_products(paths: List[Path]) -> List[Dict[str, Any]]:
    products: List[Dict[str, Any]] = []
    for path in paths:
        if not path.exists():
            print(f"SKIP missing: {path}")
            continue
        with zipfile.ZipFile(path) as zf:
            shared_strings = load_shared_strings(zf)
            for sheet_name, sheet_path in workbook_sheets(zf):
                rows = read_sheet_rows(zf, sheet_path, shared_strings)
                header = find_header(rows)
                if not header:
                    continue
                header_idx, headers = header
                cols = {
                    "brand": find_col(headers, ["브랜드"]),
                    "code": find_col(headers, ["상품코드"]),
                    "name": find_col(headers, ["상품명"]),
                    "barcode": find_col(headers, ["바코드"]),
                    "volume": find_col(headers, ["용량"]),
                    "price": find_col(headers, ["소비자가", "가격"]),
                    "ingredients": find_col(headers, ["전성분"]),
                    "usage": find_col(headers, ["사용방법"]),
                    "caution": find_col(headers, ["사용 시", "주의사항"]),
                    "maker": find_col(headers, ["제조업자"]),
                    "country": find_col(headers, ["제조국"]),
                }
                if cols["name"] is None or cols["ingredients"] is None:
                    continue
                for row in rows[header_idx + 1:]:
                    def get(key: str) -> str:
                        idx = cols.get(key)
                        return clean_cell(row[idx]) if idx is not None and idx < len(row) else ""
                    name = get("name")
                    ingredients_raw = get("ingredients")
                    if not name or not ingredients_raw:
                        continue
                    ingredients = split_ingredients(ingredients_raw)
                    if not ingredients:
                        continue
                    price = parse_price(get("price"))
                    product = {
                        "brand": get("brand"),
                        "product_code": get("code"),
                        "product_name": name,
                        "barcode": get("barcode"),
                        "volume": get("volume"),
                        "price": price,
                        "price_tier": price_tier(price),
                        "category": detect_category(name),
                        "ingredients_raw": ingredients_raw,
                        "ingredients": ingredients,
                        "benefit_tags": tags_for_ingredients(ingredients, BENEFIT_RULES),
                        "caution_tags": tags_for_ingredients(ingredients, CAUTION_RULES),
                        "usage": get("usage"),
                        "caution_text": get("caution"),
                        "maker": get("maker"),
                        "country": get("country"),
                        "source_file": path.name,
                        "source_sheet": sheet_name,
                    }
                    products.append(product)
    return products


def rebuild_db(db_path: Path, products: List[Dict[str, Any]]) -> None:
    if db_path.exists():
        db_path.unlink()
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(
        """
        CREATE TABLE products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          brand TEXT NOT NULL,
          product_code TEXT,
          product_name TEXT NOT NULL,
          barcode TEXT,
          volume TEXT,
          price INTEGER NOT NULL DEFAULT 0,
          price_tier TEXT NOT NULL,
          category TEXT NOT NULL,
          ingredients_raw TEXT NOT NULL,
          benefit_tags TEXT NOT NULL,
          caution_tags TEXT NOT NULL,
          usage TEXT,
          caution_text TEXT,
          maker TEXT,
          country TEXT,
          source_file TEXT,
          source_sheet TEXT,
          recommendation_ready INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE product_ingredients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          ingredient_name TEXT NOT NULL,
          ingredient_order INTEGER NOT NULL,
          FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_products_brand ON products(brand);
        CREATE INDEX idx_products_category ON products(category);
        CREATE INDEX idx_products_price_tier ON products(price_tier);
        CREATE INDEX idx_product_ingredients_name ON product_ingredients(ingredient_name);
        """
    )
    for product in products:
        cur = conn.execute(
            """
            INSERT INTO products (
              brand, product_code, product_name, barcode, volume, price, price_tier, category,
              ingredients_raw, benefit_tags, caution_tags, usage, caution_text, maker, country,
              source_file, source_sheet, recommendation_ready
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (
                product["brand"], product["product_code"], product["product_name"], product["barcode"],
                product["volume"], product["price"], product["price_tier"], product["category"],
                product["ingredients_raw"], json.dumps(product["benefit_tags"], ensure_ascii=False),
                json.dumps(product["caution_tags"], ensure_ascii=False), product["usage"], product["caution_text"],
                product["maker"], product["country"], product["source_file"], product["source_sheet"],
            ),
        )
        product_id = cur.lastrowid
        conn.executemany(
            "INSERT INTO product_ingredients (product_id, ingredient_name, ingredient_order) VALUES (?, ?, ?)",
            [(product_id, ingredient, index + 1) for index, ingredient in enumerate(product["ingredients"])],
        )
    conn.commit()
    conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Import product Excel files with full ingredients into local SQLite DB.")
    parser.add_argument("--db", default="data/products.db", help="SQLite DB path")
    parser.add_argument("files", nargs="*", help="Excel files. Defaults to the current sample Downloads files.")
    args = parser.parse_args()

    sources = [Path(p) for p in (args.files or DEFAULT_SOURCES)]
    products = iter_products(sources)
    db_path = Path(args.db)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    rebuild_db(db_path, products)

    by_brand: Dict[str, int] = {}
    by_tier: Dict[str, int] = {}
    by_category: Dict[str, int] = {}
    for product in products:
        by_brand[product["brand"]] = by_brand.get(product["brand"], 0) + 1
        by_tier[product["price_tier"]] = by_tier.get(product["price_tier"], 0) + 1
        by_category[product["category"]] = by_category.get(product["category"], 0) + 1

    print(json.dumps({
        "db": str(db_path),
        "products_imported": len(products),
        "by_brand": by_brand,
        "by_price_tier": by_tier,
        "by_category": by_category,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
