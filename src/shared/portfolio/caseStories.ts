/** Curated public narratives. Outcomes describe delivery, not unmeasured uplift. */
export interface CaseStory {
  problem: string;
  ownership: string;
  constraint: string;
  decisions: { title: string; rationale: string; tradeoff: string }[];
  figures: { src: string; alt: string; caption: string }[];
  delivered: string;
  next: string;
}

export const CASE_STORIES: Record<string, CaseStory> = {
  phoxta: {
    problem: "Running a small business means moving between customer messages, operations and marketing. Phoxta brings those workflows into one AI-assisted workspace.",
    ownership: "I own product direction, interaction design and the design system, and translate the experience into production React interfaces.",
    constraint: "One platform must support different businesses without overwhelming each owner with irrelevant tools.",
    decisions: [
      { title: "Organise around the work", rationale: "Customers, Operations, Growth and Intelligence give owners a clear starting point. The selected business supplies the context.", tradeoff: "A shared structure needs business-specific content; the same screen cannot serve every operator unchanged." },
      { title: "Keep AI inside the workflow", rationale: "Contextual assistance sits beside the task being performed, so owners can draft a reply or request a change without leaving their work.", tradeoff: "The assistant must understand the current task and make its proposed action visible." },
      { title: "Make human control explicit", rationale: "AI and human-loop controls let owners decide where automation can act and where approval is needed.", tradeoff: "An approval step adds friction, but protects important customer-facing decisions." },
    ],
    figures: [{ src: "/assets/imgs/pages/home-ai-ops/dashboard.webp", alt: "Phoxta console with customer inbox, contextual AI and task panel", caption: "Customer work stays in the centre; business controls and live tasks remain within reach." }],
    delivered: "A live operating console, business marketplace and shared design system, with contextual AI and approval controls.",
    next: "Test whether first-time owners can complete a customer task and identify which actions still need their approval. Prioritise clarity before adding more automation.",
  },
  "coir-six": {
    problem: "Self-paced learners need to know where they left off and what to do next. Course catalogues alone do not answer either question.",
    ownership: "I designed the learner dashboard, reusable components and desktop-to-mobile behaviour.",
    constraint: "Progress, lessons and mentors need to coexist without competing for the learner’s attention.",
    decisions: [
      { title: "Make the next lesson the priority", rationale: "Continue learning appears before discovery. The dashboard starts with the learner’s unfinished work.", tradeoff: "New courses receive less prominence so returning learners can resume quickly." },
      { title: "Give each column a job", rationale: "Navigation, current learning and supporting progress occupy distinct areas. Cards use a consistent hierarchy.", tradeoff: "The three-column layout works on desktop; smaller screens need a different reading order." },
      { title: "Reflow around the learner", rationale: "Mobile stacks the essential content and moves navigation into thumb reach, rather than shrinking the desktop dashboard.", tradeoff: "Secondary information moves further down the page to keep the next action visible." },
    ],
    figures: [{ src: "/assets/imgs/portfolio/coir-six-mobile.webp", alt: "Coir Six responsive learner dashboard", caption: "The same learning hierarchy becomes a focused mobile experience." }],
    delivered: "A responsive learner dashboard and component system covering course progress, lessons and mentor discovery.",
    next: "Validate how quickly learners resume a course, and whether goal tracking helps them choose a manageable next step. Retention impact remains unmeasured.",
  },
  ferne: {
    problem: "Skincare shoppers need product confidence as well as a beautiful brand. Ferne connects ingredient stories with practical buying decisions.",
    ownership: "I designed and built the storefront, catalogue, product detail and checkout experience.",
    constraint: "Preserve an editorial feel while making filtering, stock and purchase steps easy to understand.",
    decisions: [
      { title: "Browse by the customer’s concern", rationale: "Concern, category, price and refillability filters help shoppers narrow the catalogue using their own priorities.", tradeoff: "Filters need consistent product data to remain useful." },
      { title: "Put confidence beside the product", rationale: "Ingredients, size options, stock and reviews support the purchase decision on the product page.", tradeoff: "Rich information needs clear grouping to avoid burying the add-to-cart action." },
      { title: "Keep checkout predictable", rationale: "A three-step flow separates customer details, delivery and confirmation. Validation explains what needs attention.", tradeoff: "A short flow still needs enough detail to prevent ambiguous delivery or order information." },
    ],
    figures: [{ src: "/assets/imgs/portfolio/ferne-shop.webp", alt: "Ferne shop with product filters and catalogue cards", caption: "Shopping controls use plain customer language while the product photography carries the brand." }],
    delivered: "A complete storefront with a filterable catalogue, detailed product pages and a structured checkout.",
    next: "Test product-finding and checkout comprehension with shoppers. Compare where people hesitate before making any conversion claims.",
  },
  saveur: {
    problem: "Restaurant guests arrive with different goals: order food, reserve a table or arrange a special event. Each needs a clear route.",
    ownership: "I led the guest journey and interface design for this reusable Phoxta restaurant storefront.",
    constraint: "Support multiple guest journeys within one coherent restaurant experience.",
    decisions: [
      { title: "Separate the three guest intents", rationale: "Ordering, reservations and special requests have distinct entry points and forms.", tradeoff: "A single universal form would be simpler to build, but harder for guests to interpret." },
      { title: "Make menu choices comparable", rationale: "Course and dietary filters help guests find suitable dishes before building their order.", tradeoff: "Useful dietary guidance depends on accurate menu information." },
      { title: "Explain what happens after ordering", rationale: "An order-status timeline gives guests a visible next step and a shared reference for concierge support.", tradeoff: "Status messages must reflect actual fulfilment; reassuring language cannot substitute for accurate updates." },
    ],
    figures: [],
    delivered: "A restaurant storefront covering menu discovery, ordering, reservations, special requests and order tracking.",
    next: "Validate whether guests can choose the right journey and understand fulfilment status. Measure support demand before claiming fewer enquiries.",
  },
  wamwam: {
    problem: "Travellers need to compare experiences quickly without losing sight of dates, guests and booking requirements.",
    ownership: "I designed search, listing comparison and the responsive booking journey for this Phoxta marketplace.",
    constraint: "Keep booking simple while supporting different guides, experiences and tenant brands.",
    decisions: [
      { title: "Start with three questions", rationale: "Where, when and how many create a focused search entry point.", tradeoff: "More detailed preferences wait until results, reducing effort before the first search." },
      { title: "Make results easy to compare", rationale: "Price, duration, group size and rating follow a consistent card structure.", tradeoff: "Consistent cards favour useful comparisons over a unique layout for every listing." },
      { title: "Keep booking within reach", rationale: "The listing page keeps the booking card accessible while guests explore the experience.", tradeoff: "Persistent controls must leave enough space for content, especially on mobile." },
    ],
    figures: [{ src: "/assets/imgs/portfolio/wamwam-shelf.webp", alt: "WamWam experience listing cards", caption: "A repeatable listing hierarchy supports comparison before guests commit to an experience." }],
    delivered: "A responsive experiences marketplace with search, listing discovery and a booking-focused detail journey.",
    next: "Observe how travellers compare two experiences and identify booking constraints. Test the persistent booking control on smaller screens.",
  },
  aurelia: {
    problem: "Fashion shoppers need the emotion of a campaign and the practical detail of a dependable store.",
    ownership: "I designed the editorial storefront, collection and product flows, and the reusable tenant experience.",
    constraint: "Support brand expression without obscuring sizes, availability or checkout.",
    decisions: [
      { title: "Let one campaign lead", rationale: "A focused editorial opening gives the brand a clear point of view and directs shoppers into the collection.", tradeoff: "Fewer competing promotions means choosing what deserves priority." },
      { title: "Keep the collection approachable", rationale: "Simple category choices and consistent product cards support quick exploration.", tradeoff: "Deeper filtering only becomes valuable when the catalogue contains reliable supporting data." },
      { title: "Resolve uncertainty before checkout", rationale: "Sizes, colour, stock, delivery and returns sit together on the product page.", tradeoff: "Unavailable variants need explicit states instead of allowing a purchase that cannot be fulfilled." },
    ],
    figures: [{ src: "/assets/imgs/portfolio/aurelia-product.webp", alt: "Aurelia product page with purchasing details", caption: "The product page balances editorial photography with the information needed to buy confidently." }],
    delivered: "A branded fashion storefront with collections, variant selection, cart and checkout, reusable across Phoxta businesses.",
    next: "Test whether shoppers understand variant availability and delivery expectations. Verify those decisions across desktop and mobile.",
  },
  technest: {
    problem: "TechNest needed a recognisable payments identity that its marketing team could apply consistently across channels.",
    ownership: "I designed the mark, visual language, applications and brand guideline. This is a brand-system project.",
    constraint: "The identity must work from small digital placements to large campaign applications.",
    decisions: [
      { title: "Build the mark from a simple grid", rationale: "A small set of geometric primitives creates a recognisable symbol and a repeatable construction method.", tradeoff: "A distinctive mark still needs minimum-size and contrast checks in real placements." },
      { title: "Make the system flexible", rationale: "Horizontal, stacked and standalone lockups adapt the identity to different formats.", tradeoff: "Flexibility needs clear rules so applications remain recognisably TechNest." },
      { title: "Design for the next person", rationale: "Colour, typography, patterns and application examples turn the identity into a usable team resource.", tradeoff: "Guidelines need practical examples, not only attractive presentation pages." },
    ],
    figures: [{ src: "/assets/imgs/portfolio/technest-mark.webp", alt: "TechNest geometric logo construction", caption: "The mark’s geometry supplies a consistent starting point for the wider identity." }, { src: "/assets/imgs/portfolio/technest-campaign.webp", alt: "TechNest campaign applications", caption: "Campaign applications show how the system adapts across formats." }],
    delivered: "A complete identity kit and 34-page guideline covering logo use, colour, typography, patterns and applications.",
    next: "Check small-format legibility and have a team member create an application using the guideline alone. Brand impact has not been measured.",
  },
};
