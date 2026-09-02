/* Ferne — shared front-end app. Swap the Store layer for your commerce API. */
(function () {
  const D = window.FERNE_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = n => new Intl.NumberFormat("en-GB", { style: "currency", currency: D.currency }).format(n);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const prod = id => D.products.find(p => p.id === id);
  const page = location.pathname.split("/").pop() || "index.html";
  const qs = new URLSearchParams(location.search);

  /* ---------- Persistent store (localStorage) ---------- */
  const Store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem("ferne:" + k)) ?? d; } catch { return d; } },
    set(k, v) { localStorage.setItem("ferne:" + k, JSON.stringify(v)); window.dispatchEvent(new CustomEvent("ferne:" + k)); }
  };
  const Cart = {
    items() { return Store.get("cart", []); },
    save(items) { Store.set("cart", items); UI.refreshCart(); },
    add(id, sizeId, qty = 1) {
      const p = prod(id); if (!p || p.stock === 0) return;
      const size = p.sizes.find(s => s.id === sizeId) || p.sizes[0];
      const items = this.items();
      const ex = items.find(i => i.id === id && i.size === size.id);
      if (ex) ex.qty = Math.min(ex.qty + qty, p.stock); else items.push({ id, size: size.id, qty: Math.min(qty, p.stock) });
      this.save(items);
      UI.toast(`${p.name} added to bag`, { link: "cart.html", label: "View bag" });
      UI.openDrawer("cart");
    },
    setQty(id, size, qty) { const items = this.items().map(i => (i.id === id && i.size === size) ? { ...i, qty } : i).filter(i => i.qty > 0); this.save(items); },
    remove(id, size) { this.save(this.items().filter(i => !(i.id === id && i.size === size))); },
    clear() { this.save([]); Store.set("promo", null); },
    lines() { return this.items().map(i => { const p = prod(i.id); const s = p.sizes.find(x => x.id === i.size) || p.sizes[0]; return { ...i, p, s, total: s.price * i.qty }; }); },
    count() { return this.items().reduce((a, i) => a + i.qty, 0); },
    subtotal() { return this.lines().reduce((a, l) => a + l.total, 0); },
    promo() { return Store.get("promo", null); },
    totals(shipId) {
      const sub = this.subtotal(); const promo = this.promo(); const rule = promo && D.promos[promo];
      let discount = 0; if (rule?.type === "percent") discount = sub * rule.value / 100; if (rule?.type === "fixed") discount = Math.min(rule.value, sub);
      const ship = D.shipping.find(s => s.id === shipId) || D.shipping[0];
      let shipping = sub - discount >= D.freeShippingThreshold || rule?.type === "shipping" || sub === 0 ? 0 : ship.price;
      if (ship.id === "collect") shipping = 0;
      return { sub, discount, shipping, total: sub - discount + shipping, promo, ship };
    }
  };
  const Wish = {
    ids() { return Store.get("wish", []); },
    toggle(id) { const w = this.ids(); const i = w.indexOf(id); i > -1 ? w.splice(i, 1) : w.push(id); Store.set("wish", w); UI.toast(i > -1 ? "Removed from wishlist" : "Saved to wishlist", { link: "account.html#wishlist", label: "View" }); UI.refreshWish(); },
    has(id) { return this.ids().includes(id); }
  };
  const Auth = {
    user() { return Store.get("user", null); },
    login(email, name) { Store.set("user", { email, name: name || email.split("@")[0], since: new Date().toISOString() }); },
    logout() { Store.set("user", null); }
  };
  const Orders = {
    all() { return Store.get("orders", []); },
    place(order) { const all = this.all(); all.unshift(order); Store.set("orders", all); }
  };

  /* ---------- Icons ---------- */
  const I = {
    bag: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    heart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
    heartFill: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
    arrow: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>',
    burger: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    user: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
    leaf: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c0-6 3-11 8-13-1 7-4 11-8 13z"/><path d="M12 21c0-6-3-11-8-13 1 7 4 11 8 13z"/><path d="M12 21V9"/></svg>'
  };
  const stars = r => { const f = Math.round(r); return "★".repeat(f) + "☆".repeat(5 - f); };

  /* ---------- UI ---------- */
  const UI = {
    toast(msg, opt = {}) {
      let w = $(".toast-wrap"); if (!w) { w = document.createElement("div"); w.className = "toast-wrap"; document.body.appendChild(w); }
      const t = document.createElement("div"); t.className = "toast"; t.innerHTML = esc(msg) + (opt.link ? ` <a href="${opt.link}">${esc(opt.label || "View")}</a>` : "");
      w.appendChild(t); setTimeout(() => t.remove(), 3200);
    },
    openDrawer(name) { $(".overlay").classList.add("open"); $(`.drawer[data-drawer="${name}"]`).classList.add("open"); document.body.style.overflow = "hidden"; if (name === "cart") this.renderMiniCart(); },
    closeAll() { $(".overlay")?.classList.remove("open"); $$(".drawer").forEach(d => d.classList.remove("open")); $(".search-box")?.classList.remove("open"); $(".filters-side")?.classList.remove("open"); document.body.style.overflow = ""; },
    refreshCart() { $$(".cart-count").forEach(el => { const n = Cart.count(); el.textContent = n || ""; }); if ($(".drawer[data-drawer=cart].open")) this.renderMiniCart(); window.dispatchEvent(new Event("ferne:cartchange")); },
    refreshWish() { $$("[data-wish]").forEach(b => { const on = Wish.has(b.dataset.wish); b.innerHTML = on ? I.heartFill : I.heart; b.classList.toggle("on", on); }); },
    productCard(p, opts = {}) {
      const oos = p.stock === 0;
      return `<article class="product" data-id="${p.id}">
        <div class="img"><a href="product.html?id=${p.id}"><img src="${p.img}" alt="${esc(p.name)}" loading="lazy"></a>
          ${p.bestseller ? '<span class="tag">Best seller</span>' : p.isNew ? '<span class="tag">New</span>' : p.compareAt ? `<span class="tag">Save ${Math.round((1 - p.price / p.compareAt) * 100)}%</span>` : ""}
          <button class="cart wish-btn" data-wish="${p.id}" aria-label="Save">${Wish.has(p.id) ? I.heartFill : I.heart}</button>
          ${oos ? '<div class="oos"><span>Sold out — notify me</span></div>' : `<div class="bar"><button class="buy" data-add="${p.id}">Add to bag<span class="arr">${I.arrow}</span></button><span class="price">${money(p.price)}</span></div>`}
        </div>
        <div class="info"><div><div class="name"><a href="product.html?id=${p.id}">${esc(p.name)}</a></div><div class="desc">${esc(p.tagline)}</div></div><span class="size">${esc(p.sizes[0].label)}</span></div>
      </article>`;
    },
    renderMiniCart() {
      const body = $(".drawer[data-drawer=cart] .d-body"), foot = $(".drawer[data-drawer=cart] .d-foot");
      const lines = Cart.lines(); const t = Cart.totals();
      const left = Math.max(0, D.freeShippingThreshold - t.sub);
      if (!lines.length) { body.innerHTML = `<div class="empty"><b>Your bag is empty</b>Add a ritual or two.<br><br><a class="btn sm" href="shop.html">Shop best-sellers <span class="arr">${I.arrow}</span></a></div>`; foot.innerHTML = ""; return; }
      body.innerHTML = `<div class="ship-bar">${left > 0 ? `Add <b>${money(left)}</b> for free UK delivery` : `<b>You've unlocked free UK delivery</b>`}<div class="bar"><i style="width:${Math.min(100, t.sub / D.freeShippingThreshold * 100)}%"></i></div></div>` +
        lines.map(l => `<div class="line"><div class="ph"><img src="${l.p.img}" alt=""></div><div><b>${esc(l.p.name)}</b><small>${esc(l.s.label)} · ${money(l.s.price)}</small><div style="margin-top:8px;display:flex;gap:12px;align-items:center"><div class="qty sm"><button data-q="-1" data-id="${l.id}" data-size="${l.size}">−</button><span>${l.qty}</span><button data-q="1" data-id="${l.id}" data-size="${l.size}">+</button></div><a class="rm" data-rm data-id="${l.id}" data-size="${l.size}" href="#">Remove</a></div></div><div class="amt">${money(l.total)}</div></div>`).join("");
      foot.innerHTML = `<div class="sum"><span>Subtotal</span><b>${money(t.sub)}</b></div><p class="small muted" style="margin-bottom:12px">Shipping and discounts calculated at checkout.</p><a class="btn block" href="checkout.html">Checkout <span class="arr">${I.arrow}</span></a><a class="link" href="cart.html" style="display:block;text-align:center;margin-top:12px">View full bag</a>`;
    },
    renderSearch(q) {
      const res = $(".search-box .res"); q = q.trim().toLowerCase();
      if (!q) { res.innerHTML = `<div class="hint">Try "oil", "cleanser", "redness" or "set"</div>`; return; }
      const hits = D.products.filter(p => [p.name, p.tagline, p.category, ...p.concerns].join(" ").toLowerCase().includes(q));
      res.innerHTML = hits.length ? hits.map(p => `<a href="product.html?id=${p.id}"><img src="${p.img}" alt=""><div><b>${esc(p.name)}</b><small>${esc(p.tagline)}</small></div><span class="p">${money(p.price)}</span></a>`).join("") + `<a href="shop.html?q=${encodeURIComponent(q)}" style="justify-content:center;font-weight:600;font-size:13px">See all results for "${esc(q)}" →</a>` : `<div class="hint">No products match "${esc(q)}".</div>`;
    }
  };

  /* ---------- Shell (header, drawers, footer) ---------- */
  function shell() {
    const nav = [["shop.html", "Shop", D.products.length], ["shop.html?cat=face", "Face", D.products.filter(p => p.category === "face").length], ["shop.html?cat=body", "Body", D.products.filter(p => p.category === "body").length], ["journal.html", "Journal"], ["about.html", "Our story"]];
    const cur = page + (qs.get("cat") ? "?cat=" + qs.get("cat") : "");
    const user = Auth.user();
    document.body.insertAdjacentHTML("afterbegin", `
      <div class="announce"><b>Free UK delivery over ${money(D.freeShippingThreshold)}</b> · Use code <b>WELCOME10</b> for 10% off your first order</div>
      <header class="header"><div class="wrap">
        <button class="icon-btn burger m-only" data-open="menu" aria-label="Menu">${I.burger}</button>
        <a class="logo" href="index.html"><span class="mark">${I.leaf}</span>Ferne</a>
        <nav class="menu">${nav.map(n => `<a href="${n[0]}" class="${cur === n[0] ? "on" : ""}">${n[1]}${n[2] ? `<sup>${n[2]}</sup>` : ""}</a>`).join("")}</nav>
        <div class="right">
          <button class="icon-btn search" data-open="search" aria-label="Search">${I.search}</button>
          <a class="icon-btn" href="account.html" aria-label="Account" title="${user ? esc(user.name) : "Sign in"}">${I.user}</a>
          <button class="cart-pill" data-open="cart">Cart<span class="c">${I.bag}<b class="cart-count"></b></span></button>
        </div>
      </div></header>
      <div class="overlay" data-close></div>
      <aside class="drawer" data-drawer="cart"><div class="d-head"><b>Your bag</b><button class="icon-btn" data-close aria-label="Close">${I.close}</button></div><div class="d-body"></div><div class="d-foot"></div></aside>
      <aside class="drawer left" data-drawer="menu"><div class="d-head"><b>Menu</b><button class="icon-btn" data-close aria-label="Close">${I.close}</button></div><div class="d-body"><nav class="mnav">${nav.map(n => `<a href="${n[0]}">${n[1]}<small>${n[2] || ""}</small></a>`).join("")}<a href="account.html">${user ? "My account" : "Sign in"}<small></small></a><a href="contact.html">Help &amp; FAQ<small></small></a></nav></div></aside>
      <div class="search-box"><div class="in">${I.search}<input type="search" placeholder="Search products, concerns…" aria-label="Search"><kbd>ESC</kbd></div><div class="res"></div></div>
      <div class="cookie"><b>We use cookies</b> to remember your bag and preferences, and to understand which pages help. No advertising trackers.<div class="row"><button class="btn sm plain" data-cookie="all">Accept</button><button class="btn sm plain ghost" data-cookie="essential">Essential only</button></div></div>`);
    document.body.insertAdjacentHTML("beforeend", `
      <section class="news"><div class="wrap"><div class="box">
        <svg class="leaf" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c0-6 3-11 8-13-1 7-4 11-8 13z"/><path d="M12 21c0-6-3-11-8-13 1 7 4 11 8 13z"/><path d="M12 21V9"/></svg>
        <div><div class="eyebrow">The Sunday letter</div><h2 class="serif">Ten percent off your first order, and a note <em>worth</em> opening.</h2><p>One email a week — a harvest update, one honest product tip, no discount spam.</p></div>
        <div><form data-newsletter><input type="email" required placeholder="you@email.com" aria-label="Email"><button class="btn">Subscribe <span class="arr">${I.arrow}</span></button></form><small>By subscribing you agree to our privacy policy.</small></div>
      </div></div></section>
      <footer class="footer"><div class="wrap">
        <div class="top">
          <div><a class="logo" href="index.html"><span class="mark">${I.leaf}</span>Ferne</a><p>Small-batch botanical skincare, formulated in Birmingham and grown by six farms we can name.</p></div>
          <div><h5>Shop</h5><ul><li><a href="shop.html?cat=face">Face</a></li><li><a href="shop.html?cat=body">Body</a></li><li><a href="shop.html?cat=sets">Sets &amp; gifts</a></li><li><a href="shop.html?q=refill">Refills</a></li><li><a href="shop.html?sort=new">New in</a></li></ul></div>
          <div><h5>Company</h5><ul><li><a href="about.html">Our story</a></li><li><a href="about.html#ingredients">Ingredients</a></li><li><a href="about.html#sustainability">Sustainability</a></li><li><a href="journal.html">Journal</a></li><li><a href="contact.html">Stockists</a></li></ul></div>
          <div><h5>Help</h5><ul><li><a href="contact.html#faq">Shipping</a></li><li><a href="contact.html#faq">Returns</a></li><li><a href="account.html#orders">Track order</a></li><li><a href="contact.html#faq">FAQ</a></li><li><a href="contact.html">Contact</a></li></ul></div>
        </div>
        <div class="bottom"><div>© 2026 Ferne Botanicals Ltd · Registered in England · <a href="#">Privacy</a> · <a href="#">Terms</a></div>
        <div class="soc"><a href="#" aria-label="Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a><a href="#" aria-label="TikTok"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 4c.5 2.5 2.5 4 5 4"/></svg></a></div></div>
      </div></footer>`);
    if (!Store.get("cookie")) setTimeout(() => $(".cookie").classList.add("show"), 800);
  }

  /* ---------- Global events ---------- */
  function events() {
    document.addEventListener("click", e => {
      const t = e.target.closest("[data-open],[data-close],[data-add],[data-wish],[data-q],[data-rm],[data-cookie]");
      if (!t) return;
      if (t.dataset.open) { e.preventDefault(); UI.closeAll(); if (t.dataset.open === "search") { $(".overlay").classList.add("open"); $(".search-box").classList.add("open"); UI.renderSearch(""); setTimeout(() => $(".search-box input").focus(), 50); } else UI.openDrawer(t.dataset.open); }
      if (t.hasAttribute("data-close")) { e.preventDefault(); UI.closeAll(); }
      if (t.dataset.add) { e.preventDefault(); Cart.add(t.dataset.add, t.dataset.size, +(t.dataset.qty || 1)); }
      if (t.dataset.wish) { e.preventDefault(); Wish.toggle(t.dataset.wish); }
      if (t.dataset.q) { e.preventDefault(); const l = Cart.items().find(i => i.id === t.dataset.id && i.size === t.dataset.size); Cart.setQty(t.dataset.id, t.dataset.size, (l?.qty || 0) + +t.dataset.q); }
      if (t.hasAttribute("data-rm")) { e.preventDefault(); Cart.remove(t.dataset.id, t.dataset.size); }
      if (t.dataset.cookie) { Store.set("cookie", t.dataset.cookie); $(".cookie").classList.remove("show"); }
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") UI.closeAll(); if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); $("[data-open=search]").click(); } });
    $(".search-box input").addEventListener("input", e => UI.renderSearch(e.target.value));
    $(".search-box input").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.value.trim()) location.href = "shop.html?q=" + encodeURIComponent(e.target.value.trim()); });
    $$("[data-newsletter]").forEach(f => f.addEventListener("submit", e => { e.preventDefault(); const em = f.querySelector("input").value; Store.set("newsletter", em); f.innerHTML = `<div style="padding:12px 18px;font-weight:600;color:var(--ink)">${I.check} You're in — check ${esc(em)} for your code.</div>`; }));
    window.addEventListener("ferne:cart", UI.refreshCart);
  }

  window.Ferne = { D, $, $$, money, esc, prod, qs, page, Store, Cart, Wish, Auth, Orders, UI, I, stars };
  document.addEventListener("DOMContentLoaded", () => { shell(); events(); UI.refreshCart(); UI.refreshWish(); document.dispatchEvent(new Event("ferne:ready")); });
})();
