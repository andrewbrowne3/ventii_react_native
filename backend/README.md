# Ventii Backend

Django + Django REST Framework microservice for the Ventii mobile app.
Auth is JWT (SimpleJWT). Database is SQLite (file in `data/`, persisted via a
Docker volume). API contracts mirror `src/constants/config.ts` in the app.

## Run with Docker (from the repo root)

```bash
docker compose up --build
```

The backend comes up on **http://localhost:8000**. On first boot it generates
migrations, migrates, and seeds demo data.

## Run locally (without Docker)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py makemigrations accounts profiles events tickets inbox
python manage.py migrate
python manage.py seed
python manage.py runserver 0.0.0.0:8000
```

## Demo credentials

| Account    | Email             | Password    |
|------------|-------------------|-------------|
| App user   | demo@ventii.app   | demo12345   |
| Admin      | admin@ventii.app  | admin12345  |

## API

| Method | Path                       | Auth | Notes                          |
|--------|----------------------------|------|--------------------------------|
| POST   | /api/auth/login/           | no   | `{email, password}` → tokens + user |
| POST   | /api/auth/token/refresh/   | no   | `{refresh}` → new access       |
| POST   | /api/auth/logout/          | yes  | `{refresh}` blacklist          |
| GET    | /api/auth/profile/         | yes  | current user                   |
| GET    | /api/events/               | no   | events (nested hosts/venue/tickets/deals) |
| GET    | /api/profiles/             | no   | host/venue profiles            |
| GET    | /api/tickets/              | yes  | the user's owned tickets       |
| GET    | /api/inbox/                | yes  | message threads                |
| GET    | /api/inbox/activity/       | yes  | activity feed                  |

## Connecting the mobile app

A physical phone can't reach `localhost` — that's the phone itself. Point the
app at the dev machine's LAN IP in `src/constants/config.ts`:

```
BASE_URL: 'http://<your-mac-lan-ip>:8000'
```
