import { Link } from "react-router-dom";
import {
  Database,
  Mail,
  MessageSquare,
  PhoneCall,
  ShoppingCart,
} from "lucide-react";
import type { ReactNode } from "react";

function OrbitNode({
  x,
  y,
  size = 52,
  className,
  children,
}: {
  x: number;
  y: number;
  size?: number;
  className: string;
  children: ReactNode;
}) {
  return (
    <foreignObject
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      className={"phoxta-ai-ops__node " + className}
    >
      <div className="phoxta-ai-ops__node-content">{children}</div>
    </foreignObject>
  );
}

export default function AIOpsShowcase() {
  return (
    <section className="phoxta-ai-ops" aria-labelledby="phoxta-ai-ops-title">
      <div className="phoxta-ai-ops__orbit" aria-hidden="true">
        <svg
          className="phoxta-ai-ops__orbit-svg phoxta-ai-ops__orbit-svg--desktop"
          viewBox="0 0 1440 560"
        >
          <circle cx="720" cy="780" r="650" />
          <circle cx="720" cy="850" r="600" />

          <OrbitNode x={356} y={241} className="phoxta-ai-ops__node--avatar-left">
            <img src="/assets/imgs/template/avatar/avatar-8.webp" alt="" />
          </OrbitNode>
          <OrbitNode x={157} y={455} className="phoxta-ai-ops__node--phone">
            <PhoneCall />
          </OrbitNode>
          <OrbitNode x={334} y={390} className="phoxta-ai-ops__node--mail">
            <Mail />
          </OrbitNode>
          <OrbitNode x={1002} y={320} size={62} className="phoxta-ai-ops__node--avatar-right">
            <img src="/assets/imgs/template/avatar/avatar-16.webp" alt="" />
          </OrbitNode>
          <OrbitNode x={1146} y={289} className="phoxta-ai-ops__node--message">
            <MessageSquare />
          </OrbitNode>
          <OrbitNode x={1137} y={433} className="phoxta-ai-ops__node--cart">
            <ShoppingCart />
          </OrbitNode>
          <OrbitNode x={1283} y={455} className="phoxta-ai-ops__node--database">
            <Database />
          </OrbitNode>
        </svg>

        <svg
          className="phoxta-ai-ops__orbit-svg phoxta-ai-ops__orbit-svg--mobile"
          viewBox="0 0 390 300"
        >
          <circle cx="195" cy="330" r="250" />
          <circle cx="195" cy="365" r="185" />

          <OrbitNode x={68} y={116} size={40} className="phoxta-ai-ops__node--avatar-left">
            <img src="/assets/imgs/template/avatar/avatar-8.webp" alt="" />
          </OrbitNode>
          <OrbitNode x={322} y={133} size={40} className="phoxta-ai-ops__node--message">
            <MessageSquare />
          </OrbitNode>
          <OrbitNode x={91} y={216} size={38} className="phoxta-ai-ops__node--mail">
            <Mail />
          </OrbitNode>
          <OrbitNode x={270} y={196} size={44} className="phoxta-ai-ops__node--avatar-right">
            <img src="/assets/imgs/template/avatar/avatar-16.webp" alt="" />
          </OrbitNode>
        </svg>
      </div>

      <div className="phoxta-ai-ops__content">
        <h2 id="phoxta-ai-ops-title">
          Phoxta AI-Ops is an{" "}
          <strong>
            intelligent control center
          </strong>{" "}
          that powers your business end-to-end with niche-specific innovation.
        </h2>
        <Link className="phoxta-ai-ops__cta" to="/auth?mode=signup&redirect=/dashboard">
          Get Started
        </Link>
      </div>

      <div className="phoxta-ai-ops__media">
        <img
          src="/assets/imgs/pages/home-ai-ops/dashboard.webp"
          alt="Phoxta operating dashboard with workspace navigation, AI Operator, revenue and business setup panels"
          width={1440}
          height={852}
          loading="lazy"
        />
      </div>
    </section>
  );
}
