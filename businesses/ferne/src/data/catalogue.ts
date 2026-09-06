/**
 * The bundled demo catalogue.
 *
 * This is the FALLBACK, not the source of truth: at runtime the storefront
 * resolves its tenant and loads that business's own products, reviews, journal
 * and FAQs from the Phoxta backend (see `@/lib/phoxta`). These rows keep the
 * store renderable when the backend is unconfigured (local dev) or a tenant has
 * an empty catalogue, so a prospect never lands on a blank shop.
 *
 * Money is in MINOR UNITS (pence) everywhere, matching `products.price_cents`,
 * so nothing has to be converted on the way in or out of the backend.
 */

export type Category = "face" | "body" | "sets";

export type ProductSize = {
    /** Stable key; also the `size` sent to `app_place_order` for variant pricing. */
    id: string;
    label: string;
    priceCents: number;
    stock: number;
    refill: boolean;
};

export type Product = {
    /** Product uuid when live; the slug in the bundled demo. */
    id: string;
    slug: string;
    name: string;
    tagline: string;
    category: Category;
    concerns: string[];
    /** "From" price — the cheapest size. */
    priceCents: number;
    compareAtCents: number | null;
    rating: number;
    reviewCount: number;
    stock: number;
    bestseller: boolean;
    isNew: boolean;
    sizes: ProductSize[];
    img: string;
    gallery: string[];
    description: string;
    ingredients: string;
    howTo: string;
    skinType: string;
};

export type JournalPost = {
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    tags: string[];
    author: string;
    coverUrl: string;
    publishedAt: string;
};

export type Faq = { question: string; body: string };

export type StoreReview = {
    id: string;
    author: string;
    avatar: string | null;
    rating: number;
    title: string;
    body: string;
    /** Product slug/id this review is about; null = about the business. */
    subjectRef: string | null;
    createdAt: string;
};

export const CATEGORIES: { id: Category; name: string; blurb: string; img: string }[] = [
    { id: "face", name: "Face", blurb: "Cleansers, serums and creams", img: "/images/cat-face.jpg" },
    { id: "body", name: "Body", blurb: "Oils, balms and washes", img: "/images/cat-body.jpg" },
    { id: "sets", name: "Sets & gifts", blurb: "Curated rituals", img: "/images/cat-sets.jpg" },
];

export const CONCERNS = ["Dryness", "Redness", "Texture", "Dullness", "Sensitivity", "Blemishes"];

