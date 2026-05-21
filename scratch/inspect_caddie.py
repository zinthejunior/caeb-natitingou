import pandas as pd

def inspect_caddie(filepath):
    try:
        df = pd.read_excel(filepath, header=1)
        print("Columns:", list(df.columns)[:100])  # print first 100
        print("First row:", df.head(1).to_dict('records'))
    except Exception as e:
        print(e)

inspect_caddie(r"c:\wamp64\www\Projet Bibliothèque\app1 - Copie\Data\Caddie_EXPL_188.xlsx")
