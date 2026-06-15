#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_SQLITE_DB = ROOT_DIR / "data/products.db"
DEFAULT_MONGO_DB = "castshop_gift_test"


COLLECTIONS = {
    "products": "skin_products",
    "product_ingredients": "skin_product_ingredients",
    "ingredient_master": "skin_ingredient_master",
    "ingredient_alias": "skin_ingredient_aliases",
    "ingredient_roles": "skin_ingredient_roles",
    "ingredient_regulations": "skin_ingredient_regulations",
    "cosing_ingredient_data": "skin_cosing_ingredient_data",
    "product_ingredient_matches": "skin_product_ingredient_matches",
    "ingredient_unmatched": "skin_ingredient_unmatched",
    "import_batches": "skin_import_batches",
    "product_import_staging": "skin_product_import_staging",
    "product_import_errors": "skin_product_import_errors",
}

JSON_FIELDS = {
    "benefit_tags",
    "caution_tags",
    "old_korean_names",
    "old_inci_names",
    "cas_no",
    "ec_no",
    "functions",
    "restrictions",
    "raw_json",
    "mapping_json",
    "ingredients_json",
    "raw_row_json",
}


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")
        os.environ.setdefault(key, value)


def camel_case(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def parse_json_value(value: Any, fallback: Any) -> Any:
    if value is None or value == "":
        return fallback
    if not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def row_to_doc(row: sqlite3.Row, table: str) -> Dict[str, Any]:
    doc: Dict[str, Any] = {
        "_id": int(row["id"]),
        "sqliteId": int(row["id"]),
        "migrationSource": "sqlite:data/products.db",
    }
    for key in row.keys():
        if key == "id":
            continue
        value = row[key]
        field = camel_case(key)
        if key in JSON_FIELDS:
            fallback = {} if key in {"raw_json", "mapping_json"} else []
            value = parse_json_value(value, fallback)
        elif key == "recommendation_ready":
            value = bool(value)
        doc[field] = value
    doc["sourceTable"] = table
    return doc


def fetch_all(conn: sqlite3.Connection, sql: str, params: Iterable[Any] = ()) -> List[sqlite3.Row]:
    return list(conn.execute(sql, tuple(params)).fetchall())


def build_product_docs(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    products = fetch_all(conn, "SELECT * FROM products ORDER BY id")
    ingredient_rows = fetch_all(conn, "SELECT * FROM product_ingredients ORDER BY product_id, ingredient_order")
    match_rows = fetch_all(conn, "SELECT * FROM product_ingredient_matches ORDER BY product_id, ingredient_order")

    ingredients_by_product: Dict[int, List[Dict[str, Any]]] = {}
    for row in ingredient_rows:
        product_id = int(row["product_id"])
        ingredients_by_product.setdefault(product_id, []).append({
            "sqliteId": int(row["id"]),
            "name": row["ingredient_name"],
            "order": int(row["ingredient_order"]),
        })

    matches_by_product: Dict[int, List[Dict[str, Any]]] = {}
    for row in match_rows:
        product_id = int(row["product_id"])
        matches_by_product.setdefault(product_id, []).append({
            "sqliteId": int(row["id"]),
            "productIngredientId": int(row["product_ingredient_id"]),
            "ingredientId": int(row["ingredient_id"]),
            "rawIngredientName": row["raw_ingredient_name"],
            "normalizedRawName": row["normalized_raw_name"],
            "matchType": row["match_type"],
            "matchScore": float(row["match_score"]),
            "matchedAlias": row["matched_alias"],
            "order": int(row["ingredient_order"]),
        })

    docs = []
    for row in products:
        doc = row_to_doc(row, "products")
        ingredients = ingredients_by_product.get(int(row["id"]), [])
        matches = matches_by_product.get(int(row["id"]), [])
        doc["ingredients"] = ingredients
        doc["ingredientNames"] = [item["name"] for item in ingredients]
        doc["matchedIngredients"] = matches
        docs.append(doc)
    return docs


def build_generic_docs(conn: sqlite3.Connection, table: str) -> List[Dict[str, Any]]:
    return [row_to_doc(row, table) for row in fetch_all(conn, f"SELECT * FROM {table} ORDER BY id")]


def write_jsonl(path: Path, docs: Iterable[Dict[str, Any]]) -> int:
    count = 0
    with path.open("w", encoding="utf-8") as file:
        for doc in docs:
            file.write(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n")
            count += 1
    return count


def sanitize_output(text: str, uri: str) -> str:
    if not text:
        return ""
    redacted = text.replace(uri, "<MONGO_URI>")
    if "@" in uri:
        redacted = redacted.replace(uri.split("@", 1)[-1], "<MONGO_HOST>")
    return redacted.strip()


def run_command(command: List[str], mongo_uri: str) -> None:
    result = subprocess.run(command, text=True, capture_output=True)
    if result.returncode:
        stderr = sanitize_output(result.stderr, mongo_uri)
        stdout = sanitize_output(result.stdout, mongo_uri)
        raise RuntimeError(stderr or stdout or f"Command failed: {command[0]}")


def mongoimport_collection(mongo_uri: str, mongo_db: str, collection: str, file_path: Path) -> None:
    command = [
        "mongoimport",
        "--quiet",
        "--uri",
        mongo_uri,
        "--db",
        mongo_db,
        "--collection",
        collection,
        "--file",
        str(file_path),
        "--mode",
        "upsert",
        "--upsertFields",
        "_id",
    ]
    run_command(command, mongo_uri)


def create_indexes_and_run_doc(mongo_uri: str, mongo_db: str, summary: Dict[str, Any]) -> None:
    script = f"""
const targetDb = db.getSiblingDB({json.dumps(mongo_db)});
targetDb.skin_products.createIndex({{ brand: 1, productName: 1 }});
targetDb.skin_products.createIndex({{ category: 1, priceTier: 1 }});
targetDb.skin_products.createIndex({{ recommendationReady: 1 }});
targetDb.skin_products.createIndex({{ benefitTags: 1 }});
targetDb.skin_products.createIndex({{ cautionTags: 1 }});
targetDb.skin_ingredient_master.createIndex({{ koreanName: 1 }});
targetDb.skin_ingredient_master.createIndex({{ inciName: 1 }});
targetDb.skin_ingredient_aliases.createIndex({{ normalizedAlias: 1 }});
targetDb.skin_ingredient_aliases.createIndex({{ ingredientId: 1 }});
targetDb.skin_ingredient_roles.createIndex({{ ingredientId: 1, skinTag: 1 }});
targetDb.skin_product_ingredient_matches.createIndex({{ productId: 1 }});
targetDb.skin_product_ingredient_matches.createIndex({{ ingredientId: 1 }});
targetDb.skin_import_batches.createIndex({{ status: 1, createdAt: -1 }});
targetDb.skin_migration_runs.insertOne({json.dumps(summary, ensure_ascii=False)});
printjson({{ ok: true }});
"""
    with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as file:
        file.write(script)
        script_path = Path(file.name)
    try:
        run_command(["mongosh", mongo_uri, "--quiet", str(script_path)], mongo_uri)
    finally:
        script_path.unlink(missing_ok=True)


def verify_counts(mongo_uri: str, mongo_db: str) -> Dict[str, int]:
    script = f"""
const targetDb = db.getSiblingDB({json.dumps(mongo_db)});
const result = {{}};
for (const name of {json.dumps(list(COLLECTIONS.values()))}) {{
  result[name] = targetDb.getCollection(name).countDocuments();
}}
print(JSON.stringify(result));
"""
    with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as file:
        file.write(script)
        script_path = Path(file.name)
    try:
        result = subprocess.run(["mongosh", mongo_uri, "--quiet", str(script_path)], text=True, capture_output=True)
        if result.returncode:
            raise RuntimeError(sanitize_output(result.stderr or result.stdout, mongo_uri))
        lines = [line for line in result.stdout.splitlines() if line.strip().startswith("{")]
        return json.loads(lines[-1]) if lines else {}
    finally:
        script_path.unlink(missing_ok=True)


def migrate(sqlite_db: Path, mongo_uri: str, mongo_db: str) -> Dict[str, Any]:
    if not sqlite_db.exists():
        raise FileNotFoundError(f"SQLite DB not found: {sqlite_db}")
    if not shutil.which("mongoimport"):
        raise RuntimeError("mongoimport command not found.")
    if not shutil.which("mongosh"):
        raise RuntimeError("mongosh command not found.")

    conn = sqlite3.connect(sqlite_db)
    conn.row_factory = sqlite3.Row

    exported_counts: Dict[str, int] = {}
    imported_counts: Dict[str, int] = {}
    started_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    try:
        with tempfile.TemporaryDirectory(prefix="skin_mongo_migration_") as temp_dir:
            temp_path = Path(temp_dir)
            for table, collection in COLLECTIONS.items():
                docs = build_product_docs(conn) if table == "products" else build_generic_docs(conn, table)
                export_path = temp_path / f"{collection}.jsonl"
                exported_counts[collection] = write_jsonl(export_path, docs)
                mongoimport_collection(mongo_uri, mongo_db, collection, export_path)
                imported_counts[collection] = exported_counts[collection]
    finally:
        conn.close()

    finished_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    summary = {
        "source": str(sqlite_db),
        "targetDb": mongo_db,
        "collections": imported_counts,
        "startedAt": started_at,
        "finishedAt": finished_at,
        "status": "completed",
    }
    create_indexes_and_run_doc(mongo_uri, mongo_db, summary)
    summary["verifiedCounts"] = verify_counts(mongo_uri, mongo_db)
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate local skin test SQLite data to MongoDB.")
    parser.add_argument("--sqlite-db", default=str(DEFAULT_SQLITE_DB))
    parser.add_argument("--mongo-db", default=DEFAULT_MONGO_DB)
    parser.add_argument("--env-file", default=str(ROOT_DIR / ".env"))
    args = parser.parse_args()

    load_dotenv(Path(args.env_file))
    mongo_uri = os.environ.get("MONGO_URI") or os.environ.get("MONGODB_URI")
    if not mongo_uri:
        raise SystemExit("MONGO_URI or MONGODB_URI is required in .env.")

    summary = migrate(Path(args.sqlite_db), mongo_uri, args.mongo_db)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