export const PRODUCTS: Product[] = [
    {
        id: "morning-oil",
        slug: "morning-oil",
        name: "Morning Oil",
        tagline: "Rosehip + sea buckthorn face oil",
        category: "face",
        concerns: ["Dullness", "Texture", "Dryness"],
        priceCents: 2800,
        compareAtCents: null,
        rating: 4.9,
        reviewCount: 612,
        stock: 42,
        bestseller: true,
        isNew: false,
        sizes: [
            { id: "30 ml", label: "30 ml", priceCents: 2800, stock: 42, refill: false },
            { id: "50 ml", label: "50 ml", priceCents: 4200, stock: 42, refill: false },
        ],
        img: "/images/morning-oil.jpg",
        gallery: ["/images/morning-oil.jpg", "/images/ing-rosehip.jpg", "/images/routine.jpg"],
        description:
            "A cold-pressed blend of rosehip seed and sea buckthorn that absorbs in seconds, softens texture and brings back the warmth that reads as rested. Three drops, pressed into damp skin.",
        ingredients:
            "Rosa canina (rosehip) seed oil*, Hippophae rhamnoides (sea buckthorn) fruit oil*, Squalane (olive), Tocopherol. *Organic, traceable to farm.",
        howTo:
            "Warm three drops between fingertips and press — don't rub — into still-damp skin after cleansing, morning and night. Follow with Dew Cream.",
        skinType: "All skin types, including oily and combination.",
    },
    {
        id: "cloud-cleanser",
        slug: "cloud-cleanser",
        name: "Cloud Cleanser",
        tagline: "Oat milk gel-to-foam wash",
        category: "face",
        concerns: ["Sensitivity", "Redness", "Dryness"],
        priceCents: 2200,
        compareAtCents: null,
        rating: 4.8,
        reviewCount: 488,
        stock: 60,
        bestseller: true,
        isNew: false,
        sizes: [
            { id: "150 ml", label: "150 ml", priceCents: 2200, stock: 60, refill: false },
            { id: "300 ml refill", label: "300 ml refill", priceCents: 3600, stock: 60, refill: true },
        ],
        img: "/images/cloud-cleanser.jpg",
        gallery: ["/images/cloud-cleanser.jpg", "/images/ing-oat.jpg", "/images/cat-face.jpg"],
        description:
            "A low-foam gel built on oat lipids that lifts SPF and the day without stripping. Skin is clean, soft and — for once — not tight.",
        ingredients:
            "Aqua, Avena sativa (oat) kernel oil, Coco-glucoside, Glycerin, Sodium cocoyl isethionate, Panthenol, Allantoin.",
        howTo: "Massage a pump onto damp skin for 60 seconds. Rinse with lukewarm water. Use morning and night.",
        skinType: "Sensitive, dry and reactive skin.",
    },
    {
        id: "dew-cream",
        slug: "dew-cream",
        name: "Dew Cream",
        tagline: "Squalane + ceramide barrier balm",
        category: "face",
        concerns: ["Dryness", "Redness", "Sensitivity"],
        priceCents: 3400,
        compareAtCents: null,
        rating: 4.9,
        reviewCount: 731,
        stock: 18,
        bestseller: true,
        isNew: false,
        sizes: [
            { id: "50 ml", label: "50 ml", priceCents: 3400, stock: 18, refill: false },
            { id: "50 ml refill pod", label: "50 ml refill pod", priceCents: 2600, stock: 18, refill: true },
        ],
        img: "/images/dew-cream.jpg",
        gallery: ["/images/dew-cream.jpg", "/images/hero.jpg", "/images/ing-squalane.jpg"],
        description:
            "A cushiony barrier cream with a 3:1:1 ceramide ratio and olive squalane. Sits beautifully under SPF and makeup, and rebuilds overnight.",
        ingredients:
            "Aqua, Squalane, Glycerin, Ceramide NP, Ceramide AP, Ceramide EOP, Cholesterol, Shea butter, Oat lipid complex.",
        howTo: "A pea-sized amount pressed over serum or oil as the last step. Reapply to dry patches as needed.",
        skinType: "Dry, dehydrated and barrier-compromised skin.",
    },
    {
        id: "ritual-set",
        slug: "ritual-set",
        name: "The Ritual Set",
        tagline: "Cleanse, treat and seal — 3 steps",
        category: "sets",
        concerns: ["Dryness", "Dullness", "Texture"],
        priceCents: 6800,
        compareAtCents: 8400,
        rating: 4.9,
        reviewCount: 204,
        stock: 25,
        bestseller: true,
        isNew: false,
        sizes: [
            { id: "3 × full size", label: "3 × full size", priceCents: 6800, stock: 25, refill: false },
            { id: "3 × travel size", label: "3 × travel size", priceCents: 3200, stock: 25, refill: false },
        ],
        img: "/images/ritual-set.jpg",
        gallery: ["/images/ritual-set.jpg", "/images/cat-sets.jpg", "/images/routine.jpg"],
        description:
            "Our three best-sellers in one box, at 15% off buying separately. Cloud Cleanser, Morning Oil and Dew Cream — the whole routine, morning and night.",
        ingredients: "See individual products.",
        howTo: "Cleanse, then press in three drops of oil, then seal with cream. Morning and night.",
        skinType: "All skin types.",
    },
    {
        id: "night-mask",
        slug: "night-mask",
        name: "Overnight Mask",
        tagline: "Sleeping mask with oat + hyaluronic",
        category: "face",
        concerns: ["Dryness", "Dullness"],
        priceCents: 3000,
        compareAtCents: null,
        rating: 4.7,
        reviewCount: 156,
        stock: 33,
        bestseller: false,
        isNew: true,
        sizes: [{ id: "60 ml", label: "60 ml", priceCents: 3000, stock: 33, refill: false }],
        img: "/images/night-mask.jpg",
        gallery: ["/images/night-mask.jpg", "/images/ing-oat.jpg"],
        description:
            "A thick, breathable mask that holds water on the skin for eight hours. Wake to skin that looks like it slept more than you did.",
        ingredients:
            "Aqua, Glycerin, Sodium hyaluronate (3 weights), Avena sativa kernel extract, Squalane, Betaine.",
        howTo: "Apply a thin layer as the last step two or three nights a week. No need to rinse.",
        skinType: "Dry and dehydrated skin.",
    },
    {
        id: "body-oil",
        slug: "body-oil",
        name: "Body Oil",
        tagline: "Rosehip + jojoba after-shower oil",
        category: "body",
        concerns: ["Dryness", "Texture"],
        priceCents: 2600,
        compareAtCents: null,
        rating: 4.8,
        reviewCount: 143,
        stock: 40,
        bestseller: false,
        isNew: false,
        sizes: [
            { id: "100 ml", label: "100 ml", priceCents: 2600, stock: 40, refill: false },
            { id: "250 ml", label: "250 ml", priceCents: 4800, stock: 40, refill: false },
        ],
        img: "/images/body-oil.jpg",
        gallery: ["/images/body-oil.jpg", "/images/cat-body.jpg"],
        description:
            "A dry-touch oil for damp skin straight out of the shower. Locks in water, softens elbows and knees, and doesn't mark your clothes.",
        ingredients: "Simmondsia chinensis (jojoba) seed oil, Rosa canina seed oil*, Squalane, Tocopherol.",
        howTo: "Pump onto damp skin after showering and massage in. Pat dry.",
        skinType: "All skin types.",
    },
    {
        id: "hand-cream",
        slug: "hand-cream",
        name: "Hand Cream",
        tagline: "Shea + oat fast-absorb hand balm",
        category: "body",
        concerns: ["Dryness", "Sensitivity"],
        priceCents: 1400,
        compareAtCents: null,
        rating: 4.8,
        reviewCount: 389,
        stock: 90,
        bestseller: false,
        isNew: false,
        sizes: [{ id: "50 ml tube", label: "50 ml tube", priceCents: 1400, stock: 90, refill: false }],
        img: "/images/hand-cream.jpg",
        gallery: ["/images/hand-cream.jpg"],
        description:
            "Non-greasy in 30 seconds. Shea, oat lipids and glycerin for hands that wash twenty times a day.",
        ingredients:
            "Aqua, Butyrospermum parkii (shea) butter, Glycerin, Avena sativa kernel oil, Cetearyl alcohol, Allantoin.",
        howTo: "Apply as often as needed. Especially after washing.",
        skinType: "All skin types.",
    },
    {
        id: "lip-balm",
        slug: "lip-balm",
        name: "Lip Balm",
        tagline: "Sea buckthorn tinted balm",
        category: "face",
        concerns: ["Dryness"],
        priceCents: 1200,
        compareAtCents: null,
        rating: 4.6,
        reviewCount: 221,
        stock: 0,
        bestseller: false,
        isNew: true,
        sizes: [{ id: "10 ml", label: "10 ml", priceCents: 1200, stock: 0, refill: false }],
        img: "/images/lip-balm.jpg",
        gallery: ["/images/lip-balm.jpg"],
        description:
            "A sheer apricot tint from sea buckthorn, with shea and beeswax for lips that stay soft through a British winter.",
        ingredients:
            "Cera alba (beeswax), Butyrospermum parkii butter, Hippophae rhamnoides fruit oil*, Ricinus communis seed oil.",
        howTo: "Apply as needed.",
        skinType: "All.",
    },
    {
        id: "gua-sha",
        slug: "gua-sha",
        name: "Gua Sha & Roller Set",
        tagline: "Hand-cut jade tools with linen pouch",
        category: "sets",
        concerns: ["Texture", "Dullness"],
        priceCents: 3800,
        compareAtCents: null,
        rating: 4.7,
        reviewCount: 98,
        stock: 12,
        bestseller: false,
        isNew: false,
        sizes: [{ id: "Set", label: "Set", priceCents: 3800, stock: 12, refill: false }],
        img: "/images/tools.jpg",
        gallery: ["/images/tools.jpg", "/images/routine.jpg"],
        description:
            "Cool, weighty tools for a five-minute lymphatic massage over Morning Oil. Comes with an illustrated guide.",
        ingredients: "Nephrite jade, stainless steel, linen.",
        howTo: "Sweep outward and upward with light pressure over oil, 5 minutes, 3× a week.",
        skinType: "All.",
    },
];

