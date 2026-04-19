#!/usr/bin/env bash
# Generates .pr-description.md with 6-element review page.
# Called by .husky/pre-push and /open-pr command.
# Usage: bash scripts/generate-pr-description.sh [--skip-review-page]
set -euo pipefail

# Load local env (gitignored) so CHROMATIC_PROJECT_TOKEN etc. are available
[ -f .env.local ] && set -a && source .env.local && set +a

if [ "${1:-}" = "--skip-review-page" ]; then
  exit 0
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
# Sanitize: lowercase, / → -, collapse runs, truncate
BRANCH_SLUG=$(echo "$BRANCH" | tr '[:upper:]' '[:lower:]' | tr '/' '-' | sed 's/[^a-z0-9-]/-/g' | sed 's/-\+/-/g' | cut -c1-60)
OUTPUT_DIR="public/pr-previews/${BRANCH_SLUG}"
mkdir -p "$OUTPUT_DIR"

echo "▶ Generating PR review page for: $BRANCH"

# ── 1. Predicted Vercel preview URL ────────────────────────────────────────
PREVIEW_URL=""
if [ -f .vercel/project.json ]; then
  PROJECT_NAME=$(node -e "process.stdout.write(require('./.vercel/project.json').projectName || 'korabeland-com')" 2>/dev/null || echo "korabeland-com")
else
  PROJECT_NAME="korabeland-com"
fi
# Construct Vercel preview URL from project name + branch slug
PREVIEW_URL="https://${PROJECT_NAME}-git-${BRANCH_SLUG}-korabeland.vercel.app"
echo "  Preview URL (predicted): $PREVIEW_URL"

# ── 2. QR code ────────────────────────────────────────────────────────────
QR_FILE="${OUTPUT_DIR}/qr.png"
node - << QREOF
const QRCode = require('qrcode');
QRCode.toFile('${QR_FILE}', '${PREVIEW_URL}', { type: 'png', width: 200, margin: 2 }, (err) => {
  if (err) process.stderr.write('QR generation failed: ' + err.message + '\n');
  else process.stderr.write('  QR code written to ${QR_FILE}\n');
});
QREOF

# ── 3. Build site ──────────────────────────────────────────────────────────
echo "▶ Building site..."
pnpm build 2>&1 | tail -5

# ── 4. Start preview server ───────────────────────────────────────────────
echo "▶ Starting preview server..."
PORT=4321 node scripts/static-preview.mjs &
SERVER_PID=$!
# Poll until ready (up to 30s)
READY=0
for i in $(seq 1 30); do
  if curl -sf http://localhost:4321 >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done
if [ "$READY" -eq 0 ]; then
  echo "  ⚠ Preview server did not start — skipping screenshots"
fi

# ── 5. Screenshots ────────────────────────────────────────────────────────
if [ "$READY" -eq 1 ]; then
  echo "▶ Taking screenshots (3 routes × 4 viewports)..."
  node scripts/pr-screenshots.mjs "$OUTPUT_DIR" 2>&1 || echo "  ⚠ Screenshots failed — continuing"
fi

# ── 6. Kill preview server ────────────────────────────────────────────────
kill "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true

