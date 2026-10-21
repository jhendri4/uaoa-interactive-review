# UAOA interactive review gallery

Standalone page for reviewing course interactives **outside ScormStack**.

Widgets and the **Buttons** chrome (mini dictionary, support notice/modal, support floater, Continue) are copied from `scripts/` and `docs/` on every rebuild so this gallery stays aligned with the live ScormStack course.

## Open it

```bash
cd review
python3 -m http.server 8765
```

Then open http://127.0.0.1:8765/

(Opening `index.html` via `file://` may block iframes in some browsers.)

## Refresh content (keep in sync)

After changing course widgets, embeds, or Custom JS:

```bash
python3 scripts/build_review_gallery.py
```

Review a translation catalog (adds strings via `source/i18n/<locale>.json`):

```bash
python3 scripts/build_review_gallery.py --locale es
```

Use the **Translation** select in the header to switch locales. If the page was built for a different locale than the one you pick, rebuild with `--locale` first.

## What’s included

- **Buttons** — mini dictionary, sensitive-notice / support modal, support floater sidebars, custom Continue scroll button
- **Custom widget** — copies of live course embeds from `scripts/widget-*.html`
- **Recreated native** — ScormStack flashcards / assessments / tabs / etc. rebuilt with the shared UAOA card layout and Correct! / Not quite feedback
