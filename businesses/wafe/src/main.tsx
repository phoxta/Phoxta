import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { dropStaleDemoVersions } from "@/data/localCore";
import "@/index.css";
import "@/styles/illustration.css";
import "@/styles/motion.css";
import "@/styles/home.css";

// A visitor who saw an earlier demo still has its blobs; clear them before
// the app reads anything, so the seed they get is the seed we ship.
dropStaleDemoVersions();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
