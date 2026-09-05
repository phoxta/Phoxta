import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

/** How far into the viewport the element must scroll before it reveals. */
type TriggerPosition = "start" | "middle" | "top";

interface RevealInViewProps extends HTMLMotionProps<"div"> {
    children: ReactNode;
    triggerPosition?: TriggerPosition;
}

// Negative bottom margins shrink the observed viewport so the reveal fires
// only once the element has climbed that far up the screen.
function getViewportMargin(position: TriggerPosition) {
    switch (position) {
        case "middle":
            return "0px 0px -50% 0px";
        case "top":
            return "0px 0px -90% 0px";
        case "start":
        default:
            // A 15% delay past the bottom edge avoids a jitter on first paint.
            return "0px 0px -15% 0px";
    }
}

export function RevealInView({ children, triggerPosition = "start", ...rest }: RevealInViewProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{
                once: true,
                margin: getViewportMargin(triggerPosition),
            }}
            transition={{
                duration: 1.3,
                ease: [0.25, 0.1, 0.25, 1],
            }}
            {...rest}
        >
            {children}
        </motion.div>
    );
}
