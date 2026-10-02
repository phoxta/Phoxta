export type Business = {
  id: string;
  name: string;
  category: string;
  health: number;
};

export type Customer = {
  id: number;
  name: string;
  company: string;
  stage: "Lead" | "Customer" | "At risk";
  value: string;
  lastContact: string;
};

export type Workflow = {
  id: number;
  name: string;
  area: string;
  status: "Running" | "Needs approval" | "Paused";
  completed: number;
  total: number;
  enabled: boolean;
};

export const BUSINESSES: Business[] = [
  { id: "wamwam", name: "WamWam Experience", category: "Travel experiences", health: 82 },
  { id: "northstar", name: "Northstar Studio", category: "Creative services", health: 74 },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 1, name: "Amina Lawal", company: "Field & Form", stage: "Lead", value: "£4,800", lastContact: "Today" },
  { id: 2, name: "Marcus Reed", company: "Kite House", stage: "Customer", value: "£12,400", lastContact: "Yesterday" },
  { id: 3, name: "Zainab Bello", company: "Open Palm", stage: "Customer", value: "£8,200", lastContact: "2 days ago" },
  { id: 4, name: "Theo Martin", company: "Weekday Works", stage: "At risk", value: "£3,600", lastContact: "8 days ago" },
  { id: 5, name: "Eva Chen", company: "Kindred Labs", stage: "Lead", value: "£6,100", lastContact: "11 days ago" },
];

export const INITIAL_WORKFLOWS: Workflow[] = [
  { id: 1, name: "Qualify new enquiries", area: "Customers", status: "Running", completed: 18, total: 24, enabled: true },
  { id: 2, name: "Prepare weekly campaign", area: "Growth", status: "Needs approval", completed: 3, total: 5, enabled: true },
  { id: 3, name: "Follow up unpaid invoices", area: "Operations", status: "Running", completed: 7, total: 9, enabled: true },
  { id: 4, name: "Summarise customer feedback", area: "Intelligence", status: "Paused", completed: 12, total: 12, enabled: false },
];

export const PRIORITIES = [
  { id: 1, title: "Approve the October launch email", meta: "Prepared by Phoxta · 4 min review", tone: "coral" },
  { id: 2, title: "Reply to three high-intent enquiries", meta: "Potential value £9,600", tone: "blue" },
  { id: 3, title: "Review this week's customer signal", meta: "Repeat bookings increased 14%", tone: "neutral" },
];

export const ACTIVITY = [
  { id: 1, title: "Phoxta qualified 6 new enquiries", time: "12 minutes ago", area: "Customers" },
  { id: 2, title: "Campaign draft is ready to review", time: "48 minutes ago", area: "Growth" },
  { id: 3, title: "Weekly performance summary completed", time: "2 hours ago", area: "Intelligence" },
  { id: 4, title: "Two invoice reminders were delivered", time: "Yesterday", area: "Operations" },
];

export const CAMPAIGNS = [
  { id: 1, name: "Autumn city guide", channel: "Email", status: "Live", reach: "3,240", result: "8.4% conversion" },
  { id: 2, name: "Founder stories", channel: "Social", status: "Scheduled", reach: "—", result: "Publishes Friday" },
  { id: 3, name: "Returning guest offer", channel: "Email", status: "Draft", reach: "1,180 est.", result: "Awaiting approval" },
];

export const INSIGHTS = [
  { id: 1, label: "Customer signal", title: "Short, curated experiences are driving repeat bookings", body: "Customers who book a two-hour experience are 1.8× more likely to return within 60 days.", confidence: "High confidence", accent: "blue" },
  { id: 2, label: "Market movement", title: "Corporate off-sites are shifting toward smaller local groups", body: "Demand is rising for flexible packages designed for teams of 8–15 people.", confidence: "6 sources", accent: "coral" },
  { id: 3, label: "Opportunity", title: "Turn the strongest host playbooks into a premium package", body: "Your highest-rated hosts share three repeatable steps that could support a higher-value offer.", confidence: "Worth testing", accent: "violet" },
];
