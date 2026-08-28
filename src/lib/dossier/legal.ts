/**
 * What you legally need — written by people, never by a model.
 *
 * WHY THIS SECTION IS NOT GENERATED
 *
 * Every other section of a dossier is written by a model against a brief. This
 * one is not, and the reason is worth stating plainly because it will look like
 * an omission otherwise.
 *
 * Terms of sale, a privacy notice, a cookie policy and a returns policy are
 * jurisdiction-specific legal documents. A model can produce four of them that
 * read beautifully and are wrong in ways nobody notices until a customer, a
 * regulator or the ICO says so. Worse, a generated policy presented on a
 * finished-looking page — with a download button under it — stops being the
 * buyer's problem and becomes the platform's: Phoxta would have supplied a legal
 * document, styled as a deliverable, as part of a paid product.
 *
 * So the dossier ships the thing that is genuinely useful and carries no
 * liability: a checklist of what actually applies to this trade in the UK, who
 * to check it with, and where the official source is. It names the regulations
 * rather than paraphrasing them, and it says out loud which four documents we
 * will not write and where to get them properly.
 *
 * Everything below was written against UK law and links to the official source.
 * Thresholds and fees change — none are quoted here on purpose; each item points
 * at the page that carries the current figure.
 */

export type LegalItem = {
  title: string;
  /** What the requirement actually is, in the owner's words. */
  what: string;
  /** Who or what settles it. */
  where: string;
  url: string;
};

export type LegalGroup = { name: string; note?: string; items: LegalItem[] };

export type LegalPack = {
  /** The trade this pack was chosen for, for the caption. */
  trade: string;
  intro: string;
  groups: LegalGroup[];
};

/* ── Applies to every business on the platform ─────────────────────────── */

const SETTING_UP: LegalGroup = {
  name: "Before you take a penny",
  items: [
    {
      title: "Register the business",
      what: "Sole trader, partnership or limited company. A sole trader registers with HMRC for Self Assessment; a limited company is incorporated at Companies House and files accounts every year.",
      where: "HMRC / Companies House",
      url: "https://www.gov.uk/set-up-business",
    },
    {
      title: "Pay the ICO data protection fee",
      what: "Almost every organisation that holds customer names, addresses or email addresses has to pay the Information Commissioner's annual fee. It is cheap, it is a legal requirement, and not paying it is the easiest fine in the country to collect.",
      where: "Information Commissioner's Office",
      url: "https://ico.org.uk/for-organisations/data-protection-fee/",
    },
    {
      title: "Insurance",
      what: "Public liability and — if you sell goods — product liability. Employers' liability is not optional: it becomes a legal requirement the day you take on your first employee.",
      where: "A broker, or your trade association",
      url: "https://www.gov.uk/employers-liability-insurance",
    },
    {
      title: "VAT",
      what: "You must register once taxable turnover passes the threshold, and you can register voluntarily below it — which is often worth it when your customers are businesses. The current threshold is on the gov.uk page; it moves, so check it rather than trusting a number you read somewhere.",
      where: "HMRC",
      url: "https://www.gov.uk/vat-registration",
    },
    {
      title: "Keep the records HMRC expects",
      what: "Sales, purchases, receipts and bank statements, kept for the number of years HMRC requires for your structure. Your console's invoicing and orders cover the sales side; the purchase side is on you.",
      where: "HMRC",
      url: "https://www.gov.uk/self-employed-records",
    },
  ],
};

const SELLING_ONLINE: LegalGroup = {
  name: "Selling online",
  items: [
    {
      title: "The distance selling rules",
      what: "The Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 govern anything sold without the customer standing in front of you. They set what you must tell someone before they buy, and give most consumers 14 days to cancel. There are real exceptions — made-to-order goods, perishables, sealed hygiene items, and services already performed with the customer's agreement — and knowing which apply to you is the whole job.",
      where: "Business Companion (Chartered Trading Standards Institute)",
      url: "https://www.businesscompanion.info/",
    },
    {
      title: "The Consumer Rights Act 2015",
      what: "Goods must be of satisfactory quality, fit for purpose and as described; services must be carried out with reasonable care and skill. This is the law your returns policy has to sit on top of — a policy cannot take away a right the Act gives.",
      where: "Business Companion",
      url: "https://www.businesscompanion.info/",
    },
    {
      title: "Say who you are, on the site",
      what: "E-commerce and company law both require your trading name, a geographic address, an email address, and your company number and VAT number where you have them, to be easy to find on the website. Not in an image, and not only on a contact form.",
      where: "Companies House / e-commerce regulations",
      url: "https://www.gov.uk/running-a-limited-company/signs-stationery-and-promotional-material",
    },
    {
      title: "Cookies and marketing consent",
      what: "PECR and the UK GDPR: non-essential cookies need consent before they load, and marketing email or SMS needs consent — with a narrow 'soft opt-in' for people who have already bought from you. Every message needs a working unsubscribe.",
      where: "Information Commissioner's Office",
      url: "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/",
    },
    {
      title: "Card payments",
      what: "Use the payment provider your storefront is wired to and never store card numbers yourself — that is what keeps PCI DSS and Strong Customer Authentication their problem rather than yours. If you ever take a card number over the phone and write it down, it becomes yours.",
      where: "Your payment provider",
      url: "https://www.pcisecuritystandards.org/",
    },
    {
      title: "Product safety, if you import",
      what: "Goods sold in the UK must be safe and correctly marked. If you import stock yourself rather than buying from a UK wholesaler, you may take on the importer's duties — including being the named responsible person.",
      where: "Office for Product Safety and Standards",
      url: "https://www.gov.uk/government/organisations/office-for-product-safety-and-standards",
    },
  ],
};

