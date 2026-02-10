import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def create_strategy():
    strategy_payload = {
        "name": "RSI Oversold Strategy",
        "description": "Buys when RSI < 30 and Price > SMA 200",
        "strategy_type": "json",
        "config": {
            "rules": [
                {
                    "type": "technical",
                    "condition": "rsi_oversold",
                    "parameters": {"threshold": 30}
                },
                {
                    "type": "technical",
                    "condition": "above_ema",
                    "parameters": {"period": 200}
                }
            ],
            "risk_management": {
                "stop_loss_pips": 25,
                "take_profit_pips": 50
            }
        },
        "executable_code": ""
    }
    
    try:
        response = requests.post(f"{BASE_URL}/strategies/", json=strategy_payload)
        
        if response.status_code == 201:
            print("✅ Strategy Created Successfully!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"❌ Failed: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_strategy()
