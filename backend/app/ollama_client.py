import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

def perguntar_ollama(mensagem: str, model: str = "phi3:mini") -> str:
    payload = {
        "model": model,
        "prompt": mensagem,
        "stream": False
    }
    r = requests.post(OLLAMA_URL, json=payload, timeout=120)
    r.raise_for_status()
    return r.json()["response"]
