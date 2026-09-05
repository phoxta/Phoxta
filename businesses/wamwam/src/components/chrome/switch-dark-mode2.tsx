import { Switch } from "@headlessui/react";
import clsx from "clsx";
import { useTheme } from "next-themes";

interface SwitchDarkMode2Props {
    className?: string;
}

export default function SwitchDarkMode2({ className }: SwitchDarkMode2Props) {
    const { setTheme, theme } = useTheme();

    return (
        <div className={clsx("inline-flex", className)}>
            <Switch
                checked={theme === "dark"}
                onChange={(val) => setTheme(val ? "dark" : "light")}
                className={`${theme === "dark" ? "bg-teal-900" : "bg-teal-600"} relative inline-flex h-[22px] w-[42px] shrink-0 cursor-pointer rounded-full border-4 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white/75`}
            >
                <span className="sr-only">Enable dark mode</span>
                <span
                    aria-hidden="true"
                    className={`${theme === "dark" ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"} pointer-events-none inline-block h-[14px] w-[14px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
                />
            </Switch>
        </div>
    );
}
