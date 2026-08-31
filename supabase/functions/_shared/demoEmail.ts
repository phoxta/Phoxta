export const DEMO_WELCOME_EMAIL = (name: string, demoTitle: string) => ({
  subject: `Welcome to the Phoxta Demo: ${demoTitle}`,
  preheader: "Your five-day access pass is active.",
  blocks: [
    { type: "text", text: `Hi ${name},` },
    { type: "text", text: `Thanks for checking out the Phoxta platform! You now have a five-day all-access pass to explore our full suite of agentic business blueprints. You started with the **${demoTitle}** demo.` },
    { type: "text", text: "Every demo on our platform is a fully functional, production-ready environment representing exactly what you'll get when you deploy." },
    { type: "facts", rows: [
      ["Features to explore", "Omnichannel AI Operators, Autonomous logic routing, the unified Agentic Console"],
      ["Pass expires", "In 5 days"]
    ]},
    { type: "text", text: "Feel free to poke around, and if you have any questions or are ready to launch your autonomous empire, reply directly to this email." },
    { type: "button", label: "Return to the Platform", href: "https://www.phoxta.com" },
    { type: "text", text: "Best,\nThe Phoxta Team" }
  ]
});