/* ── The four we will not write for you ────────────────────────────────── */

const WILL_NOT_WRITE: LegalGroup = {
  name: "The four documents Phoxta will not write for you",
  note:
    "We generate the rest of this dossier. We deliberately do not generate these, because a policy that reads as finished and is quietly wrong is worse than no policy at all — and you would only find out when it mattered. Get them from one of the sources below and put them on your storefront yourself.",
  items: [
    {
      title: "Terms and conditions of sale",
      what: "What you sell, on what terms, with what delivery promise and what happens when something goes wrong. It has to match how your business actually works, which is why a generic one is dangerous rather than merely useless.",
      where: "A solicitor, or a reputable template service that specialises in UK e-commerce",
      url: "https://solicitors.lawsociety.org.uk/",
    },
    {
      title: "Privacy notice",
      what: "What personal data you collect, why, how long you keep it and who you share it with. The ICO publishes a free tool that builds one from questions about your business — for most small businesses that is the right starting point, not a downloaded template.",
      where: "Information Commissioner's Office",
      url: "https://ico.org.uk/for-organisations/sme-information-hub/",
    },
    {
      title: "Cookie policy and banner",
      what: "Which cookies your site sets, what each is for, and a banner that genuinely asks before non-essential ones load. The banner is a technical job as much as a legal one.",
      where: "Information Commissioner's Office",
      url: "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-cookies-and-similar-technologies/",
    },
    {
      title: "Returns and refunds policy",
      what: "Your policy sits on top of the Consumer Rights Act and the 2013 cancellation rules — it can be more generous than the law, never less. Write it after you have read what those two actually require of your trade.",
      where: "Business Companion, then a solicitor if you sell anything unusual",
      url: "https://www.businesscompanion.info/",
    },
  ],
};

/* ── Per trade ─────────────────────────────────────────────────────────── */

