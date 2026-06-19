import PageMeta from "@/seo/PageMeta";
import LegalHero from "@/shared/sections/legal/LegalHero";
import LegalContent, { type LegalSection } from "@/shared/sections/legal/LegalContent";

const LAST_UPDATED = "June 18, 2026";

const SECTIONS: LegalSection[] = [
    {
        id: "overview",
        heading: "Overview",
        blocks: [
            {
                type: "p",
                text:
                    "Phoxta is a platform that helps people own, launch, and run AI-powered businesses — from storefronts and booking sites to the operating console and AI agents that act on a business's behalf. This Privacy Policy explains what information we collect, how we use it, and the choices you have. It applies to phoxta.com, the dashboard, and the storefronts we host on your behalf.",
            },
            {
                type: "p",
                text:
                    "We act as a data controller for the account and platform data you provide to us, and as a data processor for the customer data you collect through the businesses you run on Phoxta.",
            },
        ],
    },
    {
        id: "information-we-collect",
        heading: "Information we collect",
        blocks: [
            { type: "p", text: "We collect the following categories of information:" },
            {
                type: "list",
                items: [
                    "Account information — your name, email address, password, organization, and billing details when you sign up or subscribe.",
                    "Business content — the pages, products, listings, media, pricing, and other content you create for the businesses you run on Phoxta.",
                    "Customer data — information your own customers submit through your storefronts, forms, bookings, and conversations (for example contact details, orders, and messages), which you control.",
                    "Usage data — how you interact with the platform, including pages visited, features used, device and browser information, and approximate location derived from your IP address.",
                    "Communications — messages you exchange with us for support, and messages routed through our omnichannel inbox (SMS, WhatsApp, email, and voice).",
                ],
            },
        ],
    },
    {
        id: "how-we-use-information",
        heading: "How we use information",
        blocks: [
            { type: "p", text: "We use the information we collect to:" },
            {
                type: "list",
                items: [
                    "Provide, operate, and maintain the platform and the businesses you run on it.",
                    "Process payments, manage subscriptions, and send service and billing notifications.",
                    "Power AI features such as content generation, agent replies, and recommendations.",
                    "Improve and secure the platform, prevent abuse, and troubleshoot issues.",
                    "Communicate with you about your account, updates, and (where permitted) relevant offers.",
                    "Comply with legal obligations and enforce our Terms of Service.",
                ],
            },
        ],
    },
    {
        id: "ai-features",
        heading: "AI features and automated processing",
        blocks: [
            {
                type: "p",
                text:
                    "Phoxta uses AI models — our own and trusted third-party providers — to generate content, draft replies, transcribe and synthesize voice, and take governed actions on your behalf. When you use these features, the relevant inputs (such as prompts, knowledge-base content, and conversation history) are processed to produce a result.",
            },
            {
                type: "p",
                text:
                    "Agent actions that change data follow your configured policy (off, approve, or auto) and are recorded in an audit log. We do not use your private business content or your customers' data to train foundation models, and we contractually require our AI providers not to do so.",
            },
        ],
    },
    {
        id: "sharing",
        heading: "Sharing and disclosure",
        blocks: [
            {
                type: "p",
                text:
                    "We do not sell your personal information. We share information only as needed to run the service:",
            },
            {
                type: "list",
                items: [
                    "Service providers — hosting, payments, messaging, email, voice, AI, and analytics vendors who process data on our behalf under contract.",
                    "At your direction — integrations and channels you connect to your business.",
                    "Legal and safety — when required by law, to protect rights and safety, or in connection with a merger, acquisition, or sale of assets.",
                ],
            },
        ],
    },
    {
        id: "payments",
        heading: "Payments and third-party services",
        blocks: [
            {
                type: "p",
                text:
                    "Payments are processed by third-party payment providers. We do not store full card numbers on our servers. Messaging, voice, email delivery, custom domains, and AI features are provided through reputable vendors, each of which processes the minimum data needed to deliver that feature.",
            },
        ],
    },
    {
        id: "cookies",
        heading: "Cookies and tracking",
        blocks: [
            {
                type: "p",
                text:
                    "We use cookies and similar technologies to keep you signed in, remember preferences, and understand how the platform is used. You can control cookies through your browser settings; disabling some cookies may affect functionality.",
            },
        ],
    },
    {
        id: "retention",
        heading: "Data retention",
        blocks: [
            {
                type: "p",
                text:
                    "We retain personal information for as long as your account is active or as needed to provide the service, then delete or anonymize it within a reasonable period, unless a longer retention is required for legal, tax, security, or dispute-resolution purposes.",
            },
        ],
    },
    {
        id: "security",
        heading: "Security",
        blocks: [
            {
                type: "p",
                text:
                    "We use technical and organizational safeguards — including encryption in transit, access controls, and audit logging — to protect your information. No method of transmission or storage is completely secure, but we work to protect your data and to notify you of incidents where required by law.",
            },
        ],
    },
    {
        id: "your-rights",
        heading: "Your rights and choices",
        blocks: [
            {
                type: "p",
                text:
                    "Depending on where you live, you may have rights to access, correct, export, or delete your personal information, and to object to or restrict certain processing. You can update most account details in your dashboard, or contact us to exercise your rights. We will respond consistent with applicable law.",
            },
        ],
    },
    {
        id: "international-transfers",
        heading: "International data transfers",
        blocks: [
            {
                type: "p",
                text:
                    "We may process and store information in countries other than your own. Where we transfer personal data across borders, we use appropriate safeguards consistent with applicable data-protection law.",
            },
        ],
    },
    {
        id: "childrens-privacy",
        heading: "Children's privacy",
        blocks: [
            {
                type: "p",
                text:
                    "Phoxta is intended for businesses and is not directed to children under 16. We do not knowingly collect personal information from children. If you believe a child has provided us information, please contact us so we can remove it.",
            },
        ],
    },
    {
        id: "changes",
        heading: "Changes to this policy",
        blocks: [
            {
                type: "p",
                text:
                    "We may update this Privacy Policy from time to time. When we make material changes, we will update the date above and, where appropriate, notify you. Your continued use of Phoxta after changes take effect means you accept the updated policy.",
            },
        ],
    },
];

export default function PrivacyPage() {
    return (
        <>
            <PageMeta
                title="Privacy Policy — Phoxta"
                description="How Phoxta collects, uses, shares, and protects your information across the platform, dashboard, AI features, and the storefronts we host on your behalf."
                path="/privacy"
            />
            <LegalHero
                eyebrow="Legal"
                title="Privacy Policy"
                intro="Your privacy matters to us. This policy explains what we collect, why, and the choices you have when you use Phoxta."
                lastUpdated={LAST_UPDATED}
            />
            <LegalContent sections={SECTIONS} contactEmail="privacy@phoxta.com" />
        </>
    );
}
