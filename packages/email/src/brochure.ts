// Beside the template, not in src/, because BOTH sides need it: the console
// previews it and the edge function sends it. Anything under src/ is invisible
// to Deno; anything under supabase/ is stripped from the Vercel build.
import { renderEmail } from "./render.ts";

/**
 * The Phoxta brochure — everything the company does, in one email.
 *
 * WHAT A BROCHURE EMAIL IS FOR. It goes to someone who has heard the name and
 * nothing else. It has to answer four questions before they close it: what is
 * this, what would I get, what does it cost, and what do I do next. Everything
 * that does not serve one of those four is decoration, and decoration is what
 * makes a long email feel long.
 *
 * SO THE STRUCTURE IS A SALES CONVERSATION, NOT A SITEMAP:
 *
 *   the shift        one idea, stated once — you can buy the business built
 *   what you get     the catalogue, with real names, real prices, real photos
 *   proof it is real those photos ARE the live storefronts, and each links to
 *                    the running site. A brochure for software should show the
 *                    software, and a link that opens a working shop is worth
 *                    more than any adjective.
 *   how it works     four moves, so nobody has to guess at the mechanism
 *   what it costs    the real plans, including the free first month
 *   the smaller yes  Startup School at £500 — for readers not ready to buy a
 *                    business, because a brochure with one price has one
 *                    answer and it is usually no
 *   one action       a single button
 *
 * NO INVENTED TRACTION. Phoxta is pre-launch. There are no customer counts, no
 * testimonials and no "trusted by" logos in here, because there is nothing
 * true to put in them, and a brochure that opens with a fabricated number is
 * the fastest way to lose the one reader who checks.
 *
 * Every figure below is taken from the live site — the marketplace catalogue
 * and the pricing page — not from the internal plan, which quotes different
 * numbers in dollars.
 */

const IMG = "https://www.phoxta.com/assets/imgs/email";
const site = (p: string) => `https://www.phoxta.com${p}`;

export const BROCHURE_SUBJECT = "Buy the business, not the building blocks";

