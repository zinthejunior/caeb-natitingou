import pandas as pd

df = pd.read_excel(r"c:\wamp64\www\Projet Bibliothèque\app1 - Copie\Data\Caddie_EXPL_188.xlsx", header=1)
columns = df.iloc[0].tolist()
df.columns = columns
df = df.drop(index=0)

print("Total lignes (exemplaires):", len(df))
print("\nNotices uniques (notice_id):", df['notice_id'].nunique())
print("\nTitres propres uniques:", df['Titre propre'].nunique())
print("\nCotes uniques:", df['Cote'].nunique())

# Distribution des exemplaires par notice
counts = df.groupby('notice_id').size()
print("\nDistribution des exemplaires par notice:")
print(counts.value_counts().head(10))
print("\nExemple d'une notice avec plusieurs exemplaires:")
sample = df[df['notice_id'] == counts.idxmax()][['notice_id', 'Code-barres', 'Titre propre', 'Cote']]
print(sample)
