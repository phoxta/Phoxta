import type { ComponentType } from "react";
import type { SectionManifest } from "./types";
import { imageField } from "./fields";

import AboutHero1, { ABOUT_HERO_DEFAULTS } from "@/shared/sections/about-1/Section1";
import Home1Hero from "@/shared/sections/index-1/Section1";
import Home1Intro from "@/shared/sections/index-1/Section2";
import Home1Testimonials from "@/shared/sections/index-1/Section6";
import ServicesIntro, { SERVICES_INTRO_DEFAULTS } from "@/shared/sections/services-1/Section1";
import TeamIntro, { TEAM_INTRO_DEFAULTS } from "@/shared/sections/index-3/Section9";
import FaqHero, { FAQ_HERO_DEFAULTS } from "@/shared/sections/faqs/Section1";
import FaqTopics, { FAQ_TOPICS_DEFAULTS } from "@/shared/sections/faqs/Section2";

/** Cast a typed section component to the registry's generic component type. */
const asSection = (c: unknown) => c as unknown as ComponentType<Record<string, unknown>>;

/**
 * Hand-tuned manifests that add editable fields (text/image) on top of the
 * auto-generated render-as-is registry. These override the generated entry for
 * the same `source` (see registry/index.ts) and lead the palette. Parameterize
 * more sections here over time — the section file exposes props + a *_DEFAULTS
 * export, and the manifest maps those to Puck fields.
 */
export const SEED_MANIFESTS: SectionManifest[] = [
  {
    type: "AboutHero1",
    source: "about-1/Section1",
    label: "About — Hero + image slider",
    group: "Heroes",
    component: asSection(AboutHero1),
    editable: true,
    fields: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "textarea", label: "Heading" },
      subheading: { type: "textarea", label: "Subheading" },
      slides: {
        type: "array",
        label: "Slider images",
        arrayFields: { src: imageField("Image"), alt: { type: "text", label: "Alt text" } },
        getItemSummary: (item: { alt?: string; src?: string }) => item.alt || item.src || "Image",
      },
    },
    defaultProps: { ...ABOUT_HERO_DEFAULTS },
  },
  {
    type: "ServicesIntro",
    source: "services-1/Section1",
    label: "Services — Hero (title + contact + banner)",
    group: "Heroes",
    component: asSection(ServicesIntro),
    editable: true,
    fields: {
      heading: { type: "text", label: "Heading" },
      email: { type: "text", label: "Email" },
      phone: { type: "text", label: "Phone" },
      image: imageField("Banner image"),
    },
    defaultProps: { ...SERVICES_INTRO_DEFAULTS },
  },
  {
    type: "TeamIntro1",
    source: "index-3/Section9",
    label: "Team — Intro + member grid",
    group: "Team",
    component: asSection(TeamIntro),
    editable: true,
    fields: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "textarea", label: "Heading" },
      intro: { type: "textarea", label: "Intro paragraph" },
      ctaLabel: { type: "text", label: "Button label" },
      ctaHref: { type: "text", label: "Button link" },
      team: {
        type: "array",
        label: "Team members",
        arrayFields: {
          img: imageField("Photo"),
          name: { type: "text", label: "Name" },
          position: { type: "text", label: "Role" },
        },
        getItemSummary: (item: { name?: string }) => item.name || "Member",
      },
    },
    defaultProps: { ...TEAM_INTRO_DEFAULTS },
  },
  {
    type: "FaqHero1",
    source: "faqs/Section1",
    label: "FAQ — Hero + search",
    group: "FAQ",
    component: asSection(FaqHero),
    editable: true,
    fields: {
      eyebrow: { type: "text", label: "Eyebrow" },
      heading: { type: "textarea", label: "Heading" },
      subtitle: { type: "text", label: "Subtitle" },
      searchPlaceholder: { type: "text", label: "Search placeholder" },
      buttonLabel: { type: "text", label: "Button label" },
    },
    defaultProps: { ...FAQ_HERO_DEFAULTS },
  },
  {
    type: "FaqTopics1",
    source: "faqs/Section2",
    label: "FAQ — Topic cards",
    group: "FAQ",
    component: asSection(FaqTopics),
    editable: true,
    fields: {
      heading: { type: "text", label: "Heading" },
      topics: {
        type: "array",
        label: "Topics",
        arrayFields: {
          number: { type: "text", label: "Number" },
          title: { type: "text", label: "Title" },
          description: { type: "textarea", label: "Description" },
          href: { type: "text", label: "Link" },
          image: imageField("Image"),
        },
        getItemSummary: (item: { title?: string }) => item.title || "Topic",
      },
    },
    defaultProps: { ...FAQ_TOPICS_DEFAULTS },
  },
  {
    type: "Home1Hero",
    source: "index-1/Section1",
    label: "Home — Hero with nav",
    group: "Heroes",
    component: asSection(Home1Hero),
  },
  {
    type: "Home1Intro",
    source: "index-1/Section2",
    label: "Home — Intro / marquee",
    group: "Content",
    component: asSection(Home1Intro),
  },
  {
    type: "Home1Testimonials",
    source: "index-1/Section6",
    label: "Testimonials — Dark band",
    group: "Content",
    component: asSection(Home1Testimonials),
  },
];