export const REVIEWS: StoreReview[] = [
    {
        id: "r-morning-1",
        author: "Amara O.",
        avatar: "/images/av3.jpg",
        rating: 5,
        title: "Redness has gone quiet",
        body:
            "Six weeks in and the redness across my cheeks has gone quiet for the first time in years. I didn't expect a face oil to be the thing.",
        subjectRef: "morning-oil",
        createdAt: "2026-08-12T00:00:00.000Z",
    },
    {
        id: "r-morning-2",
        author: "Lucas M.",
        avatar: "/images/av6.jpg",
        rating: 5,
        title: "Doesn't break me out",
        body: "Was nervous about oil on oily skin. Absorbs in seconds, no congestion, and my skin looks less flat.",
        subjectRef: "morning-oil",
        createdAt: "2026-07-30T00:00:00.000Z",
    },
    {
        id: "r-morning-3",
        author: "Hannah W.",
        avatar: "/images/av4.jpg",
        rating: 4,
        title: "Lovely, wish it were bigger",
        body: "Beautiful texture and glow. Through the 30 ml in about six weeks — buy the 50.",
        subjectRef: "morning-oil",
        createdAt: "2026-07-02T00:00:00.000Z",
    },
    {
        id: "r-cleanser-1",
        author: "Daniel K.",
        avatar: "/images/av1.jpg",
        rating: 5,
        title: "First cleanser that doesn't strip",
        body:
            "The first one that doesn't leave my face feeling like paper. Bought the refill before the first bottle ran out.",
        subjectRef: "cloud-cleanser",
        createdAt: "2026-08-20T00:00:00.000Z",
    },
    {
        id: "r-dew-1",
        author: "Priya S.",
        avatar: "/images/av7.jpg",
        rating: 4,
        title: "Perfect under SPF",
        body:
            "Sits beautifully under SPF. Four stars only because I wish the jar were a little bigger — I'm through it in five weeks.",
        subjectRef: "dew-cream",
        createdAt: "2026-08-05T00:00:00.000Z",
    },
    {
        id: "r-dew-2",
        author: "Zoe R.",
        avatar: "/images/av5.jpg",
        rating: 5,
        title: "Calmed a flare-up in days",
        body: "Used it on a winter flare-up and it calmed down in three days. Now a permanent fixture.",
        subjectRef: "dew-cream",
        createdAt: "2026-06-18T00:00:00.000Z",
    },
];

