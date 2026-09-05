import ButtonPrimary from "@/components/primitives/button-primary";
import { Divider } from "@/components/primitives/divider";
import { Field, Label } from "@/components/primitives/fieldset";
import { Heading } from "@/components/primitives/heading";
import Input from "@/components/primitives/input";
import QueryForm from "@/lib/nav/form";
import type { RouteProps } from "@/app/route-renderer";

/** Design-system password template — ported, unrouted and unwired. */

const handleSubmitForm = (_formData: FormData) => {
    // Intentionally inert: this template has no backend.
};

export default function Page(_props: RouteProps) {
    return (
        <div>
            {/* HEADING */}
            <Heading level={1}>
                Update your <span data-slot="italic">password</span>
            </Heading>

            <Divider className="my-8 w-14!" />

            <QueryForm action={handleSubmitForm} className="max-w-xl space-y-6">
                <Field>
                    <Label>Current password</Label>
                    <Input type="password" className="mt-1.5" />
                </Field>
                <Field>
                    <Label>New password</Label>
                    <Input type="password" className="mt-1.5" />
                </Field>
                <Field>
                    <Label>Confirm password</Label>
                    <Input type="password" className="mt-1.5" />
                </Field>
                <div className="pt-4">
                    <ButtonPrimary type="submit">Update password</ButtonPrimary>
                </div>
            </QueryForm>
        </div>
    );
}