export function phoxtaBrochure() {
  return renderEmail({
    preheader: "Buy a business that already works — storefront, AI staff and the console to run it, live in minutes.",
    heading: "Buy the business, not the building blocks",
    blocks: [
      { type: "hero", src: `${IMG}/hero.jpg`, alt: "The Phoxta platform", height: 194 },

      { type: "text", text: "Most people who want to start something spend the first six months assembling software. A shop here, a booking tool there, a CRM, an inbox, and something to glue it together — and only then, if the energy is left, a business." },
      { type: "html",
        html: "<b>Phoxta sells the finished thing.</b> Pick a business that already works, and it is yours — branded, live and taking customers within minutes rather than months.",
        text: "Phoxta sells the finished thing. Pick a business that already works, and it is yours - branded, live and taking customers within minutes rather than months." },

      { type: "section", label: "What you get", title: "A business, running, on day one" },
      { type: "text", text: "Not a template. A working storefront with real checkout, an AI assistant that already knows the products, and the console behind it to run the whole thing. Every one of these is live right now — open one and use it." },

      { type: "cards", items: [
        { img: `${IMG}/apparel.jpg`, alt: "Aurelia fashion storefront", name: "Fashion Store", price: "£2,500",
          blurb: "A modern fashion store with product archive, online ordering, cart, checkout and an AI stylist.",
          href: "https://demo.aurelia.phoxta.com/" },
        { img: `${IMG}/furniture.jpg`, alt: "Gearo furniture storefront", name: "Furniture Store", price: "£2,500",
          blurb: "A furniture and workspace store with cart, checkout and an AI shopping assistant.",
          href: "https://demo.gearo.phoxta.com/" },
        { img: `${IMG}/travel.jpg`, alt: "Travel experiences storefront", name: "Experiences", price: "£3,600",
          blurb: "A guide-led experiences business: browse, book and manage things to do, with an AI trip assistant.",
          href: "https://demo.travel.phoxta.com/" },
        { img: `${IMG}/rental.jpg`, alt: "Carento car marketplace", name: "Car Marketplace", price: "£5,000",
          blurb: "A full car buying and selling marketplace with listings, financing tools and an AI assistant.",
          href: "https://demo.carento.phoxta.com/" },
      ] },
      { type: "text", text: "Restaurant + Orders is £2,500, and more blueprints are added every month." },
      { type: "button", label: "Browse the marketplace", href: site("/marketplace") },

      { type: "section", label: "What runs it", title: "One console for the whole business" },
      { type: "text", text: "Every business you buy is run from the same place. Nothing to install, nothing to connect." },
      { type: "chips", items: [
        "Inbox — email, SMS & WhatsApp", "CRM", "Products & orders", "Bookings", "Invoicing",
        "Help centre", "Marketing", "Graphics studio", "Analytics", "Custom domain",
      ] },
      { type: "html",
        html: "And an <b>AI operator</b> that works the business with you — answering customers on every channel, chasing what needs chasing, and asking before it does anything you would rather approve first.",
        text: "And an AI operator that works the business with you - answering customers on every channel, chasing what needs chasing, and asking before it does anything you would rather approve first." },

      { type: "section", label: "How it works", title: "Four moves" },
      { type: "steps", items: [
        "Choose a business from the marketplace and buy it once.",
        "Make it yours — name, colours, products, prices, your own domain.",
        "Go live and start serving customers, with the AI handling the first line.",
        "Grow it. And when you want to, list it and sell it on.",
      ] },

      { type: "chart", title: "Where the time goes, building it the usual way", bars: [
        { label: "Assemble the tools yourself", value: 26, note: "about 6 months before a single customer" },
        { label: "Commission a bespoke build", value: 14, note: "about 3 months, plus five figures" },
        { label: "Buy a Phoxta business", value: 1, note: "live the same day" },
      ] },

      { type: "video", poster: `${IMG}/market.jpg`, alt: "The Phoxta marketplace",
        title: "Watch: what you actually get for the money", href: "https://www.youtube.com/@phoxta" },

      { type: "section", label: "What it costs", title: "Buy once, then a monthly plan" },
      { type: "text", text: "The business is a one-time price. The plan keeps it running — hosting, the AI, and every module in the console." },
      { type: "plans", items: [
        { name: "Starter", price: "£75", per: "/mo", line: "One business, AI agent on every channel, full console, storefront on a Phoxta subdomain." },
        { name: "Growth", price: "£250", per: "/mo", best: true, line: "Up to three businesses, your own domain, proactive automations and briefings. First month free with any business you buy." },
        { name: "Scale", price: "£1,500", per: "/mo", line: "Up to ten businesses, outbound and call-centre agent, team seats." },
      ] },
      { type: "text", text: "Annual billing saves 20%. Enterprise is tailored — unlimited businesses, SSO and dedicated support." },

      { type: "section", label: "Not ready to buy one?", title: "Learn to build it instead" },
      { type: "hero", src: `${IMG}/school.jpg`, alt: "Phoxta Startup School", height: 194 },
      { type: "panel", big: "Startup School — £500", small: "Two weeks. You finish with a real business running, not a certificate." },
      { type: "text", text: "Strategy, finance, marketing and the AI tools that actually matter now, taught against your own idea, with mentors who have built and sold companies." },
      { type: "button", label: "See what's covered", href: site("/startup-school") },

      { type: "section", label: "Also", title: "When you want it done for you" },
      { type: "chips", items: ["AI & Tech", "Marketing", "Brand & Design"] },
      { type: "text", text: "Three service lines for the work you would rather hand over — from putting AI into something you already run, to a brand built from scratch." },

      { type: "divider" },
      { type: "html",
        html: "Have a look at the marketplace, or just reply to this email and tell us what you are trying to build — it comes straight to a person.",
        text: "Have a look at the marketplace, or just reply to this email and tell us what you are trying to build - it comes straight to a person." },
      { type: "button", label: "Browse the marketplace", href: site("/marketplace") },
    ],
    footnote: "Phoxta Holdings Ltd., London. You are receiving this because you asked us about Phoxta.",
  });
}
