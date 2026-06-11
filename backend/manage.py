#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import psycopg2

# Monkeypatch psycopg2.connect to handle UnicodeDecodeError on Windows systems with non-UTF-8 local character encoding (e.g. French).
original_connect = psycopg2.connect

def safe_connect(*args, **kwargs):
    try:
        return original_connect(*args, **kwargs)
    except UnicodeDecodeError as e:
        try:
            decoded_msg = e.object.decode('cp1252', errors='replace')
        except Exception:
            decoded_msg = str(e)
        raise psycopg2.OperationalError(
            f"Database connection failed (decoded from CP1252): {decoded_msg}"
        ) from e

psycopg2.connect = safe_connect


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