# ── 7. Commit screenshots to branch ──────────────────────────────────────
if ls "${OUTPUT_DIR}"/*.png >/dev/null 2>&1; then
  git add "${OUTPUT_DIR}/"
  if ! git diff --cached --quiet; then
    git commit --no-verify -m "chore(pr): screenshots for ${BRANCH}" \
      --author="pr-bot <pr-bot@korabeland.com>"
    echo "  Screenshots committed to branch"
  fi
fi

# ── 8. Chromatic ──────────────────────────────────────────────────────────
# Chromatic runs in CI (not locally) to avoid a path-spaces bug in
# @chromatic-com/playwright on macOS. The CI step posts results to the
# Chromatic project; we link to the project dashboard here.
CHROMATIC_BUILD_URL="https://www.chromatic.com/builds?appId=chpt_c027017076d4f90"

# ── 9. Lighthouse ─────────────────────────────────────────────────────────
echo "▶ Running Lighthouse..."
pnpm run audit 2>/dev/null || true
LHCI_REPORT=$(ls .lighthouseci/lhr-*.json 2>/dev/null | sort | tail -1 || true)
PERF="—"; A11Y="—"; LCP="—"; CLS="—"
if [ -n "$LHCI_REPORT" ]; then
  PERF=$(node -e "const r=require('./${LHCI_REPORT}');process.stdout.write(Math.round(r.categories.performance.score*100)+'%')" 2>/dev/null || echo "—")
  A11Y=$(node -e "const r=require('./${LHCI_REPORT}');process.stdout.write(Math.round(r.categories.accessibility.score*100)+'%')" 2>/dev/null || echo "—")
  LCP=$(node -e "const r=require('./${LHCI_REPORT}');const a=r.audits['largest-contentful-paint'];process.stdout.write(a?a.displayValue:'—')" 2>/dev/null || echo "—")
  CLS=$(node -e "const r=require('./${LHCI_REPORT}');const a=r.audits['cumulative-layout-shift'];process.stdout.write(a?a.displayValue:'—')" 2>/dev/null || echo "—")
fi

# ── 10. Claude summary ────────────────────────────────────────────────────
SUMMARY="*(summary unavailable)*"
if command -v claude >/dev/null 2>&1; then
  echo "▶ Generating summary with Claude..."
  {
    git log "origin/main..HEAD" --oneline 2>/dev/null
    echo ""
    git diff "origin/main..HEAD" --stat 2>/dev/null
  } > /tmp/pr-commits.txt
  if [ -s /tmp/pr-commits.txt ]; then
    SUMMARY=$(claude -p "Summarize these git commits for a PR reviewer in 2-3 sentences. Be specific about what changed visually or functionally. Skip implementation details." \
      --model claude-haiku-4-5-20251001 < /tmp/pr-commits.txt 2>/dev/null || echo "*(summary unavailable)*")
  fi
fi

# ── 11. Assemble .pr-description.md ──────────────────────────────────────
echo "▶ Assembling .pr-description.md..."

# Screenshot table
ROUTES_PATHS=("/" "/colophon" "/off-trail")
ROUTES_SLUGS=("home" "colophon" "off-trail")
VIEWPORTS=("375" "768" "1280" "1920")

SCREENSHOT_TABLE="| Route | 375px | 768px | 1280px | 1920px |
|---|---|---|---|---|"

for i in "${!ROUTES_PATHS[@]}"; do
  ROUTE="${ROUTES_PATHS[$i]}"
  SLUG="${ROUTES_SLUGS[$i]}"
  ROW="| \`${ROUTE}\`"
  for VP in "${VIEWPORTS[@]}"; do
    IMG="${OUTPUT_DIR}/${SLUG}-${VP}.png"
    if [ -f "$IMG" ]; then
      IMG_URL="${PREVIEW_URL}/pr-previews/${BRANCH_SLUG}/${SLUG}-${VP}.png"
      ROW="${ROW} | ![\`${VP}\`]($IMG_URL)"
    else
      ROW="${ROW} | —"
    fi
  done
  SCREENSHOT_TABLE="${SCREENSHOT_TABLE}
${ROW} |"
done

QR_SECTION=""
if [ -f "$QR_FILE" ]; then
  QR_SECTION="![QR Code — scan to open preview on mobile](${PREVIEW_URL}/pr-previews/${BRANCH_SLUG}/qr.png)"
fi

CHROMATIC_SECTION="[View visual diff on Chromatic →]($CHROMATIC_BUILD_URL) *(CI posts the build after push)*"

cat > .pr-description.md << EOF
## Preview

**[Open preview →]($PREVIEW_URL)**

$QR_SECTION

---

## Screenshots

$SCREENSHOT_TABLE

---

## Visual diff

$CHROMATIC_SECTION

---

## Performance

| Metric | Score |
|---|---|
| Performance | $PERF |
| Accessibility | $A11Y |
| LCP | $LCP |
| CLS | $CLS |

---

## Summary

$SUMMARY
EOF

echo "✓ .pr-description.md ready"
