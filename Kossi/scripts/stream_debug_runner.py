import sys
import os
import asyncio
import logging

# Ajouter la racine du projet au sys.path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

logging.basicConfig(level=logging.INFO)

from fastapi_kossi.services.llm_service import LLMService

async def run():
    messages = [
        {"role": "system", "content": "Tu es Kossi, assistant."},
        {"role": "user", "content": "cc"},
    ]
    try:
        async for chunk in LLMService.generate_stream(messages, temperature=0.2):
            print('CHUNK:', repr(chunk))
    except Exception as e:
        print('Exception during stream:', type(e).__name__, e)

if __name__ == '__main__':
    asyncio.run(run())
