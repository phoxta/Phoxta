import { Heading } from "@/components/primitives/heading";
import Textarea from "@/components/primitives/textarea";
import QueryForm from "@/lib/nav/form";
import { useRouter } from "@/lib/nav/navigation";

export default function AddListingStep6() {
    const router = useRouter();

    const handleSubmitForm = () => {
        router.push("/add-listing/7");
    };

    return (
        <>
            <div>
                <Heading>Your place description</Heading>
                <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
                    Mention the best features of your accommodation, any special amenities like fast Wi-Fi or parking,
                    as well as things you like about the neighborhood.
                </span>
            </div>

            <QueryForm id="add-listing-form" action={handleSubmitForm}>
                <Textarea name="place-description" placeholder="..." rows={14} />
            </QueryForm>
        </>
    );
}
