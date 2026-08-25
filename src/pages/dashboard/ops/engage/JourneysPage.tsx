import FlowsBoard from "@/components/engage/FlowsBoard";

/** Engage → Journeys: event + time lifecycle automations, with recipes picked
 *  for this business's vertical (booking reminders vs post-purchase asks). */
export default function JourneysPage() {
  return <FlowsBoard kind="journey" />;
}
