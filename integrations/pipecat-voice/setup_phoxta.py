"""One-time setup: point the agent's business at Phoxta itself.

- Renames the organization tied to the agent to "Phoxta".
- Sets the agent persona/greeting to a Phoxta sales/support assistant.
- Creates curated Phoxta knowledge pages (what it does, what you can buy/get,
  pricing, how it works, matching, FAQ) as published CMS pages.
- Embeds each page (OpenAI text-embedding-3-small) into the per-tenant RAG index
  so the phone/chat agent answers Phoxta questions from real knowledge.

Run with env: SUPABASE_URL, SERVICE_KEY, OPENAI_API_KEY, AGENT_PUBLIC_KEY.
"""
import json
import os
import urllib.request

URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE = os.environ["SERVICE_KEY"]
OPENAI = os.environ.get("OPENAI_API_KEY", "")
GEMINI = os.environ.get("GEMINI_API_KEY", "")
VOYAGE = os.environ.get("VOYAGE_API_KEY", "")
PUBLIC_KEY = os.environ["AGENT_PUBLIC_KEY"]
REST = f"{URL}/rest/v1"


def req(method, path, body=None, headers=None, base=REST):
    h = {"apikey": SERVICE, "Authorization": f"Bearer {SERVICE}", "Content-Type": "application/json"}
    if headers:
        h.update(headers)
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(f"{base}{path}", data=data, headers=h, method=method)
    with urllib.request.urlopen(r) as resp:
        raw = resp.read().decode()
        return json.loads(raw) if raw.strip() else None


