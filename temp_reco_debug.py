import joblib
from pathlib import Path
p = Path('backend/ai_models/modele_fusion.pkl')
print('exists', p.exists())
if p.exists():
    data = joblib.load(p)
    print('keys', list(data.keys()))
    for key in ['pivot', 'pivot_pred', 'features_livres', 'co_emprunts']:
        print('---', key)
        if key in data:
            v = data[key]
            print(type(v), getattr(v, 'shape', None))
            if key == 'pivot':
                print('pivot idx dtype', v.index.dtype)
                print('pivot idx sample', list(v.index[:10]))
                print('pivot cols sample', list(v.columns[:10]))
            if key == 'features_livres':
                print('features_livres cols', list(v.columns[:10]))
            if key == 'co_emprunts':
                print('co_emprunts cols', list(v.columns[:10]))
                print('co_emprunts sample', v.head(1).to_dict(orient='records'))
