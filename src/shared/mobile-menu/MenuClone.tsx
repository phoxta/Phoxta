import { useEffect } from "react";
import { useMobileMenuCloneRefs } from "@/shared/mobile-menu/MobileMenuCloneContext";

/**
 * Clone desktop menu (.at-mobile-menu-active > ul) into ALL offcanvas navs
 * and bind submenu toggle behavior (slideDown/slideUp) like the HTML template.
 */
export default function MenuClone() {
  const { menuSourceRef, offcanvasRootRef } = useMobileMenuCloneRefs();

  useEffect(() => {
    const sourceUl = menuSourceRef.current;
    const root = offcanvasRootRef.current;
    if (!sourceUl || !root) return;

    const targetNavs = root.querySelectorAll(".at-offcanvas .at-offcanvas-menu nav, .at-offcanvas-2-area .at-offcanvas-menu nav");
    if (!targetNavs.length) return;

    const slideDown = (el: HTMLElement) => {
      el.style.display = "block";
      el.style.overflow = "hidden";
      el.style.transition = "height 0.3s linear";
      const h = el.scrollHeight;
      el.style.height = "0px";
      void el.offsetHeight;
      requestAnimationFrame(() => {
        el.style.height = `${h}px`;
        const onEnd = () => {
          el.style.transition = "none";
          el.style.height = "";
          el.style.overflow = "";
          el.removeEventListener("transitionend", onEnd);
        };
        el.addEventListener("transitionend", onEnd);
      });
    };

    const slideUp = (el: HTMLElement) => {
      el.style.overflow = "hidden";
      el.style.transition = "height 0.3s linear";
      const h = el.scrollHeight;
      el.style.height = `${h}px`;
      void el.offsetHeight;
      requestAnimationFrame(() => {
        el.style.height = "0px";
        const onEnd = () => {
          el.style.display = "none";
          el.style.transition = "none";
          el.style.height = "";
          el.style.overflow = "";
          el.removeEventListener("transitionend", onEnd);
        };
        el.addEventListener("transitionend", onEnd);
      });
    };

    const setupClone = (clone: HTMLElement) => {
      // Every menu label ships twice — .text-1 and .text-2 — because the desktop
      // menu swaps between them on hover. That effect needs the positioning the
      // desktop menu's CSS provides; inside an offcanvas both spans compute to
      // display:inline and BOTH render, so every item read "HomeHome".
      //
      // This used to be applied only to .at-offcanvas-2-area, which is why the
      // hamburger panel looked right and the other one doubled. It is a property
      // of being in an offcanvas at all, not of which offcanvas, so flatten each
      // swap to its .text-1 text everywhere. The desktop menu is untouched — this
      // only ever runs on the clone.
      clone.querySelectorAll<HTMLElement>(".at-link-swap").forEach((swap) => {
        const text = swap.querySelector<HTMLElement>(".text-1")?.textContent ?? swap.textContent ?? "";
        swap.replaceWith(document.createTextNode(text));
      });
      const submenus = clone.querySelectorAll(".at-submenu");
      submenus.forEach((sub) => {
        const parentLi = sub.parentElement;
        if (!parentLi) return;
        const existingBtn = parentLi.querySelector("button.at-menu-close");
        if (existingBtn) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "at-menu-close";
        btn.setAttribute("aria-expanded", "false");
        btn.setAttribute("aria-label", "Toggle submenu");
        btn.innerHTML = '<i class="fa-solid fa-plus"></i>';
        parentLi.appendChild(btn);
      });

      const toggleSubmenu = (li: Element) => {
        const sub = li.querySelector(".at-submenu") as HTMLElement | null;
        if (!sub) return;
        const isOpen = li.classList.contains("active");
        li.classList.toggle("active");
        const menuCloseBtn = li.querySelector("button.at-menu-close");
        if (menuCloseBtn) menuCloseBtn.setAttribute("aria-expanded", String(!isOpen));
        if (isOpen) slideUp(sub);
        else slideDown(sub);
      };

      clone.querySelectorAll(".at-submenu").forEach((sub) => {
        (sub as HTMLElement).style.display = "none";
      });

      const handleToggle = (e: Event) => {
        e.preventDefault();
        const target = e.target as HTMLElement;
        const btn = target.closest("button.at-menu-close");
        const link =
          target.closest(".has-dropdown > a") ||
          target.closest("li.has-dropdown ul li.menu-item-has-children > a");
        const li = (btn?.parentElement || link?.closest("li.has-dropdown") || link?.closest("li")) as Element | null;
        if (!li) return;
        const sub = li.querySelector(".at-submenu");
        if (!sub) return;
        toggleSubmenu(li);
      };

      const targets = clone.querySelectorAll(
        "button.at-menu-close, ul > li.has-dropdown > a, li.has-dropdown ul li.menu-item-has-children > a",
      );
      targets.forEach((el) => el.addEventListener("click", handleToggle));
      return () => targets.forEach((el) => el.removeEventListener("click", handleToggle));
    };

    const cleanups: Array<() => void> = [];

    targetNavs.forEach((targetNav) => {
      const clone = sourceUl.cloneNode(true) as HTMLElement;
      targetNav.innerHTML = "";
      targetNav.appendChild(clone);
      const cleanup = setupClone(clone);
      if (cleanup) cleanups.push(cleanup);
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
    // Refs from context are stable for the app lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

