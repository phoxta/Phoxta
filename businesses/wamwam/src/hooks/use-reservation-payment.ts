import { useCallback, useEffect, useRef, useState } from "react";
import { getOrgId } from "@/data/live-store";
import { isReservationPaid, lookupReservation, type ReservationPayment } from "@/integration/phoxta";
import { openPaystackPopup } from "@/integration/paystack-popup";

const POLL_EVERY_MS = 3000;
const POLL_FOR_MS = 120_000;

/**
 * The pay-online half of a booking, shared by the reserve box and the flight
 * booker: open the Paystack popup once the payment is initialised and confirm
 * payment by polling the guest lookup.
 *
 * Polling is the source of truth, not the popup's onSuccess: the webhook marks
 * the reservation paid server-side, so this converges even when the popup's
 * callbacks never fire (closed tab, blocked script, hosted-page fallback).
 */
export function useReservationPayment(reference: string | null, email: string, payment: ReservationPayment | null) {
    const [paid, setPaid] = useState(false);
    const [pollExpired, setPollExpired] = useState(false);
    // One lookup in flight at a time; a slow response must not stack requests.
    const checkingRef = useRef(false);
    const autoOpenedRef = useRef(false);

    const checkPaid = useCallback(async () => {
        if (checkingRef.current || paid || !reference) return;
        const orgId = getOrgId();
        if (!orgId) return;
        checkingRef.current = true;
        try {
            const r = await lookupReservation(orgId, reference, email.trim());
            if (isReservationPaid(r)) setPaid(true);
        } finally {
            checkingRef.current = false;
        }
    }, [reference, email, paid]);

    // With no access code the helper itself falls back to the hosted payment page.
    const openPopup = useCallback(() => {
        if (!payment) return;
        void openPaystackPopup(payment.accessCode, payment.url, {
            onSuccess: () => {
                void checkPaid();
            },
        });
    }, [payment, checkPaid]);

    useEffect(() => {
        if (payment && !autoOpenedRef.current) {
            autoOpenedRef.current = true;
            openPopup();
        }
    }, [payment, openPopup]);

    useEffect(() => {
        if (!payment || !reference || paid) return;
        const startedAt = Date.now();
        const timer = window.setInterval(() => {
            if (Date.now() - startedAt > POLL_FOR_MS) {
                window.clearInterval(timer);
                setPollExpired(true);
                return;
            }
            void checkPaid();
        }, POLL_EVERY_MS);
        return () => window.clearInterval(timer);
    }, [payment, reference, paid, checkPaid]);

    return { paid, pollExpired, openPopup };
}
