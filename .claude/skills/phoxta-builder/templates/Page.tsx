// Template: a page that composes sections.
// Copy to src/pages/<Name>Page.tsx, rename the function, set the title,
// and import the sections you created under src/shared/sections/<group>/.
//
// Remember: this does nothing until you register a <Route> in src/App.tsx
// (and usually a menu item in src/shared/MainMenu.tsx).

import PageMeta from "@/seo/PageMeta";
import Section1 from "@/shared/sections/<group>/Section1";
import Section2 from "@/shared/sections/<group>/Section2";

export default function NamePage() {
  return (
    <>
      <PageMeta title="Phoxta - Name" />
      <Section1 />
      <Section2 />
    </>
  );
}