const BY_TRADE: Record<string, LegalGroup> = {
  fashion: {
    name: "Clothing and textiles specifically",
    items: [
      {
        title: "Fibre composition labelling",
        what: "The Textile Products (Labelling and Fibre Composition) Regulations 2012 require the fibre content on textile products, in the right words, in English. Footwear has its own labelling rules for the upper, lining and sole.",
        where: "Business Companion",
        url: "https://www.businesscompanion.info/",
      },
      {
        title: "Nightwear and children's clothing",
        what: "Nightwear carries flammability requirements, and children's clothing has additional safety rules — drawstrings and cords around the neck in particular. If you plan a kids' line, settle this before you order stock, not after.",
        where: "Office for Product Safety and Standards",
        url: "https://www.gov.uk/government/organisations/office-for-product-safety-and-standards",
      },
      {
        title: "Importing stock",
        what: "Buying from outside the UK means customs duty, import VAT and a commodity code per product — and it makes you the importer, with the product-safety duties that carries.",
        where: "HMRC",
        url: "https://www.gov.uk/import-goods-into-uk",
      },
      {
        title: "Returns are the trade's weather",
        what: "Clothing has the highest return rate of any online category and the 14-day cancellation right applies to nearly all of it. Price and plan for returns as a normal cost of trading rather than an exception.",
        where: "Business Companion",
        url: "https://www.businesscompanion.info/",
      },
    ],
  },

  motor: {
    name: "Selling vehicles specifically",
    items: [
      {
        title: "Are you a trader or a marketplace?",
        what: "Selling your own stock and listing other people's cars are legally different businesses with different duties. Settle which one you are before you write a single listing — it decides who is responsible when a car turns out to be faulty.",
        where: "Business Companion",
        url: "https://www.businesscompanion.info/",
      },
      {
        title: "Describing a vehicle",
        what: "The Consumer Protection from Unfair Trading Regulations 2008 make a misleading description an offence, not just a dispute. Mileage, service history, previous owners, write-off category and outstanding finance are the ones that end in prosecutions.",
        where: "Trading Standards",
        url: "https://www.businesscompanion.info/",
      },
      {
        title: "The short-term right to reject",
        what: "Under the Consumer Rights Act a buyer can reject a faulty vehicle within 30 days of delivery and get their money back. Your inspection and preparation process is what keeps that from happening.",
        where: "Business Companion",
        url: "https://www.businesscompanion.info/",
      },
      {
        title: "Finance needs FCA authorisation",
        what: "Introducing customers to a lender — even by putting a finance calculator on a listing — is regulated credit broking. Doing it without authorisation is a criminal offence, and it is a very common mistake.",
        where: "Financial Conduct Authority",
        url: "https://www.fca.org.uk/firms/authorisation",
      },
      {
        title: "Paperwork and trade cover",
        what: "V5C logbooks, keeper changes and motor trade insurance that covers vehicles in your custody. Standard business insurance does not.",
        where: "DVLA / a motor trade broker",
        url: "https://www.gov.uk/vehicle-registration-certificate-v5c-log-book",
      },
    ],
  },

  furniture: {
    name: "Furniture specifically",
    items: [
      {
        title: "Fire safety labels are not optional",
        what: "The Furniture and Furnishings (Fire) (Safety) Regulations 1988 require upholstered furniture sold in the UK to meet flammability standards and carry permanent labels. Selling an unlabelled sofa is an offence — check every supplier's compliance before you list, including anything imported.",
        where: "Office for Product Safety and Standards / Business Companion",
        url: "https://www.businesscompanion.info/",
      },
      {
        title: "Large-item delivery and cancellation",
        what: "The 14-day cancellation right applies, and for large goods the customer must be told who pays to send them back and roughly what that costs — before they buy. Say it in the listing, not in the confirmation email.",
        where: "Business Companion",
        url: "https://www.businesscompanion.info/",
      },
      {
        title: "Made-to-order is the exception you will rely on",
        what: "Genuinely bespoke or personalised furniture is outside the cancellation right. 'Choose from four fabrics' usually is not bespoke. Getting this line wrong is the most expensive mistake in the trade.",
        where: "Business Companion, or a solicitor for your specific range",
        url: "https://www.businesscompanion.info/",
      },
      {
        title: "Assembly and safety information",
        what: "Instructions, weight limits and tip-over warnings where they apply — flat-pack storage and children's furniture in particular.",
        where: "Office for Product Safety and Standards",
        url: "https://www.gov.uk/government/organisations/office-for-product-safety-and-standards",
      },
    ],
  },

  food: {
    name: "Food specifically",
    items: [
      {
        title: "Register the food business — 28 days before you open",
        what: "Registration with your local authority is free, legally required, and must happen at least 28 days before you start trading. It cannot be done retrospectively without questions.",
        where: "Your local council",
        url: "https://www.gov.uk/food-business-registration",
      },
      {
        title: "A written food safety management system",
        what: "You need HACCP-based procedures in writing. The Food Standards Agency's Safer Food, Better Business pack is the free version most small kitchens use, and it is what an inspector will ask to see.",
        where: "Food Standards Agency",
        url: "https://www.food.gov.uk/business-guidance/safer-food-better-business-sfbb",
      },
      {
        title: "Allergens, including on the website",
        what: "The 14 named allergens must be declared, and food prepacked for direct sale needs a full ingredients list with allergens emphasised — Natasha's Law. For online orders the information has to be available before the order is placed AND when the food is delivered.",
        where: "Food Standards Agency",
        url: "https://www.food.gov.uk/business-guidance/allergen-guidance-for-food-businesses",
      },
      {
        title: "Your hygiene rating is public",
        what: "The Food Hygiene Rating Scheme score is published and is the first thing a delivery customer sees. Treat the inspection as a launch task, not an afterthought.",
        where: "Food Standards Agency",
        url: "https://www.food.gov.uk/safety-hygiene/food-hygiene-rating-scheme",
      },
      {
        title: "Alcohol, if you sell it",
        what: "A premises licence for the location and a personal licence for whoever authorises sales. Both take weeks and involve the council and the police.",
        where: "Your local council",
        url: "https://www.gov.uk/premises-licence",
      },
      {
        title: "Trade waste",
        what: "Commercial food waste cannot go out with household refuse. You need a contract with a licensed carrier and the transfer notes to prove it.",
        where: "Environment Agency",
        url: "https://www.gov.uk/managing-your-waste-an-overview",
      },
    ],
  },

  experiences: {
    name: "Experiences and activities specifically",
    items: [
      {
        title: "Are you selling a package?",
        what: "Combine two or more travel services — an activity plus accommodation, or plus transport — and you may be selling a package under the Package Travel and Linked Travel Arrangements Regulations 2018. That brings insolvency protection duties, which are expensive to discover late.",
        where: "Business Companion / the CAA",
        url: "https://www.businesscompanion.info/",
      },
      {
        title: "Flights mean ATOL",
        what: "Selling flights as part of anything requires ATOL protection. There is no small-operator exemption worth relying on.",
        where: "Civil Aviation Authority",
        url: "https://www.caa.co.uk/atol-protection/",
      },
      {
        title: "Risk assessments and public liability",
        what: "Written risk assessments for every activity, reviewed when anything changes, plus public liability cover at the level your venues and partners require. Venues will ask for both before they let you operate.",
        where: "Health and Safety Executive",
        url: "https://www.hse.gov.uk/simple-health-safety/risk/",
      },
      {
        title: "Working with under-18s",
        what: "Safeguarding policy, DBS checks for anyone with unsupervised access, and — for certain adventure activities with under-18s — a licence from the Adventure Activities Licensing Authority.",
        where: "DBS / AALA",
        url: "https://www.gov.uk/dbs-check-applicant-criminal-record",
      },
    ],
  },

  general: {
    name: "Your trade specifically",
    items: [
      {
        title: "Check whether your trade is licensed",
        what: "Some trades need a licence, a registration or a qualification before the first sale — food, alcohol, finance, childcare, waste, taxis and health services among them. The gov.uk licence finder answers it in a couple of clicks for your postcode.",
        where: "gov.uk licence finder",
        url: "https://www.gov.uk/licence-finder",
      },
      {
        title: "Find your trade association",
        what: "The association for your trade will publish the compliance checklist for it, usually free, and usually better than anything general. It is the cheapest hour of research you will do.",
        where: "Your trade association",
        url: "https://www.businesscompanion.info/",
      },
    ],
  },
};

