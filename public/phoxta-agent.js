/*!
 * Phoxta AI agent — embeddable chat widget.
 * Usage: <script src="https://www.phoxta.com/phoxta-agent.js" data-org="YOUR_AGENT_KEY" defer></script>
 * Talks to the public agent-inbound endpoint (same brain as SMS/WhatsApp/voice).
 * The anon key below is Supabase's public client key — safe to ship by design;
 * row-level security and the per-business key scope everything server-side.
 */
(function () {
  "use strict";

  var SUPABASE_URL = "https://ktgleoqvdikngocygdkn.supabase.co";
  var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z2xlb3F2ZGlrbmdvY3lnZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTYwNzgsImV4cCI6MjA5NzA5MjA3OH0.rueujVVX4soxOvS68gnjFYzPLsup3Rbd1ls-uR9yQfU";

  var script = document.currentScript;
  if (!script) {
    var candidates = document.querySelectorAll("script[data-org]");
    script = candidates.length ? candidates[candidates.length - 1] : null;
  }
  var KEY = script && script.getAttribute("data-org");
  if (!KEY) {
    console.warn("[phoxta-agent] Missing data-org attribute on the script tag.");
    return;
  }

  var CONV_STORE = "phoxta-conv-" + KEY;
  var conversationId = null;
  try { conversationId = sessionStorage.getItem(CONV_STORE) || null; } catch (e) { /* storage blocked */ }

  var FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  function el(tag, styles, text) {
    var node = document.createElement(tag);
    if (styles) for (var k in styles) node.style[k] = styles[k];
    if (text) node.textContent = text;
    return node;
  }

  // --- Bubble -------------------------------------------------------------
  var bubble = el("button", {
    position: "fixed", right: "20px", bottom: "20px", width: "56px", height: "56px",
    borderRadius: "50%", border: "none", background: "#111111", color: "#ffffff",
    cursor: "pointer", zIndex: "999998", boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "0"
  });
  bubble.setAttribute("aria-label", "Chat with us");
  bubble.type = "button";
  var ICON_CHAT = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-4.2 3.4A.5.5 0 0 1 4 19V5.5Z" fill="currentColor"/></svg>';
  var ICON_CLOSE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  bubble.innerHTML = ICON_CHAT;

  // --- Panel --------------------------------------------------------------
  var panel = el("div", {
    position: "fixed", right: "20px", bottom: "88px", width: "340px",
    maxWidth: "calc(100vw - 32px)", height: "480px", maxHeight: "calc(100vh - 120px)",
    background: "#ffffff", borderRadius: "16px", boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
    display: "none", flexDirection: "column", overflow: "hidden", zIndex: "999999",
    fontFamily: FONT, fontSize: "14px", lineHeight: "1.45", color: "#111111"
  });
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chat");

  var header = el("div", {
    background: "#111111", color: "#ffffff", padding: "14px 16px",
    fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "space-between"
  });
  header.appendChild(el("span", null, "Chat with us"));
  var dot = el("span", {
    display: "inline-block", width: "8px", height: "8px", borderRadius: "50%",
    background: "#4ade80", marginLeft: "8px"
  });
  dot.setAttribute("aria-hidden", "true");
  header.firstChild.appendChild(dot);

  var thread = el("div", {
    flex: "1", overflowY: "auto", padding: "14px",
    display: "flex", flexDirection: "column", gap: "8px", background: "#f7f7f8"
  });

  var form = el("form", {
    display: "flex", gap: "8px", padding: "10px",
    borderTop: "1px solid #e5e5e5", background: "#ffffff"
  });
  var input = el("input", {
    flex: "1", border: "1px solid #d4d4d8", borderRadius: "10px",
    padding: "9px 12px", fontSize: "14px", fontFamily: FONT, outline: "none", minWidth: "0"
  });
  input.type = "text";
  input.placeholder = "Type a message…";
  input.setAttribute("aria-label", "Type a message");
  var sendBtn = el("button", {
    border: "none", background: "#111111", color: "#ffffff", borderRadius: "10px",
    padding: "9px 16px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: FONT
  }, "Send");
  sendBtn.type = "submit";
  form.appendChild(input);
  form.appendChild(sendBtn);

  panel.appendChild(header);
  panel.appendChild(thread);
  panel.appendChild(form);

  function addMsg(role, text) {
    var mine = role === "customer";
    var row = el("div", { display: "flex", justifyContent: mine ? "flex-end" : "flex-start" });
    var b = el("div", {
      maxWidth: "85%", padding: "8px 12px", borderRadius: "14px", whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      background: mine ? "#111111" : "#ffffff",
      color: mine ? "#ffffff" : "#111111",
      border: mine ? "none" : "1px solid #e5e5e5"
    }, text);
    row.appendChild(b);
    thread.appendChild(row);
    thread.scrollTop = thread.scrollHeight;
    return row;
  }

  var typingRow = null;
  function setTyping(on) {
    if (on && !typingRow) typingRow = addMsg("agent", "…");
    else if (!on && typingRow) { thread.removeChild(typingRow); typingRow = null; }
  }

  var greeted = false;
  var sending = false;

  function send(text) {
    if (sending) return;
    sending = true;
    addMsg("customer", text);
    setTyping(true);
    // Exactly the web-channel shape agent-inbound serves for the chat widget:
    // { public_key, message, conversationId?, channel, customer } -> { conversationId, reply }
    fetch(SUPABASE_URL + "/functions/v1/agent-inbound", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
        "Authorization": "Bearer " + ANON_KEY
      },
      body: JSON.stringify({
        public_key: KEY,
        message: text,
        conversationId: conversationId || undefined,
        channel: "web",
        customer: {}
      })
    }).then(function (r) { return r.json(); }).then(function (data) {
      setTyping(false);
      sending = false;
      if (data && data.conversationId) {
        conversationId = data.conversationId;
        try { sessionStorage.setItem(CONV_STORE, conversationId); } catch (e) { /* storage blocked */ }
      }
      if (data && data.reply) addMsg("agent", data.reply);
      else addMsg("agent", (data && data.error) || "Sorry — something went wrong. Please try again.");
    }).catch(function () {
      setTyping(false);
      sending = false;
      addMsg("agent", "Sorry — we couldn't reach the server. Please try again.");
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.replace(/^\s+|\s+$/g, "");
    if (!text) return;
    input.value = "";
    send(text);
  });

  var open = false;
  bubble.addEventListener("click", function () {
    open = !open;
    panel.style.display = open ? "flex" : "none";
    bubble.innerHTML = open ? ICON_CLOSE : ICON_CHAT;
    bubble.setAttribute("aria-label", open ? "Close chat" : "Chat with us");
    if (open) {
      if (!greeted) { greeted = true; addMsg("agent", "Hi! How can we help today?"); }
      input.focus();
    }
  });

  function mount() {
    document.body.appendChild(panel);
    document.body.appendChild(bubble);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
