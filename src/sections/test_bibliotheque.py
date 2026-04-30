
import numpy as np
import pandas as pd
from sklearn.datasets import load_iris 
import matplotlib.pyplot as plt



data={
    "surface":[12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],
    "prix":[40,45,50,55,60,65,70,75,80,85,90,95,100,105,110,115,120,125],

}
df=pd.dataFrame(data)

arr=np.array(data)

print("Affichage du tableau de donnnees:",df)
print("Somme des donnees :",np.sum(arr))
print("Moyenne des dionnees :",np.mean(arr))
print("Ecart type des donnees :",np.std(arr))
df[["surface","prix"]]
plt.title("Relation entre la surface et le prix")
plt.scatter(df["surface "],dr["prix"])
plt.xlabel("surface")
plt.ylabel("prix")
plt.legend()
plt.show()