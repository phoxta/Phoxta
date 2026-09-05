import { PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import ButtonPrimary from "@/components/primitives/button-primary";
import { Divider } from "@/components/primitives/divider";
import { Fieldset, Label, Legend } from "@/components/primitives/fieldset";
import { Heading } from "@/components/primitives/heading";
import Input from "@/components/primitives/input";
import { Radio, RadioField, RadioGroup } from "@/components/primitives/radio";
import QueryForm from "@/lib/nav/form";
import { useRouter } from "@/lib/nav/navigation";

/** The additional-rules list is static in the template; the row is a plain renderer, not a component. */
function renderNoInclude(text: string) {
    return (
        <div className="flex items-center justify-between py-3">
            <span className="flex-1 text-neutral-600 dark:text-neutral-400">{text}</span>
            <div className="cursor-pointer">
                <XMarkIcon className="h-4 w-4" />
            </div>
        </div>
    );
}

export default function AddListingStep5() {
    const router = useRouter();

    const handleSubmitForm = () => {
        router.push("/add-listing/6");
    };

    return (
        <>
            <div>
                <Heading>Set house rules for your guests</Heading>
            </div>

            <Divider />

            <QueryForm
                id="add-listing-form"
                action={handleSubmitForm}
                className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2"
            >
                <Fieldset>
                    <Legend className="text-lg!">Smoking</Legend>
                    <RadioGroup name="Smoking" defaultValue="Allow">
                        <RadioField>
                            <Radio value="not" />
                            <Label>Do not allow</Label>
                        </RadioField>
                        <RadioField>
                            <Radio value="Allow" />
                            <Label>Allow</Label>
                        </RadioField>
                        <RadioField>
                            <Radio value="Charge" />
                            <Label>Charge</Label>
                        </RadioField>
                    </RadioGroup>
                </Fieldset>

                <Fieldset>
                    <Legend className="text-lg!">Pets</Legend>
                    <RadioGroup name="Pets" defaultValue="Allow">
                        <RadioField>
                            <Radio value="not" />
                            <Label>Do not allow</Label>
                        </RadioField>
                        <RadioField>
                            <Radio value="Allow" />
                            <Label>Allow</Label>
                        </RadioField>
                        <RadioField>
                            <Radio value="Charge" />
                            <Label>Charge</Label>
                        </RadioField>
                    </RadioGroup>
                </Fieldset>

                <Fieldset>
                    <Legend className="text-lg!">Party organizing </Legend>
                    <RadioGroup name="Partyorganizing" defaultValue="Allow">
                        <RadioField>
                            <Radio value="not" />
                            <Label>Do not allow</Label>
                        </RadioField>
                        <RadioField>
                            <Radio value="Allow" />
                            <Label>Allow</Label>
                        </RadioField>
                        <RadioField>
                            <Radio value="Charge" />
                            <Label>Charge</Label>
                        </RadioField>
                    </RadioGroup>
                </Fieldset>

                <Fieldset>
                    <Legend className="text-lg!">Cooking </Legend>
                    <RadioGroup name="Cooking" defaultValue="Do">
                        <RadioField>
                            <Radio value="Do" />
                            <Label>Do</Label>
                        </RadioField>
                        <RadioField>
                            <Radio value="Allow" />
                            <Label>Allow</Label>
                        </RadioField>
                        <RadioField>
                            <Radio value="Charge" />
                            <Label>Charge</Label>
                        </RadioField>
                    </RadioGroup>
                </Fieldset>

                {/*  */}
                <input type="hidden" name="Additionalrules[]" value={"No smoking in common areas"} />
                <input type="hidden" name="Additionalrules[]" value={"Do not wear shoes/shoes in the house"} />
                <input type="hidden" name="Additionalrules[]" value={"No cooking in the bedroom"} />
                {/* ...more */}
            </QueryForm>

            <Divider />

            <p className="block text-lg font-semibold">Additional rules</p>
            <div className="flow-root">
                <div className="-my-3 divide-y divide-neutral-100 dark:divide-neutral-800">
                    {renderNoInclude("No smoking in common areas")}
                    {renderNoInclude("Do not wear shoes/shoes in the house")}
                    {renderNoInclude("No cooking in the bedroom")}
                </div>
            </div>
            <div className="flex flex-col gap-x-5 gap-y-3 sm:flex-row sm:justify-between">
                <Input placeholder="No smoking" />
                <ButtonPrimary>
                    <PlusIcon className="h-5 w-5" />
                    <span>Add tag</span>
                </ButtonPrimary>
            </div>

            <Divider />
        </>
    );
}
