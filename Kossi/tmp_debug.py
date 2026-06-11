import importlib
mod=importlib.import_module('fastapi_kossi.agents.orchestrator')
cls=mod.KossiOrchestrator
print('class has process_stream', hasattr(cls,'process_stream'))
print('instance has process_stream', hasattr(cls(),'process_stream'))
api_mod=importlib.import_module('fastapi_kossi.api.chat')
print('api chat file', api_mod.__file__)
print('api chat has process_stream', hasattr(api_mod.orchestrator,'process_stream'))