export const JOURNAL: JournalPost[] = [
    {
        slug: "rosehip-72",
        title: "Why we press rosehip within 72 hours of harvest",
        excerpt:
            "Vitamin A degrades fast once the seed is cracked. Here's how our Devon grower gets the oil from field to bottle in three days.",
        body:
            "Every batch we press starts with a phone call — the grower tells us the fruit is ready, and the clock starts. Vitamin A in rosehip degrades measurably within days of the seed being cracked, so the difference between an oil that works and one that merely smells nice is mostly logistics.\n\nCold-pressing at low temperature keeps the trans-retinoic acid precursors intact. We test each batch by HPLC before it's bottled; anything below our threshold is diverted to body products where the bar is different.\n\nThat's also why we don't hold stock for long. Bottles are numbered, and the number on the base of yours tells you the harvest week. Use fresh oil, store it out of the light, and don't be precious — three drops morning and night is more effective than a heavy layer once a week.",
        tags: ["Ingredients"],
        author: "Elin Hart",
        coverUrl: "/images/cat-body.jpg",
        publishedAt: "2026-08-28T00:00:00.000Z",
    },
    {
        slug: "barrier-reset",
        title: "Barrier repair: the two-week reset that actually works",
        excerpt:
            "Strip the routine back to three steps, stop exfoliating, and give the skin fourteen days. A dermatologist's protocol.",
        body:
            "A compromised barrier is not a mystery, it is a maintenance problem. For fourteen days: cleanse once a day with something that does not foam hard, press in an oil while the skin is damp, and seal with a ceramide cream. Nothing else.\n\nNo acids, no retinoids, no scrubs, no clay. The point is to stop interrupting the repair rather than to accelerate it.\n\nMost people see the redness settle in the first week and the tightness go in the second. If it hasn't moved by day fourteen, the problem is probably not your routine — see someone about it.",
        tags: ["Routine"],
        author: "Dr. Maya Chen",
        coverUrl: "/images/routine.jpg",
        publishedAt: "2026-08-14T00:00:00.000Z",
    },
    {
        slug: "douro-morning",
        title: "A morning with our growers in the Douro valley",
        excerpt: "Sea buckthorn is harvested frozen, at dawn, by hand. We went to see why.",
        body:
            "The berries are too soft to pick warm — they burst. So the whole harvest happens in the two hours after first light, when the fruit is still frozen on the branch and comes away clean.\n\nIt is cold, slow work done by about a dozen people on a hillside above the river, and it is the reason the oil is the colour it is.\n\nWe buy the whole run from one family and press it in the same week. That is the entire supply chain, and it fits on a postcard.",
        tags: ["Sourcing"],
        author: "Tom Alder",
        coverUrl: "/images/ing-seabuckthorn.jpg",
        publishedAt: "2026-07-22T00:00:00.000Z",
    },
    {
        slug: "winter-skin",
        title: "The winter skin edit: what to add, what to drop",
        excerpt:
            "Central heating, wind and less daylight — the four changes that make the season easier on your face.",
        body:
            "Add: one extra layer of oil at night, a humidifier in the bedroom, and a balm on anything the wind actually touches.\n\nDrop: the second cleanse, any acid you are using more than twice a week, and very hot water.\n\nKeep: SPF. Overcast is not the same as dark, and the UVA that ages skin is there all winter.",
        tags: ["Routine"],
        author: "Elin Hart",
        coverUrl: "/images/j-winter.jpg",
        publishedAt: "2026-06-30T00:00:00.000Z",
    },
];

export const FAQS: Faq[] = [
    {
        question: "How do refills work?",
        body:
            "Every jar and bottle is glass. Buy the refill pod or pouch, decant at home, and recycle the pouch in any soft-plastics collection. Refills are 20–25% cheaper than the first purchase.",
    },
    {
        question: "Is everything fragrance-free?",
        body:
            "Yes. No added fragrance or essential oils in any product. The natural scent of rosehip and sea buckthorn is faint and fades within a minute.",
    },
    {
        question: "What's your returns policy?",
        body:
            "30 days, no questions, even if opened. Start a return from your account page or contact us and we'll send a prepaid label.",
    },
    {
        question: "Do you ship internationally?",
        body: "UK, EU and US currently. EU orders ship duties-paid. US orders over $60 ship free.",
    },
    {
        question: "Are you cruelty-free and vegan?",
        body: "Cruelty-free, always. Everything is vegan except the Lip Balm, which uses beeswax.",
    },
];
