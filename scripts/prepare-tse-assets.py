import csv
import io
import json
import re
import shutil
import sys
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "public" / "candidate-assets"
OFFICES = ("presidente", "senador", "deputado_federal")


def candidate_sq(candidate):
    if candidate.get("sq"):
        return str(candidate["sq"])
    match = re.search(r"SQ_CANDIDATO\s+(\d+)", candidate.get("source", ""))
    return match.group(1) if match else None


def parse_value(raw):
    value = (raw or "").strip()
    if not value:
        return None
    if "," in value:
        value = value.replace(".", "").replace(",", ".")
    try:
        return round(float(value), 2)
    except ValueError:
        return None


def main(archive_path):
    targets = defaultdict(set)
    sq_to_group = defaultdict(list)
    for office in OFFICES:
        for candidate_file in sorted((ROOT / "public" / "candidate-data" / office).glob("*.json")):
            uf = candidate_file.stem
            candidates = json.loads(candidate_file.read_text(encoding="utf-8"))
            for candidate in candidates:
                sq = candidate_sq(candidate)
                if not sq:
                    continue
                targets[(office, uf)].add(sq)
                sq_to_group[sq].append((office, uf))

    assets = {group: {sq: [] for sq in ids} for group, ids in targets.items()}
    with zipfile.ZipFile(archive_path) as archive:
        csv_names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if not csv_names:
            raise RuntimeError("The TSE archive contains no CSV file.")
        with archive.open(csv_names[0]) as binary:
            reader = csv.DictReader(io.TextIOWrapper(binary, encoding="latin-1", newline=""), delimiter=";")
            if not reader.fieldnames:
                raise RuntimeError("The TSE CSV has no header row.")
            reader.fieldnames = [name.lstrip("\ufeff").strip() for name in reader.fieldnames]
            required = {"SQ_CANDIDATO", "DS_BEM_CANDIDATO", "VR_BEM_CANDIDATO"}
            if not required.issubset(reader.fieldnames):
                raise RuntimeError("The TSE CSV is missing expected candidate asset columns.")
            for row in reader:
                sq = (row.get("SQ_CANDIDATO") or "").strip()
                for group in sq_to_group.get(sq, ()):
                    description = (row.get("DS_BEM_CANDIDATO") or "").strip()
                    kind = (row.get("DS_TIPO_BEM_CANDIDATO") or "").strip()
                    if kind and kind.lower() not in description.lower():
                        description = f"{kind} - {description}" if description else kind
                    assets[group][sq].append({
                        "description": description or "Declared asset",
                        "value": parse_value(row.get("VR_BEM_CANDIDATO")),
                    })

    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    generated_at = datetime.now(timezone.utc).isoformat()
    count = 0
    for (office, uf), candidates in assets.items():
        folder = OUTPUT / office
        folder.mkdir(parents=True, exist_ok=True)
        for items in candidates.values():
            count += len(items)
            items.sort(key=lambda item: item["value"] if item["value"] is not None else -1, reverse=True)
        payload = {
            "source": "TSE Open Data, candidate assets 2026",
            "generatedAt": generated_at,
            "candidates": candidates,
        }
        (folder / f"{uf}.json").write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Generated static asset data for {sum(map(len, targets.values()))} candidates ({count} assets).")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/prepare-tse-assets.py path/to/tse-assets.zip")
    main(sys.argv[1])

