import requests
base = 'http://127.0.0.1:8000/api'

r = requests.post(base + '/token/refresh/', json={'refresh': 'invalid'})
print('/token/refresh/', r.status_code, repr(r.text))

r2 = requests.get(base + '/stats/')
print('/stats/', r2.status_code, repr(r2.text))
