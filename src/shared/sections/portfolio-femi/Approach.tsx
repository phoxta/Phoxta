const STEPS = [
    { number: "01", title: "Frame the right problem", body: "Clarify the user, business goal, constraints and evidence before the interface becomes the conversation.", proof: "Research · journey mapping · success measures" },
    { number: "02", title: "Align people around decisions", body: "Make trade-offs visible and give product, engineering and stakeholders something concrete to critique early.", proof: "Workshops · prototypes · decision records" },
    { number: "03", title: "Design the system", body: "Resolve the end-to-end journey, states and interaction patterns, then express them as reusable components and rules.", proof: "IA · interaction design · design systems" },
    { number: "04", title: "Ship and learn", body: "Stay close through implementation, test what was built and use behaviour data and feedback to choose the next move.", proof: "Handoff · front end · analytics · iteration" },
] as const;

export default function Approach() {
    return (
        <section id="approach" className="pf2-approach">
            <div className="container-2200 px-3 px-lg-4">
                <div className="pf2-approach__intro">
                    <p className="pf2-kicker"><span aria-hidden="true" /> How I work</p>
                    <h2>Clear direction. Thoughtful craft. Shared ownership.</h2>
                    <p>I work across strategy, craft and delivery. The goal is a team that understands what it is building, why it matters and how success will be judged.</p>
                </div>
                <ol className="pf2-approach__grid">
                    {STEPS.map((step) => (
                        <li key={step.number}>
                            <span>{step.number}</span>
                            <h3>{step.title}</h3>
                            <p>{step.body}</p>
                            <strong>{step.proof}</strong>
                        </li>
                    ))}
                </ol>
                <div className="pf2-bridge">
                    <p>My advantage</p>
                    <h3>I can carry design intent through the last mile.</h3>
                    <p>Hands-on React and TypeScript experience helps me test feasibility early, communicate precisely with engineers and carry design intent into the product that ships.</p>
                </div>
            </div>
        </section>
    );
}
