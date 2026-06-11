"""Test stratégies alternatives de recherche web"""
import asyncio
import httpx
import re
import json

async def test_ddg_lite(query: str):
    """DuckDuckGo Lite - plus léger, moins d'anti-bot"""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html",
    }
    async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
        resp = await client.get(
            "https://lite.duckduckgo.com/lite/",
            params={"q": query},
            headers=headers,
        )
        html = resp.text
        print(f"[DDG Lite] Status: {resp.status_code}, Size: {len(html)}")
        # Chercher des liens et snippets
        results = re.findall(r'<a[^>]+href="(https?://[^"]+)"[^>]*>([^<]+)</a>', html)
        for i, (url, title) in enumerate(results[:5]):
            if "duckduckgo.com" not in url:
                print(f"  [{i+1}] {title[:80]}")
                print(f"       {url}")
        return results

async def test_wikipedia(query: str):
    """Wikipedia API - très fiable, pas d'anti-bot"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Recherche wikipedia
        resp = await client.get(
            "https://fr.wikipedia.org/api/rest_v1/page/search/page",
            params={"q": query, "limit": 5},
        )
        print(f"\n[Wikipedia] Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            for i, page in enumerate(data.get("pages", [])[:5]):
                title = page.get("title", "")
                excerpt = page.get("excerpt", "")
                key = page.get("key", "")
                url = f"https://fr.wikipedia.org/wiki/{key}"
                print(f"  [{i+1}] {title}")
                print(f"       {excerpt[:150]}")
                print(f"       {url}")
        return data

async def test_brave_search(query: str):
    """Brave Search API (FREE tier) - 2000 queries/month"""
    # API key gratuite: https://api.search.brave.com/
    brave_key = ""  # Mettre votre clé ici
    if not brave_key:
        print("[Brave] Pas de clé API, skipping...")
        return []
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://api.search.brave.com/res/v1/web/search",
            headers={"Accept": "application/json", "X-Subscription-Token": brave_key},
            params={"q": query, "count": 5, "search_lang": "fr"},
        )
        print(f"\n[Brave] Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            for r in data.get("web", {}).get("results", [])[:5]:
                print(f"  - {r.get('title','')[:80]}")
        return resp.json() if resp.status_code == 200 else []

async def test_duckduckgo_suggestions(query: str):
    """DDG autocomplete - retourne des suggestions liées"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://duckduckgo.com/ac/",
            params={"q": query, "type": "list", "kl": "fr-fr"},
        )
        print(f"\n[DDG Autocomplete] Status: {resp.status_code}")
        data = resp.json()
        print(f"  Suggestions: {data}")
        return data

async def test_searxng_public(query: str):
    """SearXNG - moteur méta-search open source, instances publiques"""
    instances = [
        "https://searx.be",
        "https://search.mdosch.de",
        "https://searxng.world",
    ]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    }
    for instance in instances:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    f"{instance}/search",
                    params={"q": query, "format": "json", "language": "fr-FR", "categories": "general"},
                    headers=headers,
                )
                print(f"\n[SearXNG {instance}] Status: {resp.status_code}")
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("results", [])
                    print(f"  Résultats: {len(results)}")
                    for r in results[:3]:
                        print(f"  - {r.get('title','')[:80]}")
                        print(f"    {r.get('url','')}")
                    if results:
                        return results
        except Exception as e:
            print(f"  Erreur: {e}")
    return []

async def main():
    query = "bibliothèque livres gratuits en ligne francophone"
    
    print("=== Test 1: DDG Lite ===")
    await test_ddg_lite(query)
    
    print("\n=== Test 2: Wikipedia ===")
    await test_wikipedia("bibliothèque numérique")
    
    print("\n=== Test 3: SearXNG Public ===")
    await test_searxng_public(query)

if __name__ == "__main__":
    asyncio.run(main())
