"""Self-healing launcher for the Phoxta voice bridge.

One command brings everything up and keeps the phone number working across
restarts: it starts a cloudflared quick tunnel, reads the public URL, points the
Twilio number's voice webhook at it automatically, then runs the voice server.

Because the account-less trycloudflare URL changes on each restart, this script
re-points Twilio every launch — so you never have to touch the Console again.
Just re-run:  python launch.py

(For a permanently fixed URL, use a named Cloudflare tunnel with your own domain,
or deploy server.py to a host like Fly.io/Render and skip the tunnel.)
"""
import base64
import json
import os
import re
import subprocess
import sys
import threading
import urllib.parse
import urllib.request

from dotenv import load_dotenv

load_dotenv()
try:
    sys.stdout.reconfigure(line_buffering=True)  # show [launch] status promptly
except Exception:  # noqa: BLE001
    pass

PORT = int(os.environ.get("PORT", "8765"))


def repoint_twilio(public_url: str) -> None:
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    tok = os.environ.get("TWILIO_AUTH_TOKEN")
    num = os.environ.get("TWILIO_PHONE_NUMBER")
    if not (sid and tok and num):
        print("[launch] Twilio not fully configured — skipping auto-repoint")
        return
    auth = base64.b64encode(f"{sid}:{tok}".encode()).decode()
    try:
        # Resolve the phone-number SID
        q = urllib.parse.urlencode({"PhoneNumber": num})
        r = urllib.request.Request(
            f"https://api.twilio.com/2010-04-01/Accounts/{sid}/IncomingPhoneNumbers.json?{q}",
            headers={"Authorization": f"Basic {auth}"},
        )
        nums = json.load(urllib.request.urlopen(r)).get("incoming_phone_numbers", [])
        if not nums:
            print(f"[launch] Twilio number {num} not found on this account")
            return
        pn = nums[0]["sid"]
        body = urllib.parse.urlencode({"VoiceUrl": public_url + "/", "VoiceMethod": "POST"}).encode()
        r2 = urllib.request.Request(
            f"https://api.twilio.com/2010-04-01/Accounts/{sid}/IncomingPhoneNumbers/{pn}.json",
            data=body, headers={"Authorization": f"Basic {auth}"}, method="POST",
        )
        urllib.request.urlopen(r2)
        print(f"[launch] Twilio {num} -> {public_url}/  (POST)")
    except Exception as e:  # noqa: BLE001
        print(f"[launch] Twilio repoint failed: {e}")


def main():
    cf = subprocess.Popen(
        ["cloudflared", "tunnel", "--url", f"http://localhost:{PORT}"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1,
    )
    public = None
    for line in cf.stdout:
        m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
        if m:
            public = m.group(0)
            break
    if not public:
        print("[launch] could not obtain a tunnel URL")
        cf.terminate()
        sys.exit(1)

    os.environ["PUBLIC_HOST"] = public.replace("https://", "")
    print(f"[launch] tunnel up: {public}")
    repoint_twilio(public)

    # keep draining cloudflared output so it doesn't block
    threading.Thread(target=lambda: [None for _ in cf.stdout], daemon=True).start()

    # PUBLIC_HOST is set, so import server after it's in the environment
    import uvicorn
    from server import app

    print(f"[launch] starting voice server on :{PORT} — call your number now")
    try:
        uvicorn.run(app, host="0.0.0.0", port=PORT)
    finally:
        cf.terminate()


if __name__ == "__main__":
    main()
