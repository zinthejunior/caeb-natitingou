import pandas as pd
import json

def inspect_file(filepath):
    try:
        df = pd.read_excel(filepath)
        print(f"--- File: {filepath} ---")
        print("Columns:", list(df.columns))
        print("First 3 rows:")
        print(df.head(3).to_dict('records'))
        print("\n")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

inspect_file(r"c:\wamp64\www\Projet Bibliothèque\app1 - Copie\Data\Caddie_EXPL_188.xlsx")
inspect_file(r"c:\wamp64\www\Projet Bibliothèque\app1 - Copie\Data\Prêt total.xlsx")
