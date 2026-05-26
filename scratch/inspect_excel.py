import pandas as pd

# Inspecter le fichier principal
df = pd.read_excel(r"c:\wamp64\www\Projet Bibliothèque\app1 - Copie\Data\Caddie_EXPL_188.xlsx", header=1)
print("=== CADDIE_EXPL ===")
print("Shape brut:", df.shape)
print("\nColonnes:", list(df.columns))
print("\nPremières lignes:")
print(df.head(3))

# Après reset des colonnes
columns = df.iloc[0].tolist()
df.columns = columns
df = df.drop(index=0)
print("\n=== Après fixation des colonnes ===")
print("Shape:", df.shape)
print("Colonnes:", list(df.columns))
print("\nQuelques valeurs Titre propre:")
print(df['Titre propre'].dropna().unique()[:10])
print("\nQuelques valeurs Code-barres:")
print(df['Code-barres'].dropna().unique()[:10])
