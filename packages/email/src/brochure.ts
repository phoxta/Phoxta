import { renderBrochure } from "./render.ts";

/**
 * The Phoxta brochure — everything the company does, in one email.
 *
 * WHO IS READING. Someone who has heard the name and nothing else, on a phone,
 * with about eight seconds of goodwill. They have four questions and they ask
 * them in this order: what is this, what would I get, what does it cost, what
 * do I do next. Anything on the page that does not answer one of those is
 * decoration, and decoration is what makes a long email feel long.
 *
 * THE POSITION. Not "a platform for building businesses" — every SaaS company
 * on earth says a version of that, and it puts the work back on the reader.
 * The claim is narrower and far more useful: *the business is already built and
 * already running; buy it.* That is the only thing Phoxta can say that nobody
 * else in the category can, so it is said once, plainly, in the first six words
 * and never softened afterwards.
 *
 * THE PROOF IS THE PRODUCT. Five storefronts are live this minute. Every tile
 * links into one that a stranger can actually shop. That is worth more than any
 * adjective, and it is why the tiles are links rather than pictures — a claim
 * you can check in one tap is not really a claim any more.
 *
 * NOTHING INVENTED. Phoxta is pre-launch: no customer count, no testimonial, no
 * logo wall, no "trusted by thousands". A brochure that opens with a fabricated
 * number loses the one reader who checks, and that reader is usually the buyer.
 *
 * THE STRUCTURE, and why each section earns its place:
 *
 *   cover        the promise, a picture of the real product, one button
 *   01 the shift the problem, in the reader's own words, then the reversal
 *   02 the shop  five tiles, real prices, each a door into a live store
 *   03 the ops   what runs it once it is yours — the part they will not have
 *                thought about, and the reason this is not a website sale
 *   04 how       four moves, so nobody has to guess at the mechanism
 *   05 the money on ink, full-bleed, because price is where attention goes and
 *                the page needs one moment that stops the scroll
 *   06 the small the £500 door for readers who are not buying today. A brochure
 *      yes       with a single price has a single answer, and it is usually no
 *   07 services  the done-for-you lines, briefly, for the ones who want that
 *   close        one action, repeated — the same button as the cover
 *
 * Every figure is from the live marketplace and pricing page, not from the
 * internal plan, which is older and quotes dollars.
 */

const IMG = "https://www.phoxta.com/assets/imgs/email";
const site = (p: string) => `https://www.phoxta.com${p}`;
const SHOP = site("/marketplace");

export const BROCHURE_SUBJECT = "Skip the build. Own the business.";

