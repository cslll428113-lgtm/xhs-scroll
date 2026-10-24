"""Build an unpackable extension ZIP using only Python's standard library."""
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]


def build(root=ROOT):
    root = Path(root).resolve()
    manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
    version = manifest['version']
    if not re.fullmatch(r'\d+(?:\.\d+){0,3}', version):
        raise ValueError('Invalid extension version')
    paths = {'manifest.json', '使用说明.txt'}
    for item in manifest.get('content_scripts', []):
        paths.update(item.get('js', []))
        paths.update(item.get('css', []))
    paths.update(manifest.get('icons', {}).values())
    worker = manifest.get('background', {}).get('service_worker')
    if worker:
        paths.add(worker)
    for name in paths:
        path = (root / name).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise ValueError(f'Missing or unsafe extension file: {name}')
    output = root / 'dist' / f'xhs-scroll-v{version}.zip'
    output.parent.mkdir(exist_ok=True)
    with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
        for name in sorted(paths):
            archive.write(root / name, 'xhs-scroll/' + name)
    return output


if __name__ == '__main__':
    print(build())
