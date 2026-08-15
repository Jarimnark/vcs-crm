"""VCS CRM PDF render service.

The black box (docs/03-tech-stack.md §7.1): accept a JSON context, render a
template, return bytes. Written once, never touched during feature work.
The only Python in the project.

The context arriving here has already passed the whitelist in
lib/pdf/context.ts — cost fields are absent, not hidden. Jinja2 is configured
with StrictUndefined OFF deliberately: a template referencing a field that is
not in the context renders blank rather than leaking, which is the designed
failure mode (ADR-0031).
"""

import hmac
import os

from flask import Flask, abort, jsonify, request
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

app = Flask(__name__)

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")
_env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html"]),
)

MAX_BODY_BYTES = 20 * 1024 * 1024  # line images arrive as data URIs


def _authorized() -> bool:
    """Shared-secret auth. A render endpoint that accepts arbitrary HTML from
    the internet is an SSRF and content-injection hazard — it must not be
    reachable without the secret (ADR-0042)."""
    secret = os.environ.get("PDF_SERVICE_SECRET", "")
    if not secret:
        return False  # unset secret means nothing is authorized, not everything
    header = request.headers.get("Authorization", "")
    return hmac.compare_digest(header, f"Bearer {secret}")


@app.get("/healthz")
def healthz():
    return jsonify({"ok": True})


@app.post("/render")
def render():
    if not _authorized():
        abort(401)
    if request.content_length and request.content_length > MAX_BODY_BYTES:
        abort(413)

    context = request.get_json(silent=True)
    if not isinstance(context, dict):
        abort(400, "JSON body required")

    template = _env.get_template("quotation.html")
    html = template.render(
        company=context.get("company", {}),
        quotation=context.get("quotation", {}),
        lines=context.get("lines", []),
    )

    # base_url=None: the document must be self-contained (data: URIs only).
    # No file or network fetches from template content.
    pdf_bytes = HTML(string=html, base_url=None).write_pdf()

    return app.response_class(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Cache-Control": "no-store"},
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")))
