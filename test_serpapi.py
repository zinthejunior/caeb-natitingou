
import asyncio, httpx, os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path('Kossi/fastapi_kossi/.env'))
key = os.getenv('SERPAPI_API_KEY', '')
print(f'Clé SerpAPI chargée : {key[:10]}... (longueur={len(key)})')

async def test():
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            'https://serpapi.com/search.json',
            params={'q': 'bibliotheque Natitingou', 'api_key': key, 'num': 2, 'hl': 'fr'}
        )
        print(f'Status HTTP : {r.status_code}')
        data = r.json()
        if r.status_code == 200:
            results = data.get('organic_results', [])
            print(f'Résultats : {len(results)}')
            for res in results[:2]:
                title = res.get('title')
                link = res.get('link')
                print(f'  - {title} | {link}')
        else:
            print(f'Erreur : {data}')

asyncio.run(test())

