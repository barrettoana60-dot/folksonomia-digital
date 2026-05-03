import urllib.request
import json

url = "https://folksonomia-digital-j1rm.vercel.app/api/admin/ia-curadora"
data = json.dumps({
    "messages": [{"role": "user", "content": "cubismo agora vai funcionar"}]
}).encode("utf-8")

req = urllib.request.Request(
    url,
    data=data,
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=15) as res:
        response = json.loads(res.read().decode("utf-8"))
        print(json.dumps(response, indent=2))
except Exception as e:
    print(f"Error: {e}")
