import urllib.request

req = urllib.request.Request('http://127.0.0.1:8001/openapi.json', method='GET')
with urllib.request.urlopen(req, timeout=10) as resp:
    print('status', resp.status)
    print('headers')
    for k, v in resp.getheaders():
        print(f'{k}: {v}')
    data = resp.read().decode('utf-8', errors='ignore')
    print('len', len(data))
    print(data[:1000])
