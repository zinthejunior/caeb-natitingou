import sys
import joblib
from pathlib import Path
sys.path.insert(0, '.')
from api import recommandations

model_path = Path('ai_models/modele_fusion.pkl')
print('model path exists:', model_path.exists())
composants = joblib.load(model_path)
print('loaded keys:', list(composants.keys()))
recommandations.charger(composants)
print('model loaded')
user_id = '0137133d7f6f'
res = recommandations.recommander_par_user_id(user_id, n=5)
print('result len', len(res))
print(res[:5])
