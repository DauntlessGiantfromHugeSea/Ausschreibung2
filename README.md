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

## Echte Daten crawlen

Die App nutzt standardmäßig einen realistischen Seed-Datensatz
(`data/tenders.seed.json`). Der Crawler zieht echte Bekanntmachungen aus der
offenen **TED-API** der EU (aggregiert u. a. deutsche Vergaben):

```bash
npm run crawl                              # DEU, 50 Bekanntmachungen
npm run crawl -- --limit 100
npm run crawl -- --expert 'FT="Anhängerkupplung"'
```

Das Ergebnis wird nach `data/tenders.json` geschrieben und von der App
bevorzugt geladen. Ist der TED-Host nicht erreichbar (z. B. gesperrtes Netz),
bleibt der Seed-Datensatz aktiv.

## Konfiguration (optional)

| Variable             | Zweck                                                       |
| -------------------- | ----------------------------------------------------------- |
| `ANTHROPIC_API_KEY`  | Aktiviert echte LLM-Zusammenfassungen statt der Heuristik   |
| `AUTH_SECRET`        | Secret zum Signieren der Session-Cookies (in Produktion setzen) |
| `AUFTRAG_DATA_DIR`   | Schreibbares Datenverzeichnis (Nutzer + gecrawlte Daten); im Docker auf ein Volume gemountet |

## Deployment per Docker

Das Image nutzt Next.js' `standalone`-Output und läuft als Non-Root.
Schreibbare Daten (Konten + gecrawlte Ausschreibungen) liegen im Volume `/data`.

### Variante A – Docker Compose (empfohlen)

```bash
# Secret erzeugen und in .env ablegen (von compose automatisch gelesen)
echo "AUTH_SECRET=$(openssl rand -hex 32)" >> .env
# optional: echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env

docker compose up -d --build
docker compose logs -f          # Logs verfolgen
```

### Variante B – pures Docker

```bash
docker build -t auftrag-ai:latest .
docker volume create auftrag-data
docker run -d --name auftrag-ai --restart unless-stopped \
  -p 3000:3000 \
  -e AUTH_SECRET="$(openssl rand -hex 32)" \
  -v auftrag-data:/data \
  auftrag-ai:latest
```

### Auf dem Server deployen

```bash
git clone <repo-url> && cd Ausschreibung2
git checkout claude/epic-lovelace-wtQXA
docker compose up -d --build
```

Danach erreichbar unter **http://SERVER-IP:3000**.

### Öffentlich erreichbar machen (Domain + HTTPS)

In Produktion einen Reverse-Proxy davorschalten (Beispiel Caddy, terminiert TLS
automatisch). `Caddyfile`:

```
ausschreibungen.example.com {
    reverse_proxy localhost:3000
}
```

Mit Nginx analog `proxy_pass http://localhost:3000;` plus Certbot für HTTPS.
Port 3000 dann besser nicht mehr direkt nach außen öffnen.

### Echte Daten im Container crawlen

```bash
docker compose exec app sh -c \
  'AUFTRAG_DATA_DIR=/data node --experimental-strip-types scripts/crawl.ts --limit 100'
docker compose restart app
```
