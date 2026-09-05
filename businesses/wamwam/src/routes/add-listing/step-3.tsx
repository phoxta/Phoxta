import { Divider } from "@/components/primitives/divider";
import { Heading } from "@/components/primitives/heading";
import NcInputNumber from "@/components/primitives/nc-input-number";
import Select from "@/components/primitives/select";
import QueryForm from "@/lib/nav/form";
import { useRouter } from "@/lib/nav/navigation";
import FormItem from "./form-item";

export default function AddListingStep3() {
    const router = useRouter();

    const handleSubmitForm = () => {
        router.push("/add-listing/4");
    };

    return (
        <>
            <Heading>Your place details</Heading>

            {/* FORM */}
            <QueryForm id="add-listing-form" action={handleSubmitForm} className="mt-5 space-y-5">
                {/* ITEM */}
                <FormItem label="Acreage (m2)">
                    <Select name="acreage">
                        <option value="100">100</option>
                        <option value="200">200</option>
                        <option value="300">300</option>
                        <option value="400">400</option>
                        <option value="500">500</option>
                    </Select>
                </FormItem>
                <Divider />
                <NcInputNumber inputName="Guests" label="Guests" defaultValue={4} />
                <Divider />
                <NcInputNumber inputName="Bedroom" label="Bedroom" defaultValue={4} />
                <Divider />
                <NcInputNumber inputName="Beds" label="Beds" defaultValue={4} />
                <Divider />
                <NcInputNumber inputName="Bathroom" label="Bathroom" defaultValue={2} />
                <Divider />
                <NcInputNumber inputName="Kitchen" label="Kitchen" defaultValue={2} />
                <Divider />
            </QueryForm>
        </>
    );
}
