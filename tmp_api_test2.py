import json
import urllib.request
import urllib.error
import time

base = 'http://127.0.0.1:8000/api'

def request(path, method='GET', data=None, headers=None):
    if headers is None:
        headers = {}
    url = base + path
    if data is not None:
        data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode('utf-8')
            print(path, resp.status, body)
            return resp.status, json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(path, e.code, body)
        return e.code, body
    except Exception as e:
        print(path, 'ERROR', e)
        return None, str(e)

now = int(time.time())
email = f'test_{now}@example.com'
password = 'Passw0rd!'
payload = {
    'username': email,
    'email': email,
    'password': password,
    'prenom': 'Test',
    'nom': 'User',
    'type_compte': 'non_membre',
    'date_naissance': '1990-01-01',
    'niveau_etude': 'Licence',
    'classe': 'L1',
    'genre_prefere': [],
    'intentions': [],
    'profil_complet': True,
}
print('SIGNUP', email)
status, body = request('/utilisateurs/', method='POST', data=payload)
print('SIGNUP RESULT', status, type(body))
if status in (200, 201):
    print('Signup OK')
else:
    print('Signup failed')
print('LOGIN')
status, body = request('/token/', method='POST', data={'username': email, 'password': password})
print('LOGIN RESULT', status, body)
if status == 200 and isinstance(body, dict):
    refresh = body.get('refresh')
    access = body.get('access')
    print('access', access is not None, 'refresh', refresh is not None)
    if refresh:
        print('REFRESH')
        status2, body2 = request('/token/refresh/', method='POST', data={'refresh': refresh})
        print('REFRESH RESULT', status2, body2)
else:
    print('Login failed', status, body)
