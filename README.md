# fluessigboden.ai – KI-Plattform für Tiefbau- & Verfüllungs-Ausschreibungen

Die Ausschreibungsplattform von **F&B Engineering**: findet, filtert und
bewertet deutsche und europäische Ausschreibungen für Flüssigboden / ZFSV,
thermisch stabilisierende Böden (pro thermolith), Erdkabel-/Kabelgrabenverfüllung,
Tiefbau und Spundwand. Mit Volltextsuche, Filter/Facetten, KI-gestützter
Klartext-Analyse, fachlicher Relevanzbewertung und Nutzerverwaltung.

## Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS** fürs UI
- In-Memory-Such-/Facettenindex über JSON-Daten (kein externer Dienst nötig)
- **Anthropic API** für KI-Zusammenfassungen, mit deterministischem Offline-Fallback
- Auth: scrypt-Passwort-Hashing + HMAC-signierte Cookie-Sessions (JSON-User-Store)

## Schnellstart

```bash
npm install
npm run dev        # http://localhost:3000
```

## Features

| Bereich            | Beschreibung                                                        |
| ------------------ | ------------------------------------------------------------------- |
| Suche + Detail     | Volltextsuche mit Relevanz-Score, Detailseite mit allen Feldern     |
| Filter & Facetten  | Branche (CPV), Region/Bundesland, Verfahrensart, „nur laufende"     |
| KI-Matching        | Klartext-Zusammenfassung + Eignungs-Score pro Profil                |
| Login/Konto        | Registrierung, Login, gespeicherte Suchen                           |

Beispiel: Suche nach **„Flüssigboden"** oder **„Erdkabel Verfüllung"** →
Trefferliste → Detailseite mit KI-Analyse für ein Profil wie
„Flüssigboden/ZFSV, thermische Kabelbettung".

## Datenquellen (Crawler)

Die App nutzt standardmäßig einen realistischen Seed-Datensatz
(`data/tenders.seed.json`). Der Crawler aggregiert mehrere Vergabeplattformen
**stabil und unabhängig voneinander**: jede Quelle läuft isoliert mit Timeout
und Retries (Backoff). Fällt eine Plattform aus oder ist langsam, wird das pro
Quelle gemeldet und bricht den Lauf **nicht** ab; am Ende wird über alle
Quellen dedupliziert.

Die Crawl-Logik (Endpoints, Query-Parameter, Feld-Mappings, Fachfilter) wurde
aus der bestehenden Python-Plattform `ausschreibungsplattform-fbe` portiert.

| Quelle | Methode | Status |
| ------ | ------- | ------ |
| **TED** (EU, ted.europa.eu) | REST-API v3 (`buyer-country="DEU"`, ACTIVE, Pagination) | HTTP-only, sofort aktiv |
| **service.bund.de** | RSS-Feed (`jobsrss=true`, Bauleistungen) | HTTP-only, sofort aktiv |
| **Bekanntmachungsservice** (oeffentlichevergabe.de) | OCDS-API | HTTP-only, aktiv (`DOEV_API_URL`) |
| **cosinex** Vergabemarktplatz | HTML-Listing (`welcome.do`-Tabelle) | HTTP, aktiv via `COSINEX_BASE_URL`/`COSINEX_ENABLE=1` |
| **DTVP** (dtvp.de) | **Browser nötig** (Bot-Schutz) bzw. RSS via `DTVP_FEED_URL` | siehe Hinweis |
| **eVergabe.de** | **Browser nötig** (Bot-Schutz) bzw. RSS via `EVERGABE_FEED_URL` | siehe Hinweis |

**Fachfilter:** Crawl-Treffer werden gegen die F&B-Themencluster
(`lib/ingest/searchTerms.ts`: Flüssigboden/ZFSV, thermisch stabilisierende Böden /
pro thermolith, Erdkabel/Kabelgraben, Verfüllung, Tiefbau, Spundwand …) gefiltert
und gewichtet bewertet. Dieselbe Logik liefert den Eignungs-Score, wenn kein
eigenes Profil angegeben ist.

> **Wichtig — Bot-Schutz bei DTVP & eVergabe.de:** Diese Portale erkennen reine
> HTTP-Clients und blocken sie. Die Python-Plattform löst das mit einem
> separaten **Playwright-Enricher** (echter Chromium-Browser unter Xvfb,
> `headless=false`). Reine HTTP-Adapter liefern dort **nichts**. Zwei Optionen:
> (1) einen RSS-Feed der Portale hinterlegen (`DTVP_FEED_URL` / `EVERGABE_FEED_URL`),
> oder (2) den Playwright-Enricher als eigenständigen Dienst betreiben (analog
> zum `enricher/`-Verzeichnis der Python-Plattform) und dessen Ergebnisse
> einspeisen. TED + service.bund.de + Bekanntmachungsservice decken den Großteil
> der oberschwelligen deutschen Vergaben ohnehin HTTP-basiert ab.

Crawl-Läufe **sammeln an** (Merge + Dedup nach URL/Referenz) statt zu
überschreiben – der Bestand wächst über die Zeit. Sobald echte Daten vorliegen,
ersetzen sie den Demo-Seed.

### Bestehende Daten aus der alten Plattform übernehmen

Die ~8.000 bereits gecrawlten Ausschreibungen aus `ausschreibungsplattform-fbe`
lassen sich direkt importieren (Admin → **Daten-Import**, `/admin/import`):

