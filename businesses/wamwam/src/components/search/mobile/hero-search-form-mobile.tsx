import { CloseButton, Dialog, DialogPanel, Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { FilterVerticalIcon, HotAirBalloonFreeIcons, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import clsx from "clsx";
import { useState, type ComponentType } from "react";
import { useTimeoutFn } from "react-use";
import { ButtonCircle } from "@/components/primitives/button";
import ButtonPrimary from "@/components/primitives/button-primary";
import ButtonThird from "@/components/primitives/button-third";
import { usePathname } from "@/lib/nav/navigation";
import type { ListingType } from "@/types/domain";
import ExperienceSearchFormMobile from "./forms/experience-form";

interface FormTab {
    name: ListingType;
    icon: IconSvgElement;
    formComponent: ComponentType;
}

// Single service — Experiences — so the mobile search has one tab.
const formTabs: FormTab[] = [
    { name: "Experiences", icon: HotAirBalloonFreeIcons, formComponent: ExperienceSearchFormMobile },
];

const defaultIndex = 0;

export default function HeroSearchFormMobile({ className }: { className?: string }) {
    const [showModal, setShowModal] = useState(false);

    // "Clear all" unmounts the tab group and remounts it a tick later, which
    // resets every field's local state without threading a reset through them.
    const [showDialog, setShowDialog] = useState(false);
    const [, , resetIsShowingDialog] = useTimeoutFn(() => setShowDialog(true), 1);

    const pathname = usePathname();

    let locationText = "Where to?";
    let weekText = "Any week";
    let guestsText = "Add guests";
    // Read off the tab list rather than a literal so the type stays the full union.
    const activeTabName: ListingType = formTabs[defaultIndex].name;

    if (pathname.startsWith("/experience-search")) {
        locationText = "Experiences in Bali";
        weekText = "Mar 22 - 27";
        guestsText = "2 guests";
    }

    function closeModal() {
        setShowModal(false);
    }

    function openModal() {
        setShowModal(true);
    }

    const renderButtonOpenModal = () => {
        return (
            <button
                onClick={openModal}
                className="relative flex w-full items-center rounded-full shadow-md-for-card bg-card px-4 py-2 focus:outline-none sm:pe-11"
            >
                <HugeiconsIcon icon={Search01Icon} size={20} />

                <div className="ms-4 flex-1 overflow-hidden text-start">
                    <span className="block text-sm/5 font-medium">{locationText}</span>
                    <span className="mt-px flex gap-2 text-sm/5 font-[350] text-muted-foreground">
                        {weekText} {activeTabName !== "Cars" && <span>•</span>}
                        {activeTabName !== "Cars" && <span>{guestsText}</span>}
                    </span>
                </div>

                <div className="absolute end-2 top-1/2 hidden size-9 -translate-y-1/2 transform items-center justify-center rounded-full border border-border sm:flex">
                    <HugeiconsIcon icon={FilterVerticalIcon} size={16} />
                </div>
            </button>
        );
    };

    return (
        <div className={clsx(className, "relative z-10 w-full max-w-lg")}>
            {renderButtonOpenModal()}
            <Dialog as="div" className="relative z-max" onClose={closeModal} open={showModal} aria-label="Search">
                <div className="fixed inset-0 bg-accent">
                    <div className="flex h-full">
                        <DialogPanel
                            transition
                            className="relative flex-1 transition data-closed:translate-y-28 data-closed:opacity-0"
                        >
                            {showDialog && (
                                <TabGroup
                                    manual
                                    className="relative flex h-full flex-1 flex-col justify-between"
                                    defaultIndex={defaultIndex}
                                >
                                    <div className="absolute inset-e-3 top-2 z-10">
                                        <CloseButton color="light" as={ButtonCircle} className="size-7!" aria-label="Close">
                                            <XMarkIcon className="size-4!" />
                                        </CloseButton>
                                    </div>

                                    <TabList className="flex justify-center gap-x-8 sm:gap-x-14">
                                        {formTabs.map((tab) => {
                                            return (
                                                <Tab
                                                    key={tab.name}
                                                    className={clsx(
                                                        "group relative -mx-3 flex shrink-0 cursor-pointer items-center justify-center px-3 pt-10 pb-5 text-neutral-400 data-[selected]:text-foreground",
                                                    )}
                                                >
                                                    <div className="relative">
                                                        <span className="sr-only">{tab.name}</span>
                                                        <HugeiconsIcon icon={tab.icon} size={26} />
                                                        <span className="absolute top-full mt-1 hidden h-0.5 w-full bg-foreground group-data-[selected]:block" />
                                                    </div>
                                                </Tab>
                                            );
                                        })}
                                    </TabList>

                                    <TabPanels className="flex flex-1 overflow-hidden px-1.5 sm:px-4">
                                        <div className="hidden-scrollbar flex-1 overflow-y-auto pt-2 pb-4">
                                            {formTabs.map((tab) => (
                                                <TabPanel
                                                    key={tab.name}
                                                    as="div"
                                                    className="animate-[myblur_0.4s_ease-in-out] transition-opacity"
                                                >
                                                    <tab.formComponent />
                                                </TabPanel>
                                            ))}
                                        </div>
                                    </TabPanels>
                                    <div className="flex justify-between border-t border-border bg-background px-4 py-3">
                                        <ButtonThird
                                            onClick={() => {
                                                setShowDialog(false);
                                                resetIsShowingDialog();
                                            }}
                                        >
                                            Clear all
                                        </ButtonThird>
                                        {/* Submits the active form by id: the button lives outside the <form>. */}
                                        <ButtonPrimary type="submit" form="form-hero-search-form-mobile" onClick={closeModal}>
                                            <HugeiconsIcon icon={Search01Icon} size={16} />
                                            <span>Search</span>
                                        </ButtonPrimary>
                                    </div>
                                </TabGroup>
                            )}
                        </DialogPanel>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
