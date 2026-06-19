import PageMeta from "@/seo/PageMeta";
import LegalHero from "@/shared/sections/legal/LegalHero";
import LegalContent, { type LegalSection } from "@/shared/sections/legal/LegalContent";

const LAST_UPDATED = "June 18, 2026";

const SECTIONS: LegalSection[] = [
    {
        id: "acceptance",
        heading: "Acceptance of these terms",
        blocks: [
            {
                type: "p",
                text:
                    "These Terms of Service (the \"Terms\") govern your access to and use of Phoxta — including phoxta.com, the dashboard, the operating console, AI agents, and the storefronts we host on your behalf (together, the \"Service\"). By creating an account or using the Service, you agree to these Terms. If you are using Phoxta on behalf of an organization, you represent that you have authority to bind that organization.",
            },
        ],
    },
    {
        id: "the-service",
        heading: "The service",
        blocks: [
            {
                type: "p",
                text:
                    "Phoxta lets you launch and run AI-powered businesses — building sites and storefronts, managing commerce, bookings, content, and customer conversations, and configuring AI agents that can act on your business's behalf. Features evolve over time; we may add, change, or remove functionality, and will use reasonable efforts to notify you of material changes.",
            },
        ],
    },
    {
        id: "accounts",
        heading: "Accounts and eligibility",
        blocks: [
            {
                type: "p",
                text:
                    "You must provide accurate information, keep your credentials secure, and are responsible for all activity under your account. You must be at least 18 years old and capable of forming a binding contract. Notify us promptly of any unauthorized use of your account.",
            },
        ],
    },
    {
        id: "your-content",
        heading: "Your businesses and content",
        blocks: [
            {
                type: "p",
                text:
                    "You retain ownership of the content, products, and data you bring to or create on Phoxta (\"Your Content\"). You grant us a limited license to host, process, display, and transmit Your Content solely to operate the Service for you. You are responsible for Your Content and for ensuring it does not infringe others' rights or violate applicable law.",
            },
            {
                type: "p",
                text:
                    "You are responsible for your relationship with your own customers, including your own privacy notices, fulfillment, refunds, and support for the businesses you run on Phoxta.",
            },
        ],
    },
    {
        id: "acceptable-use",
        heading: "Acceptable use",
        blocks: [
            { type: "p", text: "You agree not to use the Service to:" },
            {
                type: "list",
                items: [
                    "Break the law or infringe intellectual property, privacy, or other rights.",
                    "Send spam or unsolicited messages, or violate messaging and telephony regulations (including SMS, WhatsApp, and voice rules such as consent and opt-out requirements).",
                    "Upload malware, attempt to breach security, or disrupt or overload the Service.",
                    "Sell prohibited goods or services, or engage in fraud, deception, or abuse.",
                    "Reverse engineer, resell, or misuse the Service except as expressly permitted.",
                ],
            },
        ],
    },
    {
        id: "ai-features",
        heading: "AI features and automated actions",
        blocks: [
            {
                type: "p",
                text:
                    "Phoxta provides AI features that generate content, draft and send replies, handle calls, and take governed actions on your behalf. AI output can be inaccurate or incomplete; you are responsible for reviewing it before relying on it. Agent actions that change data follow the policy you configure (off, approve, or auto) and are recorded in an audit log. You are responsible for the configuration you choose and the actions taken under it.",
            },
        ],
    },
    {
        id: "billing",
        heading: "Subscriptions, billing, and refunds",
        blocks: [
            {
                type: "p",
                text:
                    "Paid plans are billed in advance on a recurring basis through our payment provider and renew automatically until cancelled. Fees are stated at checkout and may exclude taxes. You can cancel at any time; cancellation takes effect at the end of the current billing period. Usage-based charges (for example messaging, voice, or AI usage) are billed as incurred.",
            },
            {
                type: "p",
                text:
                    "Except where required by law, fees are non-refundable. We may change pricing on a going-forward basis with reasonable notice.",
            },
        ],
    },
    {
        id: "domains-third-parties",
        heading: "Custom domains and third-party services",
        blocks: [
            {
                type: "p",
                text:
                    "You may connect your own domain or purchase one through the dashboard; domains and certain features rely on third-party providers whose own terms apply. Your use of connected third-party services is at your own risk, and we are not responsible for their availability or conduct.",
            },
        ],
    },
    {
        id: "intellectual-property",
        heading: "Intellectual property",
        blocks: [
            {
                type: "p",
                text:
                    "The Service, including its software, design, templates, and trademarks, is owned by Phoxta and its licensors and is protected by intellectual-property laws. Except for the rights expressly granted to you, we reserve all rights in the Service.",
            },
        ],
    },
    {
        id: "termination",
        heading: "Termination",
        blocks: [
            {
                type: "p",
                text:
                    "You may stop using the Service and close your account at any time. We may suspend or terminate your access if you breach these Terms, fail to pay, or use the Service in a way that creates risk or legal exposure. On termination, your right to use the Service ends; we may delete Your Content after a reasonable period, so keep your own backups.",
            },
        ],
    },
    {
        id: "disclaimers",
        heading: "Disclaimers",
        blocks: [
            {
                type: "p",
                text:
                    "The Service is provided \"as is\" and \"as available\" without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or that AI output will be accurate.",
            },
        ],
    },
    {
        id: "liability",
        heading: "Limitation of liability",
        blocks: [
            {
                type: "p",
                text:
                    "To the maximum extent permitted by law, Phoxta will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, or data. Our total liability for any claim relating to the Service will not exceed the amount you paid us in the 12 months before the event giving rise to the claim.",
            },
        ],
    },
    {
        id: "indemnification",
        heading: "Indemnification",
        blocks: [
            {
                type: "p",
                text:
                    "You agree to indemnify and hold Phoxta harmless from claims, damages, and expenses arising out of Your Content, your businesses, your use of the Service, or your violation of these Terms or applicable law.",
            },
        ],
    },
    {
        id: "governing-law",
        heading: "Governing law and disputes",
        blocks: [
            {
                type: "p",
                text:
                    "These Terms are governed by the laws of the jurisdiction in which Phoxta is established, without regard to conflict-of-law rules. The courts of that jurisdiction will have exclusive jurisdiction over disputes, except where mandatory local law provides otherwise.",
            },
        ],
    },
    {
        id: "changes",
        heading: "Changes to these terms",
        blocks: [
            {
                type: "p",
                text:
                    "We may update these Terms from time to time. When we make material changes, we will update the date above and, where appropriate, notify you. Your continued use of the Service after changes take effect means you accept the updated Terms.",
            },
        ],
    },
];

export default function TermsPage() {
    return (
        <>
            <PageMeta
                title="Terms of Service — Phoxta"
                description="The terms that govern your use of Phoxta — the platform, dashboard, AI agents, billing, and the storefronts we host on your behalf."
                path="/terms"
            />
            <LegalHero
                eyebrow="Legal"
                title="Terms of Service"
                intro="These terms set out the rules for using Phoxta and the businesses you build and run on it. Please read them carefully."
                lastUpdated={LAST_UPDATED}
            />
            <LegalContent sections={SECTIONS} contactEmail="legal@phoxta.com" />
        </>
    );
}
