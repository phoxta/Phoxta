import { useState } from "react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

export default function MyDatePicker({form}:any) {
	const [startDate, setStartDate] = useState(new Date())
  return (
	<>
		<DatePicker selected={startDate} onChange={(date:any) => setStartDate(date)} className={!form? "search-input datepicker" : "form-control calendar-date"} />
	</>
  )
}
