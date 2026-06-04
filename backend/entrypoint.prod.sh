#!/bin/sh
# Production entrypoint: migrations are already committed, so just apply them,
# collect static files, optionally seed, then hand off to gunicorn (the CMD).
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "$SEED" = "1" ]; then
    python manage.py seed
fi

exec "$@"
