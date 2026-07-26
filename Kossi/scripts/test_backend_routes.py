import urllib.request
import urllib.error

urls = [
    'http://127.0.0.1:8001/openapi.json',
    'http://127.0.0.1:8001/chat/stream',
]
for url in urls:
    try:
        if 'openapi' in url:
            req = urllib.request.Request(url, method='GET', headers={'Content-Type': 'application/json'})
            resp = urllib.request.urlopen(req, timeout=10)
            data = resp.read().decode('utf-8')
            print(url, resp.status)
            print('has /chat/stream:', '/chat/stream' in data)
        else:
            req = urllib.request.Request(url, method='POST', headers={'Content-Type': 'application/json'})
            resp = urllib.request.urlopen(req, timeout=10)
            print(url, resp.status)
            print(resp.read(200).decode('utf-8', errors='ignore'))
    except urllib.error.HTTPError as e:
        print(url, 'HTTP', e.code, e.reason)
        print(e.read(200).decode('utf-8', errors='ignore'))
    except Exception as e:
        print(url, 'ERROR', type(e).__name__, e)
