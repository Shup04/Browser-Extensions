"""Build or check the two installable ZIPs using only declared extension files."""

import argparse
import io
import json
from pathlib import Path
import subprocess
import zipfile


ROOT = Path(__file__).resolve().parents[1]
PACKAGES = {
    "FBSudgestedRemove": "FBRemover.zip",
    "YTShortsRemover": "YTShortsRemove.zip",
}


def package_bytes(directory):
    manifest = json.loads((directory / "manifest.json").read_text())
    if manifest.get("manifest_version") != 3:
        raise ValueError(f"{directory.name}: expected Manifest V3")
    files = {"manifest.json"}
    for entry in manifest["content_scripts"]:
        files.update(entry.get("js", []))
        files.update(entry.get("css", []))
    popup = manifest.get("action", {}).get("default_popup")
    if popup:
        files.add(popup)

    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        for name in sorted(files):
            path = directory / name
            if not path.is_file() or not path.resolve().is_relative_to(directory):
                raise ValueError(f"{directory.name}: missing or unsafe file {name!r}")
            if path.suffix == ".js":
                subprocess.run(["node", "--check", str(path)], check=True)
            # Fixed metadata and no compression make these tiny ZIPs reproducible
            # across Python/zlib versions, regardless of source file timestamps.
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes())
    return output.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="check without writing ZIPs")
    args = parser.parse_args()
    try:
        # Validate both packages before writing either one.
        packages = {
            ROOT / folder / name: package_bytes(ROOT / folder)
            for folder, name in PACKAGES.items()
        }
        for path, data in packages.items():
            if args.check:
                if not path.is_file() or path.read_bytes() != data:
                    raise ValueError(f"{path.relative_to(ROOT)} is stale; run npm run package")
            else:
                path.write_bytes(data)
            print(f"{'Checked' if args.check else 'Built'} {path.relative_to(ROOT)}")
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Packaging failed: {error}\n")


if __name__ == "__main__":
    main()
