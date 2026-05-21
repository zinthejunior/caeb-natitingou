import requests
import json

base_url = "http://localhost:8000/api"

def test_registration():
    url = f"{base_url}/utilisateurs/"
    data = {
        "username": "testuser_agent_2",
        "password": "testpass123",
        "email": "agent2@test.com",
        "prenom": "Test",
        "nom": "Agent"
    }
    response = requests.post(url, json=data)
    print(f"Registration status: {response.status_code}")
    print(f"Response: {response.text}")
    return response.status_code == 201

def test_login():
    url = f"http://localhost:8000/api/token/"
    data = {
        "username": "testuser_agent_2",
        "password": "testpass123"
    }
    response = requests.post(url, json=data)
    print(f"Login status: {response.status_code}")
    print(f"Response: {response.text}")
    if response.status_code == 200:
        return response.json().get('access')
    return None

if __name__ == "__main__":
    if test_registration():
        token = test_login()
        if token:
            print("Successfully registered and logged in!")
        else:
            print("Failed to login after registration.")
    else:
        # Maybe user already exists, try login anyway
        token = test_login()
        if token:
            print("User already existed, login successful!")
        else:
            print("Test failed.")
