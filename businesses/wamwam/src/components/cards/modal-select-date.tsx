import { CloseButton, Dialog, DialogPanel } from "@headlessui/react";
import { addDays } from "date-fns";
import { useState, type ReactNode } from "react";
import DatePicker from "react-datepicker";
import DatePickerCustomDay from "@/components/cards/date-picker-custom-day";
import DatePickerCustomHeaderTwoMonth from "@/components/cards/date-picker-custom-header-two-month";
import { Button } from "@/components/primitives/button";
import ButtonClose from "@/components/primitives/button-close";
import ButtonPrimary from "@/components/primitives/button-primary";
import { getExcludeDateIntervals } from "@/lib/utils";
import type { DateRage } from "@/types/domain";

interface ModalSelectDateProps {
    triggerButton?: (p: { openModal: () => void }) => ReactNode;
    onChange?: (dates: DateRage) => void;
}

export default function ModalSelectDate({ triggerButton, onChange }: ModalSelectDateProps) {
    const [showModal, setShowModal] = useState(false);

    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(addDays(new Date(), 3));

    const onChangeDate = ([start, end]: DateRage) => {
        setStartDate(start);
        setEndDate(end);
    };

    const closeModal = () => setShowModal(false);
    const openModal = () => setShowModal(true);

    return (
        <>
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
                                <div className="p-5 text-xl font-semibold sm:text-2xl">{`When's your trip?`}</div>
                                <div className="relative z-10 flex flex-1 px-2 py-5 sm:p-5">
                                    <DatePicker
                                        selected={startDate}
                                        onChange={onChangeDate}
                                        startDate={startDate}
                                        endDate={endDate}
                                        selectsRange
                                        monthsShown={2}
                                        showPopperArrow={false}
                                        inline
                                        excludeDateIntervals={getExcludeDateIntervals()}
                                        renderCustomHeader={(p) => <DatePickerCustomHeaderTwoMonth {...p} />}
                                        renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
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
                                    onChangeDate([null, null]);
                                }}
                            >
                                Clear dates
                            </Button>
                            <ButtonPrimary
                                onClick={() => {
                                    onChange?.([startDate, endDate]);
                                    closeModal();
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
