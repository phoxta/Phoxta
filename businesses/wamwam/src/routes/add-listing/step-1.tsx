import { Divider } from "@/components/primitives/divider";
import { Heading } from "@/components/primitives/heading";
import Input from "@/components/primitives/input";
import Select from "@/components/primitives/select";
import QueryForm from "@/lib/nav/form";
import { useRouter } from "@/lib/nav/navigation";
import FormItem from "./form-item";

export default function AddListingStep1() {
    const router = useRouter();

    // The wizard collects but does not persist: submitting advances a step.
    const handleSubmitForm = () => {
        router.push("/add-listing/2");
    };

    return (
        <>
            <Heading>Choosing listing categories</Heading>
            <Divider />

            {/* FORM */}
            <QueryForm id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
                {/* ITEM */}
                <FormItem label="Choose a property type" desccription="What type of property are you listing?">
                    <Select name="propertyType">
                        <option value="Apartment">Apartment</option>
                        <option value="Hotel">Hotel</option>
                        <option value="Cottage">Cottage</option>
                        <option value="Villa">Villa</option>
                        <option value="Cabin">Cabin</option>
                        <option value="Farm stay">Farm stay</option>
                        <option value="Houseboat">Houseboat</option>
                        <option value="Lighthouse">Lighthouse</option>
                    </Select>
                </FormItem>
                <FormItem label="Place name" desccription="What’s the name of your place?">
                    <Input placeholder="Place name" name="place-name" />
                </FormItem>
                <FormItem label="Rental form" desccription="What type of rental is this?">
                    <Select name="rentalForm">
                        <option value="Hotel">Entire place</option>
                        <option value="Private room">Private room</option>
                        <option value="Share room">Share room</option>
                    </Select>
                </FormItem>
            </QueryForm>
        </>
    );
}
