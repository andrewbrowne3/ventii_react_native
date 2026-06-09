# Deployment Agent Prompt — Ventii Backend

> **For the Claude Code agent running on the server.** Read this top to bottom,
> then execute the steps in order. Each step has a verification — do not move on
> until it passes. Stop and report if a verification fails. Everything here is
> idempotent: it is safe to re-run.

## Your goal

Deploy the Ventii Django backend so that **https://ventii.andrewbrowne.org**
serves the API over HTTPS, fronted by nginx, with an auto-renewing Let's
Encrypt certificate. The app is a monorepo; the backend lives in `backend/`
and the production stack is defined in `docker-compose.prod.yml`.

## Assumptions / environment

- This is a Linux server with **Docker** and the **docker compose** plugin
  already installed.
- You have shell access and sudo if needed.
- The repo is `git@github.com:andrewbrowne3/ventii_react_native.git`
  (use the HTTPS URL `https://github.com/andrewbrowne3/ventii_react_native.git`
  if SSH keys are not set up).
- Ports **80** and **443** are free and reachable from the public internet.

## Architecture you are standing up

```
        ventii.andrewbrowne.org  (DNS A record -> this server's public IP)
                 |
            [ nginx :80/:443 ]   TLS termination, /static/, ACME challenge
                 |  proxy_pass
            [ backend :8000 ]    Django + gunicorn
                 |
            SQLite db  (docker volume: backend-data)
        [ certbot ]  renews the cert every 12h
```

---

## Step 0 — Preconditions

```bash
docker --version && docker compose version
```
**Verify:** both print versions. If docker compose is missing, install the
compose plugin before continuing.

**DNS — this MUST be true before requesting a certificate.** Confirm the
domain resolves to *this server's* public IP:
```bash
SERVER_IP=$(curl -s https://api.ipify.org)
echo "server public IP: $SERVER_IP"
dig +short ventii.andrewbrowne.org
```
**Verify:** the `dig` output equals `$SERVER_IP`. If it does not, the A record
for `ventii.andrewbrowne.org` is not pointing here yet — **stop** and tell the
user to create/update the DNS A record, then resume. (Certbot will fail
otherwise.)

## Step 1 — Get the code

```bash
cd /opt 2>/dev/null || cd ~
if [ -d ventii_react_native ]; then
  cd ventii_react_native && git pull
else
  git clone https://github.com/andrewbrowne3/ventii_react_native.git
  cd ventii_react_native
fi
```
**Verify:** `ls docker-compose.prod.yml backend/ deploy/` succeeds.

## Step 2 — Configure environment

Create `backend/.env` from the template and fill in real values:
```bash
cp -n backend/.env.example backend/.env
# Generate a strong secret key and write it into .env:
SECRET=$(docker run --rm python:3.12-slim python -c "import secrets; print(secrets.token_urlsafe(50))")
sed -i "s|^DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=${SECRET}|" backend/.env
cat backend/.env
```
**Verify:** `backend/.env` has a long random `DJANGO_SECRET_KEY`, `DEBUG=0`,
`DJANGO_ALLOWED_HOSTS` containing `ventii.andrewbrowne.org`, and
`CORS_ALLOW_ALL_ORIGINS=0`. Leave `SEED=1` for the first deploy (loads demo
data), then set it to `0` after the first successful boot.

## Step 3 — Build the backend image

```bash
docker compose -f docker-compose.prod.yml build backend
```
**Verify:** build completes without error.

## Step 4 — Issue the TLS certificate (one time)

This bootstraps the cert and starts nginx + backend:
```bash
# Optional: test against Let's Encrypt staging first to avoid rate limits:
#   STAGING=1 ./deploy/init-letsencrypt.sh
CERTBOT_EMAIL=andrewb.andrewslearning@gmail.com ./deploy/init-letsencrypt.sh
```
**Verify:** the script ends with `https://ventii.andrewbrowne.org should now be
live.` and `deploy/certbot/conf/live/ventii.andrewbrowne.org/fullchain.pem`
exists. If it used staging, re-run with `FORCE=1` and without `STAGING=1` to
get a real (trusted) cert.

## Step 5 — Bring up the full stack

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```
**Verify:** `backend`, `nginx`, and `certbot` are all `Up`.

## Step 6 — Verify the live API

```bash
# HTTP should redirect to HTTPS
curl -sI http://ventii.andrewbrowne.org | head -n1

# Public events endpoint over HTTPS
curl -s https://ventii.andrewbrowne.org/api/events/ | head -c 300; echo

# Login returns tokens + user
curl -s -X POST https://ventii.andrewbrowne.org/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@ventii.app","password":"demo12345"}' | head -c 300; echo
```
**Verify:**
- the HTTP request returns `301`,
- `/api/events/` returns JSON with a `results` array (HTTP 200),
- login returns JSON containing `access`, `refresh`, and `user`.

The Django admin is at `https://ventii.andrewbrowne.org/admin/`
(superuser `admin@ventii.app` / `admin12345` — change this password).

## Step 7 — Lock down & report

1. In `backend/.env`, set `SEED=0`, then `docker compose -f docker-compose.prod.yml up -d backend` to apply.
2. Change the admin password:
   `docker compose -f docker-compose.prod.yml exec backend python manage.py changepassword admin@ventii.app`
3. Report back to the user: the live URL, that all Step 6 checks passed, and
   the demo credentials.

---

## Updating later (redeploys)

```bash
cd ~/ventii_react_native   # or /opt/ventii_react_native
git pull
docker compose -f docker-compose.prod.yml up -d --build
```
Migrations and `collectstatic` run automatically on backend start
(`backend/entrypoint.prod.sh`).

## Troubleshooting

- **Certbot fails / challenge times out** → DNS A record isn't pointing here,
  or port 80 is blocked by a firewall/security group. Re-check Step 0.
- **502 Bad Gateway from nginx** → backend container isn't up. Check
  `docker compose -f docker-compose.prod.yml logs backend`.
- **`DisallowedHost` in logs** → add the host to `DJANGO_ALLOWED_HOSTS` in
  `backend/.env` and restart backend.
- **CSRF errors in the admin** → ensure `DJANGO_CSRF_TRUSTED_ORIGINS` includes
  `https://ventii.andrewbrowne.org`.
- **Logs:** `docker compose -f docker-compose.prod.yml logs -f nginx backend`.

## Notes for whoever connects the mobile app

The React Native app (repo root) is still on mock data and not yet wired to
this API. When wiring it up, point `src/constants/config.ts` `BASE_URL` at
`https://ventii.andrewbrowne.org`. The agent service (`AGENT_URL`, port 4012)
is not deployed yet — its slot is stubbed in `docker-compose.prod.yml`.
