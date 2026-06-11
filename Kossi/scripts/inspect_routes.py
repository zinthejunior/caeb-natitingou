import fastapi_kossi.main as main
print('main file:', main.__file__)
print('app routes:')
for route in main.app.routes:
    print(route.path, route.methods)