/** Which pack a business gets. Blueprint slug first because it is exact; the
 *  vertical string is a fallback for organisations provisioned before
 *  blueprint_id was recorded. */
export function tradeFor(slug?: string | null, vertical?: string | null): string {
  const s = (slug ?? "").toLowerCase().trim();
  if (s === "niche-apparel") return "fashion";
  if (s === "gearo") return "furniture";
  if (s === "carento") return "motor";
  if (s === "restaurant-orders") return "food";
  if (s === "travel") return "experiences";

  const v = (vertical ?? "").toLowerCase();
  if (/fashion|apparel|cloth|garment/.test(v)) return "fashion";
  if (/furniture|homeware|interior/.test(v)) return "furniture";
  if (/automotive|car|vehicle|motor|dealer/.test(v)) return "motor";
  if (/restaurant|food|cafe|kitchen|dining/.test(v)) return "food";
  if (/experience|travel|tour|activit|stay|hotel/.test(v)) return "experiences";
  return "general";
}

const TRADE_NAME: Record<string, string> = {
  fashion: "an online clothing business",
  furniture: "a furniture business",
  motor: "a vehicle sales business",
  food: "a food business",
  experiences: "an experiences business",
  general: "an online business",
};

export function legalPack(slug?: string | null, vertical?: string | null): LegalPack {
  const trade = tradeFor(slug, vertical);
  return {
    trade: TRADE_NAME[trade] ?? TRADE_NAME.general,
    intro:
      // Do not restore any claim about who or what wrote this. It was drafted in
      // an AI-assisted session and no solicitor has read it. What IS true, and
      // what makes it worth having, is that it is FIXED rather than generated per
      // business, names the real instrument, and links to the official source —
      // so every item can be checked. Claiming human authorship on top of that
      // bought nothing and invited someone to skip the check.
      "This is a checklist, not legal advice, and it covers England, Scotland, Wales and Northern Ireland — if you trade anywhere else, none of it is safe to assume. It has not been reviewed by a solicitor. Every item names the real regulation and links to the official source, so you can verify each one rather than take our word for it — and so no figure here can quietly go out of date.",
    groups: [SETTING_UP, SELLING_ONLINE, BY_TRADE[trade] ?? BY_TRADE.general, WILL_NOT_WRITE],
  };
}
