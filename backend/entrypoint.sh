#!/bin/sh
set -e

# Generate migrations for the local apps (first run) and apply them, then seed.
python manage.py makemigrations accounts profiles events tickets inbox --noinput
python manage.py migrate --noinput
python manage.py seed

exec "$@"
