# Project maintenance

- This repository is the canonical source of 小红薯顺滑刷. Read the current default branch before editing.
- Preserve the original homepage. Refresh a dedicated video page only after an explicit user action.
- Do not restore automatic scrolling or background feed refresh without a new user request.
- Validate changes with `node --test tests/*.test.cjs` and JavaScript syntax checks.
- Build the installable archive with `python3 scripts/package.py`. The manifest supplies the version.
- For a new release, update manifest.json, diagnostics.js, CHANGELOG.md and user documentation consistently; copy the built ZIP into downloads/ and update the README download link.
- Keep source code, icons, tests and build scripts in version control. Do not commit credentials, browser sessions or personal diagnostic records.
- Local tests simulate the DOM. Report real-browser validation separately and accurately.
