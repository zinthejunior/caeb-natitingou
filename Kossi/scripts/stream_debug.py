import asyncio
import os
import logging
from fastapi_kossi.services.llm_service import LLMService

logging.basicConfig(level=logging.INFO)

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
