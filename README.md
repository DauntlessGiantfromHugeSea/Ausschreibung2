# auftrag.ai – KI-Plattform für öffentliche Ausschreibungen (Nachbau)

Ein funktionaler Nachbau einer Procurement-Plattform für deutsche und
europäische Ausschreibungen, inspiriert von [auftrag.ai](https://auftrag.ai).
Volltextsuche, Filter/Facetten, KI-gestützte Klartext-Analyse und Nutzerkonten
mit gespeicherten Suchen.

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

Beispiel: Suche nach **„Anhängerkupplung"** → Trefferliste → Detailseite mit
KI-Analyse für ein Profil wie „KFZ-Werkstatt, Bayern".

## Datenquellen (Crawler)

Die App nutzt standardmäßig einen realistischen Seed-Datensatz
(`data/tenders.seed.json`). Der Crawler aggregiert mehrere Vergabeplattformen
**stabil und unabhängig voneinander**: jede Quelle läuft isoliert mit Timeout
und Retries (Backoff). Fällt eine Plattform aus oder ist langsam, wird das pro
Quelle gemeldet und bricht den Lauf **nicht** ab; am Ende wird über alle
Quellen dedupliziert.

| Quelle | Adapter | Status |
| ------ | ------- | ------ |
| **TED** (EU, ted.europa.eu) | offizielle REST-API | aktiv, sofort einsatzbereit |
| **Bekanntmachungsservice** (oeffentlichevergabe.de) | OCDS-API | aktiv (Endpoint via `DOEV_API_URL` anpassbar) |
| **DTVP** (dtvp.de) | RSS/Atom-Feed | aktiv, sobald `DTVP_FEED_URL` gesetzt ist |
| **Vergabemarktplatz** (cosinex) | RSS/Atom-Feed | aktiv, sobald `VMP_FEED_URL` gesetzt ist |
| **eVergabe.de** | RSS/Atom-Feed | aktiv, sobald `EVERGABE_FEED_URL` gesetzt ist |

> Hinweis: TED und der Bekanntmachungsservice decken oberschwellige deutsche
> Vergaben breit ab – auch viele, die über DTVP/cosinex/eVergabe veröffentlicht
> werden. Die cosinex-Feeds aktivieren sich automatisch, sobald die jeweilige
> Feed-URL als Umgebungsvariable hinterlegt ist; ohne URL deaktiviert sich die
> Quelle sauber (kein Fehler).

### Crawl per CLI (lokal/Dev)

```bash
npm run crawl                          # alle aktiven Quellen, 50 je Quelle
npm run crawl -- --limit 100
npm run crawl -- --source ted,doev     # nur bestimmte Quellen
npm run crawl -- --query Anhängerkupplung
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
| `VMP_FEED_URL`       | RSS/Atom-Feed-URL für den Vergabemarktplatz (cosinex)       |
| `EVERGABE_FEED_URL`  | RSS/Atom-Feed-URL für eVergabe.de                           |
| `TED_API_URL`        | Override für den TED-API-Endpoint (Default gesetzt)         |
| `DOEV_API_URL`       | Override für den Bekanntmachungsservice-Endpoint (Default gesetzt) |

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
docker build -t auftrag-ai:latest .
docker volume create auftrag-data
docker run -d --name auftrag-ai --restart unless-stopped \
  -p 5000:3000 \
  -e AUTH_SECRET="$(openssl rand -hex 32)" \
  -v auftrag-data:/data \
  auftrag-ai:latest
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
ausschreibungen.example.com {
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
