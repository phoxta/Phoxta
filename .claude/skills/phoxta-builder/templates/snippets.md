# Wiring snippets

## 1. Register a route (`src/App.tsx`)

Add the import at the top with the other page imports:
```tsx
import NamePage from "@/pages/NamePage";
```

Then add the `<Route>` inside an existing `MainLayout` group (most content pages use header/footer 2):
```tsx
<Route element={<MainLayout headerStyle={2} footerStyle={2} />}>
  {/* ...existing routes... */}
  <Route path="/name" element={<NamePage />} />
</Route>
```

Need a different chrome? Open a new group:
```tsx
<Route element={<MainLayout headerStyle={4} footerStyle={4} />}>
  <Route path="/name" element={<NamePage />} />
</Route>
```
Options: `headerStyle`/`footerStyle` = 1–15, `noFooter`, `mainClass="bg-neutral-50"`.
`footerStyle={2}` = floating footer. Keep the catch-all `path="*"` route last.

## 2. Add a navigation item (`src/shared/MainMenu.tsx`)

This menu is shared by desktop and mobile — edit once.

### a) Plain top-level link
```tsx
<li>
  <MenuLink to="/name">
    <LinkSwap label="Name" />
  </MenuLink>
</li>
```

### b) Simple dropdown
Define the array near the other `*_LINKS` consts:
```tsx
const NAME_LINKS: Item[] = [
  { to: "/name", label: "Overview" },
  { to: "/name-details", label: "Details" },
];
```
Render it:
```tsx
<li className="has-dropdown">
  <a href="#" onClick={(e) => e.preventDefault()}>
    <LinkSwap label="Name" />
  </a>
  <ul className="at-submenu submenu">
    {NAME_LINKS.map((l) => (
      <li key={l.label}>
        <MenuLink to={l.to}>{l.label}</MenuLink>
      </li>
    ))}
  </ul>
</li>
```

### c) Mega-menu (multi-column)
```tsx
<li className="has-dropdown">
  <a href="#" onClick={(e) => e.preventDefault()}>
    <LinkSwap label="Name" />
  </a>
  <div className="at-submenu submenu at-megamenu">
    <div className="row">
      <div className="col-xl-6">
        <MegaColumn title="Column A" items={GROUP_A} />
      </div>
      <div className="col-xl-6">
        <MegaColumn title="Column B" items={GROUP_B} />
      </div>
    </div>
  </div>
</li>
```

## 3. New page checklist

- [ ] Sections created in `src/shared/sections/<group>/SectionN.tsx`
- [ ] `src/pages/NamePage.tsx` created (PageMeta `title="Phoxta - Name"` + sections)
- [ ] Imported + `<Route>` added in `src/App.tsx`
- [ ] Menu item added in `src/shared/MainMenu.tsx` (if user-reachable)
- [ ] Verified at `http://localhost:5173/name`: renders, scrolls on navigation (not just refresh), images load, special chars (® © — ' ") intact
- [ ] Files saved as UTF-8 **without BOM**
