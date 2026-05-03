import os
import urllib.request
import json

env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                key, val = line.split('=', 1)
                os.environ[key.strip()] = val.strip()

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

try:
    req = urllib.request.Request(
        f"{url}/rest/v1/tags?select=id,tag_original,tag_normalizada",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}"
        }
    )
    with urllib.request.urlopen(req, timeout=5) as res:
        data = json.loads(res.read().decode("utf-8"))
        print(f"Found {len(data)} tags:")
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
