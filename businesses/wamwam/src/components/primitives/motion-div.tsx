import { motion } from "motion/react";
import type { ComponentProps } from "react";

/** Thin passthrough so pages can animate a block without importing motion directly. */
export function MotionDiv(props: ComponentProps<typeof motion.div>) {
    return <motion.div {...props} />;
}
