import type { Tool } from "@/lib/founder/types";
import ToolQuiz from "./ToolQuiz";
import ToolCalculator from "./ToolCalculator";
import ToolChecklist from "./ToolChecklist";
import ToolWorksheet from "./ToolWorksheet";
import ToolReference from "./ToolReference";
import ToolGenerator from "./ToolGenerator";

/** One switch: every tool in the toolkit is one of six kinds. */
export default function ToolRenderer({ tool }: { tool: Tool }) {
    switch (tool.kind) {
        case "quiz":
            return <ToolQuiz tool={tool} />;
        case "calculator":
            return <ToolCalculator tool={tool} />;
        case "checklist":
            return <ToolChecklist tool={tool} />;
        case "worksheet":
            return <ToolWorksheet tool={tool} />;
        case "reference":
            return <ToolReference tool={tool} />;
        case "generator":
            return <ToolGenerator tool={tool} />;
        default:
            return null;
    }
}