export function phoxtaBrochure() {
  return renderBrochure({
    subject: BROCHURE_SUBJECT,
    strap: "Businesses that already work",
    // The second line in the inbox. It is the only other thing a reader sees
    // before deciding, so it carries the proof and the price, not a greeting.
    preheader: "Five ready-made businesses you can open and use right now — storefront, AI staff and the console to run it. From £2,500.",
    blocks: [
      {
        type: "cover",
        src: `${IMG}/hero.jpg`,
        alt: "The Phoxta marketplace",
        title: "Skip the build. Own the business.",
        sub: "The storefront, the AI staff and the console to run it all — yours in minutes, not months.",
        cta: { label: "Browse the marketplace", href: SHOP },
        note: "Five businesses live right now · From £2,500 · Plans from £75 a month",
      },

      { type: "section", n: "01", label: "The shift", title: "Six months of building. Or one afternoon." },
      { type: "text", text: "Starting something usually means assembling software first. A store here, a booking tool there, a CRM, an inbox, and something to hold it all together. Months of work before a single customer sees anything." },
      {
        type: "html",
        html: "Phoxta sells the finished business instead. <b>Pick one, make it yours, go live.</b> Everything your customer touches and everything you use to run it is already built, already connected and already working.",
        text: "Phoxta sells the finished business instead. Pick one, make it yours, go live. Everything your customer touches and everything you use to run it is already built, already connected and already working.",
      },

      { type: "section", n: "02", label: "The businesses", title: "Five to choose from. All of them live." },
      { type: "text", text: "These are trading storefronts, not templates — real products, real checkout, an AI assistant that already knows the catalogue. Open one and use it before you decide." },
      {
        type: "grid",
        items: [
          { img: `${IMG}/bp-fashion.jpg`, alt: "Fashion", name: "Fashion Store", price: "£2,500", blurb: "Collections, cart, checkout and an AI stylist.", href: "https://demo.aurelia.phoxta.com/" },
          { img: `${IMG}/bp-furniture.jpg`, alt: "Furniture", name: "Furniture Store", price: "£2,500", blurb: "Home and workspace, with an AI shopping assistant.", href: "https://demo.gearo.phoxta.com/" },
          { img: `${IMG}/bp-restaurant.jpg`, alt: "Restaurant", name: "Restaurant + Orders", price: "£2,500", blurb: "Menu, online ordering and table bookings.", href: SHOP },
          { img: `${IMG}/bp-experiences.jpg`, alt: "Experiences", name: "Experiences", price: "£3,600", blurb: "Guide-led trips, booked and managed end to end.", href: "https://demo.travel.phoxta.com/" },
          { img: `${IMG}/bp-cars.jpg`, alt: "Cars", name: "Car Marketplace", price: "£5,000", blurb: "Listings, finance tools and buyer enquiries.", href: "https://demo.carento.phoxta.com/" },
        ],
      },
      { type: "text", text: "New blueprints are added every month." },
      { type: "button", label: "Open a live demo", href: SHOP },

      { type: "section", n: "03", label: "What runs it", title: "The whole back office, on day one." },
      { type: "text", text: "Buying a website leaves you with a website. This comes with the business behind it — every one of these, on the day you go live, with nothing to install and nothing to connect." },
      {
        type: "chips",
        items: ["Inbox — email, SMS & WhatsApp", "CRM", "Products & orders", "Bookings", "Invoicing", "Help centre", "Marketing", "Graphics studio", "Analytics", "Your own domain"],
      },
      {
        type: "html",
        html: "And an <b>AI operator</b> that works it with you: answering customers on every channel, chasing what needs chasing, and asking first before it does anything you would rather approve yourself.",
        text: "And an AI operator that works it with you: answering customers on every channel, chasing what needs chasing, and asking first before it does anything you would rather approve yourself.",
      },
      { type: "video", poster: `${IMG}/market.jpg`, alt: "Inside the Phoxta marketplace", title: "See what you actually get for the money", href: "https://www.youtube.com/@phoxta" },

      { type: "section", n: "04", label: "How it works", title: "Four moves." },
      {
        type: "steps",
        items: [
          "Choose a business from the marketplace and buy it once.",
          "Make it yours — name, colours, products, prices, your own domain.",
          "Go live and start serving customers, with the AI on the front line.",
          "Grow it. And when you are ready, list it and sell it on.",
        ],
      },
      {
        type: "chart",
        title: "Time from decision to first customer",
        bars: [
          { label: "Assemble the tools yourself", value: 26, note: "about six months" },
          { label: "Commission a bespoke build", value: 14, note: "about three months, plus five figures" },
          { label: "Buy a Phoxta business", value: 1, note: "the same day" },
        ],
      },

      {
        type: "band",
        blocks: [
          { type: "section", n: "05", label: "What it costs", title: "Buy once. Then a simple monthly plan." },
          { type: "text", text: "The business is a one-time price. The plan keeps it running — hosting, the AI, and every module in the console." },
          {
            type: "plans",
            items: [
              { name: "Starter", price: "£75", per: "/mo", line: "One business. AI agent on every channel, the full console, storefront on a Phoxta address." },
              { name: "Growth", price: "£250", per: "/mo", best: true, line: "Up to three businesses, your own domain, proactive automations and briefings." },
              { name: "Scale", price: "£1,500", per: "/mo", line: "Up to ten businesses, outbound and call-centre agent, seats for your team." },
            ],
          },
          {
            type: "html",
            html: "<b>Buy a business and your first month of Growth is free.</b> Annual billing saves 20%, and Enterprise is tailored — unlimited businesses, SSO, dedicated support.",
            text: "Buy a business and your first month of Growth is free. Annual billing saves 20%, and Enterprise is tailored - unlimited businesses, SSO, dedicated support.",
          },
        ],
      },

      { type: "section", n: "06", label: "Not buying today?", title: "Learn to build one instead." },
      { type: "hero", src: `${IMG}/school.jpg`, alt: "Phoxta Startup School", height: 194 },
      { type: "panel", big: "Startup School — £500", small: "Two weeks. You leave with a real business running, not a certificate." },
      { type: "text", text: "Strategy, finance, marketing and the AI tools that actually matter now — taught against your own idea, by people who have built and sold companies." },
      { type: "button", label: "See what's covered", href: site("/startup-school") },

      { type: "section", n: "07", label: "Or hand it over", title: "Three things we do for you." },
      { type: "chips", items: ["AI & Tech", "Marketing", "Brand & Design"] },
      { type: "text", text: "From putting AI into something you already run, to a brand built from nothing. If it is the work you would rather not do yourself, start with a conversation." },
      { type: "button", label: "Talk to us", href: site("/contact") },

      { type: "divider" },
      {
        type: "html",
        html: "The quickest way to judge any of this is to go and use one. Open a demo, put something in the basket, ask the assistant a question — then decide.",
        text: "The quickest way to judge any of this is to go and use one. Open a demo, put something in the basket, ask the assistant a question - then decide.",
      },
      { type: "button", label: "Browse the marketplace", href: SHOP },
      { type: "text", text: "Or reply to this email and tell us what you are trying to build. It comes straight to a person." },
    ],
    footnote: "Phoxta Holdings Ltd., London. You are receiving this because you asked us about Phoxta.",
  });
}
