interface DatePickerCustomTimeProps {
    value?: string;
    onChange?: (value: string) => void;
}

export default function DatePickerCustomTime({ onChange, value }: DatePickerCustomTimeProps) {
    return (
        <div>
            <input value={value} onChange={(e) => onChange?.(e.target.value)} style={{ border: "solid 1px pink" }} />
        </div>
    );
}
