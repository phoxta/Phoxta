import dynamic from "@/util/dynamic"
import React from 'react'

const Odometer = dynamic(() => import('react-odometerjs'), {
	ssr: false,
	loading: () => <span>0</span>,
})

interface CounterUpProps {
	count: number,
	duration?: number
}

const CounterUp: React.FC<CounterUpProps> = ({ count }) => {
	return (
		<Odometer value={count} className="odometer" duration={5000} animation='count' />
	)
}

export default CounterUp