1. In der alten Plattform `/export/csv` aufrufen → `ausschreibungen.csv`.
2. Datei unter `/admin/import` hochladen (oder per `curl` an
   `POST /api/admin/import`). Mapping CSV/JSON → Tender, Dedup nach URL.

### Crawl per CLI (lokal/Dev)

```bash
npm run crawl                          # alle aktiven Quellen, 50 je Quelle
npm run crawl -- --limit 100
npm run crawl -- --source ted,doev     # nur bestimmte Quellen
npm run crawl -- --query Flüssigboden
```

### Crawl im Container (Produktion)

Das Standalone-Image enthält keine Dev-Tools; daher läuft das Crawling über
einen geschützten Endpoint. `CRAWL_TOKEN` setzen und per HTTP auslösen
(ideal für einen Cronjob):

```bash
curl -X POST -H "x-crawl-token: $CRAWL_TOKEN" \
  "http://localhost:5000/api/admin/crawl?limit=100"
```

Das Ergebnis wird nach `<AUFTRAG_DATA_DIR>/tenders.json` geschrieben und von der
App sofort bevorzugt geladen. Ist keine Quelle erreichbar, bleibt der
Seed-Datensatz aktiv.

## Konfiguration (optional)

| Variable             | Zweck                                                       |
| -------------------- | ----------------------------------------------------------- |
| `ANTHROPIC_API_KEY`  | Aktiviert echte LLM-Zusammenfassungen statt der Heuristik   |
| `AUTH_SECRET`        | Secret zum Signieren der Session-Cookies (in Produktion setzen) |
| `AUFTRAG_DATA_DIR`   | Schreibbares Datenverzeichnis (Nutzer + gecrawlte Daten); im Docker auf ein Volume gemountet |
| `CRAWL_TOKEN`        | Schützt `POST /api/admin/crawl`; nötig fürs Crawling im Container |
| `DTVP_FEED_URL`      | RSS/Atom-Feed-URL für DTVP (aktiviert die Quelle)           |
| `EVERGABE_FEED_URL`  | RSS/Atom-Feed-URL für eVergabe.de                           |
| `TED_API_URL`        | Override für den TED-API-Endpoint (Default gesetzt)         |
| `TED_MAX_PAGES`      | Anzahl TED-Seiten pro Lauf (Default 4)                      |
| `TED_FILTER_FBE`     | `1` = TED-Treffer auf F&B-Themencluster filtern             |
| `DOEV_API_URL`       | Override für den Bekanntmachungsservice-Endpoint (Default gesetzt) |
| `BUND_RSS_URL`       | Override für den service.bund.de-RSS-Feed                   |
| `COSINEX_ENABLE`     | `1` = cosinex-Scraper aktivieren (Default vergabeportal-bw) |
| `COSINEX_BASE_URL`   | Basis-URL des cosinex-Portals (aktiviert die Quelle)        |
| `COSINEX_LISTING_PATHS` | Komma-getrennte Listing-Pfade (überschreibt Defaults)    |

## Deployment per Docker

Das Image nutzt Next.js' `standalone`-Output und läuft als Non-Root.
Schreibbare Daten (Konten + gecrawlte Ausschreibungen) liegen im Volume `/data`.

### Variante A – Docker Compose (empfohlen)

```bash
# Secret erzeugen und in .env ablegen (von compose automatisch gelesen)
echo "AUTH_SECRET=$(openssl rand -hex 32)" >> .env
echo "APP_PORT=5000" >> .env        # Host-Port (Container bleibt intern auf 3000)
# optional: echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env

docker compose up -d --build
docker compose logs -f          # Logs verfolgen
```

### Variante B – pures Docker

```bash
docker build -t fluessigboden-ai:latest .
docker volume create fluessigboden-data
docker run -d --name fluessigboden-ai --restart unless-stopped \
  -p 5000:3000 \
  -e AUTH_SECRET="$(openssl rand -hex 32)" \
  -v fluessigboden-data:/data \
  fluessigboden-ai:latest
```

### Auf dem Server deployen

```bash
git clone <repo-url> && cd Ausschreibung2
git checkout claude/epic-lovelace-wtQXA
echo "AUTH_SECRET=$(openssl rand -hex 32)" >> .env
echo "APP_PORT=5000" >> .env
docker compose up -d --build
```

Danach erreichbar unter **http://SERVER-IP:5000**.

### Öffentlich erreichbar machen (Domain + HTTPS)

In Produktion einen Reverse-Proxy davorschalten (Beispiel Caddy, terminiert TLS
automatisch). `Caddyfile`:

```
fluessigboden.ai {
    reverse_proxy localhost:5000
}
```

Mit Nginx analog `proxy_pass http://localhost:5000;` plus Certbot für HTTPS.
Port 5000 dann besser nicht mehr direkt nach außen öffnen.

### Echte Daten im Container crawlen

Token in der `.env` setzen (`echo "CRAWL_TOKEN=$(openssl rand -hex 16)" >> .env`,
danach `docker compose up -d`), dann den Crawl auslösen:

```bash
curl -X POST -H "x-crawl-token: $CRAWL_TOKEN" \
  "http://localhost:5000/api/admin/crawl?limit=100"
```

Für regelmäßige Aktualisierung einen Cronjob anlegen, der genau diesen
`curl`-Aufruf z. B. stündlich ausführt. Ein Neustart ist nicht nötig — die App
lädt die neuen Daten sofort.
