import Logo from "@/components/chrome/logo";
import ButtonPrimary from "@/components/primitives/button-primary";
import { Field, Label } from "@/components/primitives/fieldset";
import Input from "@/components/primitives/input";
import AppLink from "@/lib/nav/link";
import { socials } from "@/routes/account/templates/auth-socials";
import type { RouteProps } from "@/app/route-renderer";

/**
 * Design-system login template — ported, unrouted and unwired.
 *
 * /login renders routes/account/account.tsx, which signs the customer in
 * against Supabase. This form posts nowhere.
 */
export default function Page(_props: RouteProps) {
    return (
        <div className="container">
            <div className="my-16 flex justify-center">
                <Logo className="w-32" />
            </div>

            <div className="mx-auto max-w-md space-y-6">
                <div className="grid gap-3">
                    {socials.map((item, index) => (
                        <AppLink
                            key={index}
                            href={item.href}
                            className="flex w-full rounded-lg bg-primary-foreground px-4 py-3 transition-transform hover:translate-y-0.5 dark:bg-neutral-800"
                        >
                            <item.icon className="size-5 shrink-0" />
                            <p className="grow text-center text-sm font-medium text-neutral-700 dark:text-neutral-300">{item.name}</p>
                        </AppLink>
                    ))}
                </div>
                {/* OR */}
                <div className="relative text-center">
                    <span className="relative z-10 inline-block bg-white px-4 text-sm font-medium dark:bg-neutral-900 dark:text-neutral-400">
                        OR
                    </span>
                    <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 border border-neutral-100 dark:border-neutral-800"></div>
                </div>
                {/* FORM */}
                <form className="grid grid-cols-1 gap-6" action="#" method="post">
                    <Field className="block">
                        <Label className="text-neutral-800 dark:text-neutral-200">Email address</Label>
                        <Input type="email" placeholder="example@example.com" className="mt-1" />
                    </Field>
                    <Field className="block">
                        <div className="flex items-center justify-between text-neutral-800 dark:text-neutral-200">
                            <Label>Password</Label>
                            <AppLink href="/forgot-password" className="text-sm font-medium underline">
                                Forgot password?
                            </AppLink>
                        </div>
                        <Input type="password" className="mt-1" />
                    </Field>
                    <ButtonPrimary type="submit">Login</ButtonPrimary>
                </form>

                {/* ==== */}
                <div className="block text-center text-sm text-neutral-700 dark:text-neutral-300">
                    New user? {` `}
                    <AppLink href="/signup" className="font-medium underline">
                        Create an account
                    </AppLink>
                </div>
            </div>
        </div>
    );
}