def embed_many(texts):
    """Embed a list of texts in ONE request (avoids free-tier rate limits).
    Must match the edge function's provider so index/query vectors align."""
    texts = [t[:8000] for t in texts]
    if VOYAGE:
        r = urllib.request.Request(
            "https://api.voyageai.com/v1/embeddings",
            data=json.dumps({"model": os.environ.get("VOYAGE_MODEL", "voyage-3.5-lite"), "input": texts}).encode(),
            headers={"Authorization": f"Bearer {VOYAGE}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(r) as resp:
            return [d["embedding"] for d in json.load(resp)["data"]]
    if OPENAI:
        r = urllib.request.Request(
            "https://api.openai.com/v1/embeddings",
            data=json.dumps({"model": "text-embedding-3-small", "input": texts}).encode(),
            headers={"Authorization": f"Bearer {OPENAI}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(r) as resp:
            return [d["embedding"] for d in json.load(resp)["data"]]
    raise SystemExit("No embeddings provider key set (VOYAGE_API_KEY or OPENAI_API_KEY)")


PAGES = [
    ("what-is-phoxta", "What is Phoxta?",
     "Phoxta sells you a complete, ready-to-launch business — not a website or a template. Each business arrives with its storefront or booking system, content, AI assistants and automations already built and running. You pick one, make it your own, brand it, and go live in days. We keep improving it with you over time."),
    ("what-you-can-buy", "What you can buy",
     "You buy ready-made, AI-powered businesses you can own and run. The launch catalog includes a Coffee Subscription brand, a Niche Apparel store, a Hair Salon with online booking, a Dental Clinic patient portal, a Newsletter and Creator business, a Marketing Agency, a Local Marketplace, an Online Course Studio, a Restaurant with online ordering, and a Niche SaaS starter. Each is a full business with the AI inside and the operations already set up."),
    ("what-you-get", "What you get",
     "Every business comes ready to operate: a branded storefront or booking site, your products or services, an AI front-desk and support assistant that answers customers 24/7, appointment scheduling with reminders, invoicing and subscriptions, a CRM, marketing automation, and analytics. You own it fully — your name, your domain, your payment account — and you can export your data and leave anytime."),
    ("pricing", "Pricing",
     "There are two simple parts. A one-time launch fee to make a business yours, from about 700 to 5,000 US dollars depending on the business. And a monthly platform plan to run it, roughly 32 to 179 US dollars per month. AI usage beyond what's included is pay-as-you-go. There are no long contracts; you can export your data and leave anytime."),
    ("how-it-works", "How it works",
     "Four steps. First, pick a business with proven economics from the marketplace. Second, make it your own and brand it. Third, go live in days with the AI assistants and automations already switched on. Fourth, operate it — the AI handles a large share of customer calls, chats, bookings and follow-ups, so you can run lean. You move from launch to first revenue in days, not months."),
    ("matching", "Find operators, co-founders and investors",
     "Phoxta also connects the people behind the businesses. You can find an experienced operator to run a business for you, match with a co-founder, or connect with investors to fund a portfolio of businesses. It is a network for owning and growing real businesses, not just software."),
    ("faq", "Common questions",
     "Do you own the business? Yes — it is yours, with your name, your domain and your own payment account, and you can export your data anytime. Can you leave Phoxta? Yes, with a full export and no lock-in. Do your customers see Phoxta? No — everything is fully your brand. Is each business unique to you? Yes, every one runs independently. How fast can you launch? Usually within days."),
]


def main():
    cfg = req("GET", f"/agent_config?public_key=eq.{PUBLIC_KEY}&select=id,organization_id")
    if not cfg:
        raise SystemExit("agent_config not found for that public key")
    org_id = cfg[0]["organization_id"]
    cfg_id = cfg[0]["id"]
    print("org:", org_id)

    # 1) Rename the business to Phoxta
    req("PATCH", f"/organizations?id=eq.{org_id}", {"name": "Phoxta", "vertical": "AI-native business platform"})
    print("renamed organization -> Phoxta")

    # 2) Agent persona for Phoxta — full knowledge baked in so it answers
    #    accurately even before the RAG index is populated (no embeddings needed).
    persona = (
        "You are Phoxta's friendly sales and support assistant. Speak warmly, clearly and concisely.\n"
        "ABOUT PHOXTA: Phoxta sells complete, ready-to-launch, AI-powered businesses that people can own and run — "
        "not websites or templates. Each business arrives with its storefront or booking system, content, AI assistants "
        "and automations already built and running. You pick one, make it your own, brand it, and go live in days.\n"
        "WHAT YOU CAN BUY (launch catalog): Coffee Subscription brand; Niche Apparel store; Hair Salon with online booking; "
        "Dental Clinic patient portal; Newsletter/Creator business; Marketing Agency; Local Marketplace; Online Course Studio; "
        "Restaurant with online ordering; Niche SaaS starter. Each is a full business with the AI inside and operations set up.\n"
        "WHAT'S INCLUDED: a branded storefront or booking site; your products or services; an AI front-desk and support "
        "assistant answering customers 24/7; appointment scheduling with reminders; invoicing and subscriptions; a CRM; "
        "marketing automation; and analytics. You own it fully — your name, your domain, your payment account — and can "
        "export your data and leave anytime.\n"
        "PRICING: a one-time launch fee from about 700 to 5,000 US dollars depending on the business, plus a monthly platform "
        "plan of roughly 32 to 179 US dollars. AI usage beyond what's included is pay-as-you-go. No long contracts.\n"
        "HOW IT WORKS: pick a business with proven economics; make it yours and brand it; go live in days with the AI and "
        "automations switched on; operate it lean while the AI handles many calls, chats, bookings and follow-ups. You move "
        "from launch to first revenue in days, not months.\n"
        "MATCHING: Phoxta also connects the people behind the businesses — find an operator to run one for you, match with a "
        "co-founder, or connect with investors to fund a portfolio.\n"
        "FAQ: You own the business (your name, domain and payment account; export anytime). No lock-in. Your customers see "
        "only your brand. Each business runs independently. You can usually launch within days.\n"
        "Always answer from these facts; never invent prices or details. If you are unsure, offer to have the team follow up. "
        "Capture interested callers as a lead (name plus email or phone) and offer to book a call."
    )
    req("PATCH", f"/agent_config?id=eq.{cfg_id}", {
        "display_name": "Phoxta Assistant",
        "tone": "warm, clear, professional",
        "greeting": "Hi! Thanks for contacting Phoxta. I can explain how Phoxta works, the businesses you can own, and pricing. What would you like to know?",
        "persona": persona,
    })
    print("updated agent persona (knowledge baked in)")

    # 3) Curated pages, then ONE batched embedding call (avoids rate limits)
    ids, contents = [], []
    for slug, title, body in PAGES:
        page = req(
            "POST", "/cms_pages?on_conflict=organization_id,slug",
            {"organization_id": org_id, "slug": slug, "title": title, "body": body, "status": "published"},
            {"Prefer": "resolution=merge-duplicates,return=representation"},
        )
        ids.append(page[0]["id"])
        contents.append(f"{title}\n{body}")
        print("page:", slug)

    vecs = embed_many(contents)
    for pid, content, vec in zip(ids, contents, vecs):
        req(
            "POST", "/ai_embeddings?on_conflict=organization_id,source_type,source_id",
            {"organization_id": org_id, "source_type": "cms_pages", "source_id": pid,
             "content": content, "embedding": "[" + ",".join(repr(x) for x in vec) + "]"},
            {"Prefer": "resolution=merge-duplicates"},
        )
    print(f"DONE — {len(PAGES)} Phoxta pages created and {len(vecs)} embedded into RAG.")


if __name__ == "__main__":
    main()
