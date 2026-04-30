import sqlite3
import os
import sys

db_path = 'data.db'
table_name = sys.argv[2] if len(sys.argv) > 2 else None

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    if table_name:
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        print(f"Columns in {table_name}:")
        for col in columns:
            print(f" - {col[1]} ({col[2]})")
    else:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables in {db_path}:")
        for table in tables:
            print(f" - {table[0]}")
    conn.close()
else:
    print(f"{db_path} does not exist.")
