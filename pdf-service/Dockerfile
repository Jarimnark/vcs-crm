# WeasyPrint render service — one artifact, three environments: local
# development, CI, and production (ADR-0044). libthai is the reason this must
# run in Linux: Thai has no spaces between words, and without it Pango breaks
# lines mid-word, silently (docs/03-tech-stack.md §3.1).
FROM python:3.12-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    libthai0 \
    libthai-data \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi8 \
    fontconfig \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Sarabun — Thai government standard document font, vendored (OFL) so the
# same glyphs render in dev, CI and production.
COPY fonts/ /usr/local/share/fonts/sarabun/
RUN fc-cache -f

WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY templates/ templates/

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1

# Concurrency 1: the ADR-0035 render semaphore as deployment configuration.
# One worker, one thread — the platform setting replaces application code.
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "1", "--timeout", "120", "app:app"]
