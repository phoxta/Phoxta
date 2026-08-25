import { useCallback, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertTriangle, Frown, Hash, Star, Timer } from "lucide-react";
import { Avatar, Tag } from "@/pages/dashboard/ops/ui/primitives";
import { channelLabel } from "@/pages/dashboard/ops/ui/util";
import { firstResponseSla, type SlaPolicy } from "@/lib/ops/sla";
import {
  channelOf,
  isUnread,
  itemKey,
  nameOf,
  relTime,
  statusOf,
  titleOf,
  type QueueItem,
} from "./queue";

/**
 * The queue, virtualised.
 *
 * The old list rendered every row up to `PAGE_SIZE` (500) and used two
 * completely different layouts for conversations and tickets inside the same
 * column. This renders one row shape for both — what differs is the glyph on
 * the avatar and the meta line — and only the rows actually on screen.
 */

const ROW_EST = 74;

export default function QueueList({
  items,
  selectedKey,
  cursorKey,
  keyboardActive,
  onOpen,
  onCursor,
  scrollEl,
  assigneeName,
  sla,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  items: QueueItem[];
  selectedKey: string | null;
  cursorKey: string | null;
  keyboardActive: boolean;
  onOpen: (it: QueueItem) => void;
  onCursor: (key: string) => void;
  /**
   * The scrolling pane. Held as state by the page, not a ref: the virtualiser
   * reads it once on mount, and a plain ref is still null at that point — the
   * list rendered empty until some unrelated state change forced a re-render.
   */
  scrollEl: HTMLDivElement | null;
  assigneeName: (id: string | null) => string;
  /** The org's SLA policy (null/disabled → no due chips). Computed per row,
   *  client-side, from created_at + first_response_at — see lib/ops/sla. */
  sla?: SlaPolicy | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const virt = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => ROW_EST,
    overscan: 8,
    getItemKey: (i) => itemKey(items[i]),
  });

  /**
   * j/k moves a cursor that lives outside this component, so the row it lands
   * on may not be rendered yet. Scroll the virtualiser to it first, then focus
   * on the next frame — otherwise Tab-focus and the cursor drift apart and
   * Enter opens whichever row happens to be mounted.
   */
  const cursorIdx = cursorKey ? items.findIndex((it) => itemKey(it) === cursorKey) : -1;
  const lastFocused = useRef<string | null>(null);
  useEffect(() => {
    if (!keyboardActive || cursorIdx < 0 || cursorKey === lastFocused.current) return;
    lastFocused.current = cursorKey;
    virt.scrollToIndex(cursorIdx, { align: "auto" });
    requestAnimationFrame(() => {
      scrollEl?.querySelector<HTMLElement>(`[data-key="${CSS.escape(cursorKey!)}"]`)?.focus({ preventScroll: true });
    });
  }, [cursorIdx, cursorKey, keyboardActive, virt, scrollEl]);

  const measure = useCallback((el: HTMLElement | null) => virt.measureElement(el), [virt]);

  return (
    <div style={{ height: virt.getTotalSize() + (hasMore ? 56 : 0), width: "100%", position: "relative" }}>
      {virt.getVirtualItems().map((row) => {
        const it = items[row.index];
        const key = itemKey(it);
        const sel = key === selectedKey;
        const unread = isUnread(it);
        const status = statusOf(it);
        const title = titleOf(it);
        const conv = it.kind === "conversation" ? it.conv : null;
        const ticket = it.kind === "ticket" ? it.ticket : null;
        const assignee = conv?.assigned_to ? assigneeName(conv.assigned_to) : null;
        const negative = (conv?.sentiment ?? ticket?.sentiment) === "negative";
        // First-response SLA countdown (conversations only; snoozed rows show none).
        const slaChip = conv ? firstResponseSla(conv, sla) : null;

        return (
          <div
            key={key}
            data-index={row.index}
            ref={measure}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${row.start}px)` }}
          >
            <button
              type="button"
              data-key={key}
              data-idx={row.index}
              aria-current={sel}
              onClick={() => onOpen(it)}
              onFocus={() => onCursor(key)}
              className={`ibx-row${sel ? " is-sel" : ""}${unread ? " is-unread" : ""}${
                keyboardActive && key === cursorKey ? " is-cursor" : ""
              }`}
            >
              <Avatar name={nameOf(it)} channel={channelOf(it)} unread={unread} />

              <span className="ibx-row__txt">
                <span className="ibx-row__top">
                  {unread && <span className="visually-hidden">Unread. </span>}
                  <span className="ibx-row__name">{nameOf(it)}</span>
                  <span className="ibx-row__time">{relTime(it.at)}</span>
                </span>

                <span className="ibx-row__prev">
                  {title || <span className="fst-italic opacity-75">{channelLabel(channelOf(it))}</span>}
                </span>

                {(status || assignee || negative || slaChip || ticket?.priority === "high" || (conv?.tags?.length ?? 0) > 0 || conv?.csat_score != null) && (
                  <span className="ibx-row__meta">
                    {status && <Tag tone={status.tone}>{status.label}</Tag>}
                    {slaChip && (
                      <Tag tone={slaChip.tone} icon={<Timer />}>
                        {slaChip.label}
                      </Tag>
                    )}
                    {ticket?.priority === "high" && (
                      <Tag tone="danger" icon={<AlertTriangle />}>
                        High
                      </Tag>
                    )}
                    {negative && (
                      <Tag tone="warn" icon={<Frown />}>
                        Unhappy
                      </Tag>
                    )}
                    {conv?.csat_score != null && (
                      <Tag tone={conv.csat_score >= 4 ? "ok" : conv.csat_score <= 2 ? "danger" : "warn"} icon={<Star />}>
                        {conv.csat_score}/5
                      </Tag>
                    )}
                    {(conv?.tags?.length ?? 0) > 0 && (
                      <Tag icon={<Hash />}>
                        {conv!.tags.length === 1 ? conv!.tags[0] : conv!.tags.length}
                      </Tag>
                    )}
                    {assignee && (
                      <span className="ms-auto d-inline-flex" title={`Assigned to ${assignee}`}>
                        <Avatar name={assignee} size="sm" />
                      </span>
                    )}
                  </span>
                )}
              </span>
            </button>
          </div>
        );
      })}

      {hasMore && (
        <div style={{ position: "absolute", top: virt.getTotalSize(), left: 0, width: "100%", padding: "10px 14px" }}>
          <button type="button" className="oc-btn w-100" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? "Loading…" : "Load older conversations"}
          </button>
        </div>
      )}
    </div>
  );
}
