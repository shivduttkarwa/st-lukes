#!/usr/bin/env bash
# Build, measure every page at 1640 and compare with Figma. Usage: bash .qa/audit.sh [summary|full] [page ...]
cd "$(dirname "$0")/.." || exit 1
MODE="${1:-summary}"; shift
BASE="file:///D:/Kailash/ci-marketing-sites/static/claremont/dist"
PAGES="index:1619:5207 preparatory-program:2238:4885 k-6-primary:2238:5016 welcome:1732:11760 extra-curricular:2238:5221 enrolment:2238:6149 policies:2238:5187 news:2238:5364 news-article:2238:5426 contact-us:2238:6241"
npm run build >/dev/null 2>&1 || { echo "build failed"; npm run build 2>&1 | tail -20; exit 1; }
mkdir -p .qa/m
for entry in $PAGES; do
  page="${entry%%:*}"; node_id="${entry#*:}"
  if [ $# -gt 0 ] && [[ ! " $* " =~ " $page " ]]; then continue; fi
  node .qa/measure.mjs "$BASE/$page.html" 1640 ".qa/m/$page.json" >/dev/null
  if [ "$MODE" = "summary" ]; then
    PYTHONIOENCODING=utf-8 python .qa/compare.py "$node_id" ".qa/m/$page.json" | grep -E "^===|<<<|^-- [0-9]"
    PYTHONIOENCODING=utf-8 python .qa/compare-img.py "$node_id" ".qa/m/$page.json" | grep -E "^-- "
  else
    PYTHONIOENCODING=utf-8 python .qa/compare.py "$node_id" ".qa/m/$page.json"
    PYTHONIOENCODING=utf-8 python .qa/compare-img.py "$node_id" ".qa/m/$page.json"
  fi
done
