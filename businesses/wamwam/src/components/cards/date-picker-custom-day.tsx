interface DatePickerCustomDayProps {
    dayOfMonth: number;
    /** Supplied by react-datepicker's renderDayContents; unused by this renderer. */
    date?: Date;
}

export default function DatePickerCustomDay({ dayOfMonth }: DatePickerCustomDayProps) {
    return <span className="react-datepicker__day_span">{dayOfMonth}</span>;
}
