import urllib.request
import json

url = "https://miicyiykbdsdhrjautpy.supabase.co/rest/v1/tags?limit=1"
key = "sb_publishable_4ffRXusg_g6kRbFBFGARFg_dU3lLkSE"

req = urllib.request.Request(url, headers={"apikey": key, "Authorization": "Bearer " + key})
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print(e)
