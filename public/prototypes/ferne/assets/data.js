/* Ferne — catalogue data. In production this comes from your commerce API. */
window.FERNE_DATA = {
  currency: "GBP",
  freeShippingThreshold: 40,
  shipping: [
    { id: "standard", name: "Standard", eta: "3–5 working days", price: 3.95 },
    { id: "express", name: "Express", eta: "Next working day", price: 6.95 },
    { id: "collect", name: "Collect in store", eta: "Ready in 2 hours · Birmingham", price: 0 }
  ],
  promos: { WELCOME10: { type: "percent", value: 10 }, FREESHIP: { type: "shipping" }, RITUAL5: { type: "fixed", value: 5 } },
  categories: [
    { id: "face", name: "Face", blurb: "Cleansers, serums and creams", img: "assets/img/cat-face.jpg" },
    { id: "body", name: "Body", blurb: "Oils, balms and washes", img: "assets/img/cat-body.jpg" },
    { id: "sets", name: "Sets & gifts", blurb: "Curated rituals", img: "assets/img/cat-sets.jpg" }
  ],
  concerns: ["Dryness", "Redness", "Texture", "Dullness", "Sensitivity", "Blemishes"],
  products: [
    { id: "morning-oil", name: "Morning Oil", tagline: "Rosehip + sea buckthorn face oil", category: "face", concerns: ["Dullness", "Texture", "Dryness"], price: 28, compareAt: null, rating: 4.9, reviewCount: 612, stock: 42, bestseller: true, isNew: false,
      sizes: [{ id: "30ml", label: "30 ml", price: 28 }, { id: "50ml", label: "50 ml", price: 42 }],
      img: "assets/img/morning-oil.jpg", gallery: ["assets/img/morning-oil.jpg", "assets/img/ing-rosehip.jpg", "assets/img/routine.jpg"],
      description: "A cold-pressed blend of rosehip seed and sea buckthorn that absorbs in seconds, softens texture and brings back the warmth that reads as rested. Three drops, pressed into damp skin.",
      ingredients: "Rosa canina (rosehip) seed oil*, Hippophae rhamnoides (sea buckthorn) fruit oil*, Squalane (olive), Tocopherol. *Organic, traceable to farm.",
      howTo: "Warm three drops between fingertips and press — don't rub — into still-damp skin after cleansing, morning and night. Follow with Dew Cream.",
      skinType: "All skin types, including oily and combination." },
    { id: "cloud-cleanser", name: "Cloud Cleanser", tagline: "Oat milk gel-to-foam wash", category: "face", concerns: ["Sensitivity", "Redness", "Dryness"], price: 22, compareAt: null, rating: 4.8, reviewCount: 488, stock: 60, bestseller: true, isNew: false,
      sizes: [{ id: "150ml", label: "150 ml", price: 22 }, { id: "refill", label: "300 ml refill", price: 36 }],
      img: "assets/img/cloud-cleanser.jpg", gallery: ["assets/img/cloud-cleanser.jpg", "assets/img/ing-oat.jpg", "assets/img/cat-face.jpg"],
      description: "A low-foam gel built on oat lipids that lifts SPF and the day without stripping. Skin is clean, soft and — for once — not tight.",
      ingredients: "Aqua, Avena sativa (oat) kernel oil, Coco-glucoside, Glycerin, Sodium cocoyl isethionate, Panthenol, Allantoin.",
      howTo: "Massage a pump onto damp skin for 60 seconds. Rinse with lukewarm water. Use morning and night.",
      skinType: "Sensitive, dry and reactive skin." },
    { id: "dew-cream", name: "Dew Cream", tagline: "Squalane + ceramide barrier balm", category: "face", concerns: ["Dryness", "Redness", "Sensitivity"], price: 34, compareAt: null, rating: 4.9, reviewCount: 731, stock: 18, bestseller: true, isNew: false,
      sizes: [{ id: "50ml", label: "50 ml", price: 34 }, { id: "refill", label: "50 ml refill pod", price: 26 }],
      img: "assets/img/dew-cream.jpg", gallery: ["assets/img/dew-cream.jpg", "assets/img/hero.jpg", "assets/img/ing-squalane.jpg"],
      description: "A cushiony barrier cream with a 3:1:1 ceramide ratio and olive squalane. Sits beautifully under SPF and makeup, and rebuilds overnight.",
      ingredients: "Aqua, Squalane, Glycerin, Ceramide NP, Ceramide AP, Ceramide EOP, Cholesterol, Shea butter, Oat lipid complex.",
      howTo: "A pea-sized amount pressed over serum or oil as the last step. Reapply to dry patches as needed.",
      skinType: "Dry, dehydrated and barrier-compromised skin." },
    { id: "ritual-set", name: "The Ritual Set", tagline: "Cleanse, treat and seal — 3 steps", category: "sets", concerns: ["Dryness", "Dullness", "Texture"], price: 68, compareAt: 84, rating: 4.9, reviewCount: 204, stock: 25, bestseller: true, isNew: false,
      sizes: [{ id: "full", label: "3 × full size", price: 68 }, { id: "travel", label: "3 × travel size", price: 32 }],
      img: "assets/img/ritual-set.jpg", gallery: ["assets/img/ritual-set.jpg", "assets/img/cat-sets.jpg", "assets/img/routine.jpg"],
      description: "Our three best-sellers in one box, at 15% off buying separately. Cloud Cleanser, Morning Oil and Dew Cream — the whole routine, morning and night.",
      ingredients: "See individual products.",
      howTo: "Cleanse, then press in three drops of oil, then seal with cream. Morning and night.",
      skinType: "All skin types." },
    { id: "night-mask", name: "Overnight Mask", tagline: "Sleeping mask with oat + hyaluronic", category: "face", concerns: ["Dryness", "Dullness"], price: 30, compareAt: null, rating: 4.7, reviewCount: 156, stock: 33, bestseller: false, isNew: true,
      sizes: [{ id: "60ml", label: "60 ml", price: 30 }],
      img: "assets/img/night-mask.jpg", gallery: ["assets/img/night-mask.jpg", "assets/img/ing-oat.jpg"],
      description: "A thick, breathable mask that holds water on the skin for eight hours. Wake to skin that looks like it slept more than you did.",
      ingredients: "Aqua, Glycerin, Sodium hyaluronate (3 weights), Avena sativa kernel extract, Squalane, Betaine.",
      howTo: "Apply a thin layer as the last step two or three nights a week. No need to rinse.",
      skinType: "Dry and dehydrated skin." },
    { id: "body-oil", name: "Body Oil", tagline: "Rosehip + jojoba after-shower oil", category: "body", concerns: ["Dryness", "Texture"], price: 26, compareAt: null, rating: 4.8, reviewCount: 143, stock: 40, bestseller: false, isNew: false,
      sizes: [{ id: "100ml", label: "100 ml", price: 26 }, { id: "250ml", label: "250 ml", price: 48 }],
      img: "assets/img/body-oil.jpg", gallery: ["assets/img/body-oil.jpg", "assets/img/cat-body.jpg"],
      description: "A dry-touch oil for damp skin straight out of the shower. Locks in water, softens elbows and knees, and doesn't mark your clothes.",
      ingredients: "Simmondsia chinensis (jojoba) seed oil, Rosa canina seed oil*, Squalane, Tocopherol.",
      howTo: "Pump onto damp skin after showering and massage in. Pat dry.",
      skinType: "All skin types." },
    { id: "hand-cream", name: "Hand Cream", tagline: "Shea + oat fast-absorb hand balm", category: "body", concerns: ["Dryness", "Sensitivity"], price: 14, compareAt: null, rating: 4.8, reviewCount: 389, stock: 90, bestseller: false, isNew: false,
      sizes: [{ id: "50ml", label: "50 ml tube", price: 14 }],
      img: "assets/img/hand-cream.jpg", gallery: ["assets/img/hand-cream.jpg"],
      description: "Non-greasy in 30 seconds. Shea, oat lipids and glycerin for hands that wash twenty times a day.",
      ingredients: "Aqua, Butyrospermum parkii (shea) butter, Glycerin, Avena sativa kernel oil, Cetearyl alcohol, Allantoin.",
      howTo: "Apply as often as needed. Especially after washing.",
      skinType: "All skin types." },
    { id: "lip-balm", name: "Lip Balm", tagline: "Sea buckthorn tinted balm", category: "face", concerns: ["Dryness"], price: 12, compareAt: null, rating: 4.6, reviewCount: 221, stock: 0, bestseller: false, isNew: true,
      sizes: [{ id: "10ml", label: "10 ml", price: 12 }],
      img: "assets/img/lip-balm.jpg", gallery: ["assets/img/lip-balm.jpg"],
      description: "A sheer apricot tint from sea buckthorn, with shea and beeswax for lips that stay soft through a British winter.",
      ingredients: "Cera alba (beeswax), Butyrospermum parkii butter, Hippophae rhamnoides fruit oil*, Ricinus communis seed oil.",
      howTo: "Apply as needed.",
      skinType: "All." },
    { id: "gua-sha", name: "Gua Sha & Roller Set", tagline: "Hand-cut jade tools with linen pouch", category: "sets", concerns: ["Texture", "Dullness"], price: 38, compareAt: null, rating: 4.7, reviewCount: 98, stock: 12, bestseller: false, isNew: false,
      sizes: [{ id: "set", label: "Set", price: 38 }],
      img: "assets/img/tools.jpg", gallery: ["assets/img/tools.jpg", "assets/img/routine.jpg"],
      description: "Cool, weighty tools for a five-minute lymphatic massage over Morning Oil. Comes with an illustrated guide.",
      ingredients: "Nephrite jade, stainless steel, linen.",
      howTo: "Sweep outward and upward with light pressure over oil, 5 minutes, 3× a week.",
      skinType: "All." }
  ],
  reviews: {
    "morning-oil": [
      { name: "Amara O.", av: "assets/img/av3.jpg", rating: 5, date: "2026-08-12", skin: "Combination", title: "Redness has gone quiet", body: "Six weeks in and the redness across my cheeks has gone quiet for the first time in years. I didn't expect a face oil to be the thing." },
      { name: "Lucas M.", av: "assets/img/av6.jpg", rating: 5, date: "2026-07-30", skin: "Oily", title: "Doesn't break me out", body: "Was nervous about oil on oily skin. Absorbs in seconds, no congestion, and my skin looks less flat." },
      { name: "Hannah W.", av: "assets/img/av4.jpg", rating: 4, date: "2026-07-02", skin: "Normal", title: "Lovely, wish it were bigger", body: "Beautiful texture and glow. Through the 30ml in about six weeks — buy the 50." }
    ],
    "cloud-cleanser": [
      { name: "Daniel K.", av: "assets/img/av1.jpg", rating: 5, date: "2026-08-20", skin: "Dry", title: "First cleanser that doesn't strip", body: "The first one that doesn't leave my face feeling like paper. Bought the refill before the first bottle ran out." }
    ],
    "dew-cream": [
      { name: "Priya S.", av: "assets/img/av7.jpg", rating: 4, date: "2026-08-05", skin: "Sensitive", title: "Perfect under SPF", body: "Sits beautifully under SPF. Four stars only because I wish the jar were a little bigger — I'm through it in five weeks." },
      { name: "Zoe R.", av: "assets/img/av5.jpg", rating: 5, date: "2026-06-18", skin: "Dry", title: "Calmed a flare-up in days", body: "Used it on a winter flare-up and it calmed down in three days. Now a permanent fixture." }
    ]
  },
  journal: [
    { id: "rosehip-72", tag: "Ingredients", title: "Why we press rosehip within 72 hours of harvest", author: "Elin Hart", av: "assets/img/av4.jpg", mins: 6, img: "assets/img/cat-body.jpg", date: "2026-08-28", excerpt: "Vitamin A degrades fast once the seed is cracked. Here's how our Devon grower gets the oil from field to bottle in three days." },
    { id: "barrier-reset", tag: "Routine", title: "Barrier repair: the two-week reset that actually works", author: "Dr. Maya Chen", av: "assets/img/av2.jpg", mins: 9, img: "assets/img/routine.jpg", date: "2026-08-14", excerpt: "Strip the routine back to three steps, stop exfoliating, and give the skin fourteen days. A dermatologist's protocol." },
    { id: "douro-morning", tag: "Sourcing", title: "A morning with our growers in the Douro valley", author: "Tom Alder", av: "assets/img/av5.jpg", mins: 4, img: "assets/img/ing-seabuckthorn.jpg", date: "2026-07-22", excerpt: "Sea buckthorn is harvested frozen, at dawn, by hand. We went to see why." },
    { id: "winter-skin", tag: "Routine", title: "The winter skin edit: what to add, what to drop", author: "Elin Hart", av: "assets/img/av4.jpg", mins: 5, img: "assets/img/j-winter.jpg", date: "2026-06-30", excerpt: "Central heating, wind and less daylight — the four changes that make the season easier on your face." }
  ],
  faqs: [
    { q: "How do refills work?", a: "Every jar and bottle is glass. Buy the refill pod or pouch, decant at home, and recycle the pouch in any soft-plastics collection. Refills are 20–25% cheaper than the first purchase." },
    { q: "Is everything fragrance-free?", a: "Yes. No added fragrance or essential oils in any product. The natural scent of rosehip and sea buckthorn is faint and fades within a minute." },
    { q: "What's your returns policy?", a: "30 days, no questions, even if opened. Start a return from your account page or contact us and we'll send a prepaid label." },
    { q: "Do you ship internationally?", a: "UK, EU and US currently. EU orders ship duties-paid. US orders over $60 ship free." },
    { q: "Are you cruelty-free and vegan?", a: "Cruelty-free, always. Everything is vegan except the Lip Balm, which uses beeswax." }
  ]
};
