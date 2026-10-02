import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Image as ImageIcon, PlayCircle, Share2, X } from "lucide-react";

export type AgentNotification = {
  id: string | number;
  title: string;
  agent: string;
  area: string;
  time: string;
  detail: string;
  result: string;
  media: "design" | "video" | "none";
  channels: string[];
};

const NOTIFICATION_TEMPLATE_ITEMS: AgentNotification[] = [
  { id: 1, title: "Launch design published across social media", agent: "Growth Agent", area: "Growth", time: "Just now", detail: "Phoxta adapted the approved launch design for each channel and published the scheduled posts.", result: "Published successfully across 3 channels", media: "design", channels: ["Instagram", "LinkedIn", "Facebook"] },
  { id: 2, title: "Customer story video scheduled", agent: "Content Agent", area: "Growth", time: "18 minutes ago", detail: "A 24-second customer story video was captioned, resized and scheduled for the evening audience window.", result: "Scheduled for 6:30 PM", media: "video", channels: ["Instagram", "TikTok"] },
  { id: 3, title: "Six new enquiries qualified", agent: "Customer Agent", area: "Customers", time: "42 minutes ago", detail: "Phoxta reviewed intent, budget and timing, then added the strongest enquiries to the priority response queue.", result: "3 high intent · 3 nurture", media: "none", channels: ["Email", "Website"] },
  { id: 4, title: "Invoice reminders delivered", agent: "Operations Agent", area: "Operations", time: "2 hours ago", detail: "Two polite reminders were sent within the approved payment workflow. No invoice values were changed.", result: "2 delivered · 1 opened", media: "none", channels: ["Email"] },
];

function NotificationDetail({ notification, onClose, onOpenRelated }: { notification: AgentNotification; onClose: () => void; onOpenRelated?: (notification: AgentNotification) => void }) {
  return <><button className="pxc-account-scrim" aria-label="Close notification" onClick={onClose} /><section className="pxc-notification-popup" role="dialog" aria-modal="true" aria-label={notification.title}><header><div><span><CheckCircle2 size={18} /></span><div><strong>Action completed</strong><small>{notification.agent} · {notification.time}</small></div></div><button onClick={onClose} aria-label="Close notification"><X size={18} /></button></header><div className="pxc-notification-popup-body">{notification.media !== "none" && <div className={`pxc-media-preview is-${notification.media}`}>{notification.media === "video" ? <><PlayCircle size={44} /><span>Customer story · 00:24</span></> : <><ImageIcon size={27} /><strong>{notification.title}</strong><span>{notification.agent}</span></>}</div>}<span className="pxc-popup-kicker">{notification.area}</span><h2>{notification.title}</h2><p>{notification.detail}</p><div className="pxc-notification-result"><CheckCircle2 size={16} /><span><strong>Result</strong><small>{notification.result}</small></span></div>{notification.channels.length > 0 && <div className="pxc-channel-list"><strong>Channels</strong><div>{notification.channels.map((channel) => <span key={channel}><Share2 size={12} />{channel}</span>)}</div></div>}<button className="pxc-popup-primary" onClick={() => onOpenRelated?.(notification)}>Open related work</button></div></section></>;
}

/** Reusable preserved version of the prior streamed notification rail. */
export function NotificationTemplate({ open = true, items: suppliedItems, incomingId, unreadIds, onSelect, onClose, onOpenRelated }: { open?: boolean; items?: AgentNotification[]; incomingId?: string | number | null; unreadIds?: Set<string | number>; onSelect?: (notification: AgentNotification) => void; onClose?: () => void; onOpenRelated?: (notification: AgentNotification) => void }) {
  const [items, setItems] = useState(NOTIFICATION_TEMPLATE_ITEMS);
  const [selected, setSelected] = useState<AgentNotification | null>(null);
  const [incoming, setIncoming] = useState<string | number | null>(null);
  const controlled = suppliedItems !== undefined;
  useEffect(() => {
    if (controlled) return;
    let index = 0;
    let clearAnimation: number | undefined;
    const stream = window.setInterval(() => {
      const id = Date.now();
      const source = NOTIFICATION_TEMPLATE_ITEMS[index++ % 2];
      setItems((current) => [{ ...source, id, time: "Just now" }, ...current].slice(0, 7));
      setIncoming(id);
      clearAnimation = window.setTimeout(() => setIncoming(null), 1800);
    }, 30000);
    return () => { window.clearInterval(stream); if (clearAnimation) window.clearTimeout(clearAnimation); };
  }, [controlled]);
  const visibleItems = suppliedItems ?? items;
  const activeIncoming = incomingId ?? incoming;
  const unreadCount = unreadIds ? visibleItems.filter((item) => unreadIds.has(item.id)).length : visibleItems.length;
  return <><aside className={`pxc-notifications is-template${open ? " is-open" : ""}`} aria-label="Notifications" data-ai-context="Notifications" data-ai-detail={`${visibleItems.length} recent notifications, ${unreadCount} unread.`}><button className="pxc-live-notification-close" onClick={onClose} aria-label="Close notifications"><X size={15} /></button><div className="pxc-notification-head"><div><Bell className={activeIncoming ? "is-ringing" : ""} size={15} /><strong>Notifications</strong></div><span>{unreadCount}</span></div><div className="pxc-notification-stream">{visibleItems.map((item) => <button className={`pxc-notification-item${item.id === activeIncoming ? " is-new" : ""}`} key={item.id} data-ai-context={`Notification: ${item.title}`} data-ai-detail={`${item.agent}. ${item.detail}. Result: ${item.result}`} onClick={() => { setSelected(item); onSelect?.(item); }}><span className="pxc-notification-dot" style={{ opacity: unreadIds && !unreadIds.has(item.id) ? .3 : 1 }} /><div><strong>{item.title}</strong><p>{item.agent}</p><small>{item.time}</small></div>{item.media !== "none" && <span className={`pxc-notification-thumb is-${item.media}`}>{item.media === "video" ? <PlayCircle size={18} /> : <ImageIcon size={16} />}</span>}</button>)}{visibleItems.length === 0 && <p className="pxc-notification-empty">No notifications yet.</p>}</div></aside>{selected && <NotificationDetail notification={selected} onClose={() => setSelected(null)} onOpenRelated={(notification) => { setSelected(null); onOpenRelated?.(notification); }} />}</>;
}
