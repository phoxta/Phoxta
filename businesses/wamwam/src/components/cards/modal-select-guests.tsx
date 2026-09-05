import { CloseButton, Dialog, DialogPanel } from "@headlessui/react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/primitives/button";
import ButtonClose from "@/components/primitives/button-close";
import ButtonPrimary from "@/components/primitives/button-primary";
import GuestsInput from "@/components/search/mobile/guests-input";
import type { GuestsObject } from "@/types/domain";

/** The modal always reports all three counts, so callers can store it without nullish checks. */
type GuestCounts = Required<GuestsObject>;

interface ModalSelectGuestsProps {
    triggerButton?: (p: { openModal: () => void }) => ReactNode;
    onChangeGuests?: (guests: GuestCounts) => void;
}

export default function ModalSelectGuests({ triggerButton, onChangeGuests }: ModalSelectGuestsProps) {
    const [showModal, setShowModal] = useState(false);
    const [guests, setGuests] = useState<GuestCounts>({
        guestAdults: 2,
        guestChildren: 1,
        guestInfants: 1,
    });

    const closeModal = () => setShowModal(false);
    const openModal = () => setShowModal(true);

    return (
        <>
            {/* The fallback trigger's label is the template's own copy. */}
            {triggerButton ? triggerButton({ openModal }) : <button onClick={openModal}>Select Date</button>}

            <Dialog className="relative z-50" onClose={closeModal} open={showModal}>
                <div className="fixed inset-0 bg-neutral-300 dark:bg-neutral-900">
                    <DialogPanel
                        transition
                        className="relative flex size-full flex-col transition data-closed:translate-y-40 data-closed:opacity-0"
                    >
                        <div className="absolute start-4 top-4">
                            <CloseButton color="light" as={ButtonClose}></CloseButton>
                        </div>

                        <div className="flex flex-1 overflow-hidden bg-white p-1 pt-16 dark:bg-neutral-800">
                            <div className="flex flex-1 flex-col overflow-auto">
                                <div className="relative flex flex-1 px-2 py-5 sm:p-5">
                                    <GuestsInput
                                        defaultValue={guests}
                                        onChange={(e) => {
                                            setGuests({
                                                guestAdults: e.guestAdults || 0,
                                                guestChildren: e.guestChildren || 0,
                                                guestInfants: e.guestInfants || 0,
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto flex justify-between border-t border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                            <Button
                                type="button"
                                className="shrink-0 font-semibold underline"
                                plain
                                onClick={() => {
                                    setGuests({
                                        guestAdults: 0,
                                        guestChildren: 0,
                                        guestInfants: 0,
                                    });
                                }}
                            >
                                Clear
                            </Button>
                            <ButtonPrimary
                                onClick={() => {
                                    closeModal();
                                    onChangeGuests?.(guests);
                                }}
                            >
                                Save
                            </ButtonPrimary>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
}
