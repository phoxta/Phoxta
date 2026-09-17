import type { SongData, SongKind, SongSection, StoryAudience, StoryData, StoryScene } from "./types";

/**
 * The generators.
 *
 * Two rules run through this file. First, a lead sheet is not a lead sheet
 * without a key, a tempo, named sections and a chord line — so whatever comes
 * back from the model is CLAMPED into that shape, and anything missing is
 * filled from the template. Second, the demo has to work with no backend at
 * all, so every generator has a real, written-by-hand template path that
 * produces something a family would actually sing or read. The template is not
 * a placeholder; it is the floor.
 *
 * On the missing feature, plainly: Wàfè generates WORDS and CHORDS, not audio.
 * There is no licensed music model behind it, and pretending otherwise would
 * put the family on the wrong side of a rights question they never asked to be
 * in. What the family gets instead is the browser's own recorder — sing the
 * lead sheet, keep the take, use it as the track under a memory reel.
 */

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const listNames = (names: string[]): string => {
    const n = names.filter(Boolean);
    if (!n.length) return "all of us";
    if (n.length === 1) return n[0];
    return `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
};

// ---------------------------------------------------------------------------
// Song templates — written, not generated
// ---------------------------------------------------------------------------

function familyAnthem(names: string[], theme: string, family: string): SongData {
    const who = listNames(names);
    return {
        songKind: "family",
        key: "G",
        tempo: 96,
        theme,
        names,
        prompt: `A family anthem for ${family} about ${theme}`,
        source: "template",
        model: null,
        recording: null,
        structure: [
            {
                section: "Verse 1",
                chords: "G   D   Em   C",
                lyrics: `Morning at the kitchen door,\nshoes and bags across the floor,\nsomebody is running late again —\nand still we hold the line.`,
            },
            {
                section: "Chorus",
                chords: "C   G   D   Em",
                lyrics: `We are ${family}, we are ${who},\nwe tell the truth and we tell it kind,\nwe keep the door open, we keep the table long,\nand what we build, we build to last.`,
            },
            {
                section: "Verse 2",
                chords: "G   D   Em   C",
                lyrics: `${theme ? cap(theme) : "Love"} is not a word we say,\nit is Sunday, it is Tuesday,\nit is turning up when turning up is hard —\nthat is how you know it's true.`,
            },
            {
                section: "Bridge",
                chords: "Em   C   G   D",
                lyrics: `And if the years should scatter us\nfrom Croydon to the sea,\nwhatever room you're standing in,\nyou're standing here with me.`,
            },
            {
                section: "Chorus",
                chords: "C   G   D   G",
                lyrics: `We are ${family}, we are ${who},\nwe tell the truth and we tell it kind,\nwe keep the door open, we keep the table long,\nand what we build, we build to last.`,
            },
        ],
    };
}

function worshipSong(theme: string, family: string): SongData {
    return {
        songKind: "worship",
        key: "D",
        tempo: 72,
        theme,
        names: [],
        prompt: `An evening blessing for ${family} about ${theme}`,
        source: "template",
        model: null,
        recording: null,
        structure: [
            { section: "Verse 1", chords: "D   A   Bm   G", lyrics: `The light goes down on Croydon,\nthe kettle finds its rest,\nand every small unfinished thing\nis laid down and is blessed.` },
            { section: "Chorus", chords: "G   D   A   Bm", lyrics: `Keep us, Lord, and keep this house,\nthe loud ones and the small,\nkeep the ones who are far away —\nyou have not lost them at all.` },
            { section: "Verse 2", chords: "D   A   Bm   G", lyrics: `For work that went unnoticed,\nfor patience nearly gone,\nfor mercy at the dinner table,\nwe thank you and sleep on.` },
            { section: "Bridge", chords: "Bm   G   D   A", lyrics: `Morning comes, and mercy with it,\nnew before we wake;\nnothing we have got wrong today\nis more than you can take.` },
        ],
    };
}

function lullaby(name: string): SongData {
    const first = name || "little one";
    return {
        songKind: "lullaby",
        key: "C",
        tempo: 60,
        theme: "sleep",
        names: [first],
        prompt: `A lullaby for ${first}`,
        source: "template",
        model: null,
        recording: null,
        structure: [
            { section: "Verse 1", chords: "C   Am   F   G", lyrics: `Sleep, little ${first}, the day is done,\nthe garden's dark, the birds have gone,\nyour shoes are by the bottom stair\nand nothing needs you anywhere.` },
            { section: "Chorus", chords: "F   C   G   C", lyrics: `Hush now, hush now, close your eyes,\nthe moon is doing all the work tonight.` },
            { section: "Verse 2", chords: "C   Am   F   G", lyrics: `Tomorrow there'll be things to do,\nbut none of them belong to you —\nthey'll wait outside the bedroom door\nuntil the morning, and no more.` },
            { section: "Bridge", chords: "Am   F   C   G", lyrics: `And if you wake and it is dark,\nI am one small room away.` },
        ],
    };
}

function birthdaySong(name: string, age: string): SongData {
    const first = name || "you";
    return {
        songKind: "birthday",
        key: "G",
        tempo: 112,
        theme: "birthday",
        names: [first],
        prompt: `A birthday song for ${first}`,
        source: "template",
        model: null,
        recording: null,
        structure: [
            { section: "Verse", chords: "G   C   D   G", lyrics: `Everybody in the kitchen, everybody sing,\n${first} is ${age || "one year older"} and we're making a din,\nthere is icing on the worktop and a candle to be lit —\nstand back, here it comes!` },
            { section: "Chorus", chords: "C   G   D   G", lyrics: `Happy birthday, ${first}!\nThe best of the year to you.\nHappy birthday, ${first}!\nWe are so glad you're you.` },
            { section: "Bridge", chords: "Em   C   G   D", lyrics: `One more wish before you blow them out:\nthat next year finds you braver still.` },
        ],
    };
}

export interface SongBrief {
    songKind: SongKind;
    names: string[];
    theme: string;
    familyName: string;
    extra?: string;
}

/** The written floor for any brief: always a full lead sheet. */
export function templateSong(brief: SongBrief): SongData {
    switch (brief.songKind) {
        case "worship":
            return worshipSong(brief.theme || "evening blessing", brief.familyName);
        case "lullaby":
            return lullaby(brief.names[0] ?? "");
        case "birthday":
            return birthdaySong(brief.names[0] ?? "", brief.extra ?? "");
        case "family":
        default:
            return familyAnthem(brief.names, brief.theme || "the life we're building", brief.familyName);
    }
}

export const suggestSongTitle = (brief: SongBrief): string => {
    switch (brief.songKind) {
        case "worship":
            return `${brief.familyName.replace(/^The\s+/i, "").replace(/\s+family$/i, "")} Evening Blessing`;
        case "lullaby":
            return `Sleep, Little ${brief.names[0] ?? "One"}`;
        case "birthday":
            return `Happy Birthday, ${brief.names[0] ?? "You"}`;
        case "family":
        default:
            return `The ${brief.familyName.replace(/^The\s+/i, "").replace(/\s+family$/i, "")} Song`;
    }
};

// ---------------------------------------------------------------------------
// Clamping what the model returns
// ---------------------------------------------------------------------------

const KEYS = ["C", "G", "D", "A", "E", "F", "Bb", "Eb", "Am", "Em", "Dm", "Bm"];
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v.trim() : d);

/**
 * A song from the model, forced into a lead sheet: a key we recognise, a
 * sensible tempo, at least a verse and a chorus, and a chord line on every
 * section — borrowed from the template when the model forgot one.
 */
export function clampSong(raw: unknown, brief: SongBrief): SongData {
    const fallback = templateSong(brief);
    if (!isRecord(raw)) return fallback;

    const sections: SongSection[] = Array.isArray(raw.structure)
        ? raw.structure
              .filter(isRecord)
              .slice(0, 8)
              .map((s, i) => ({
                  section: str(s.section, `Section ${i + 1}`).slice(0, 24),
                  chords: str(s.chords).slice(0, 80) || fallback.structure[i % fallback.structure.length].chords,
                  lyrics: str(s.lyrics).slice(0, 900),
              }))
              .filter((s) => s.lyrics.length > 0)
        : [];

    if (sections.length < 2) return fallback;
    // A lead sheet needs somewhere to come back to.
    if (!sections.some((s) => /chorus|refrain/i.test(s.section))) sections.splice(1, 0, fallback.structure.find((s) => /chorus/i.test(s.section)) ?? fallback.structure[1]);

    const key = KEYS.includes(str(raw.key)) ? str(raw.key) : fallback.key;
    const tempoRaw = Number(raw.tempo);
    const tempo = Number.isFinite(tempoRaw) && tempoRaw >= 40 && tempoRaw <= 200 ? Math.round(tempoRaw) : fallback.tempo;

    return { ...fallback, key, tempo, structure: sections, source: "ai" };
}

// ---------------------------------------------------------------------------
// Storyboards
// ---------------------------------------------------------------------------

const SCENE_BEATS = [
    { caption: "Where it starts", beat: "the ordinary world, before anything happens" },
    { caption: "The wish", beat: "what the hero wants, said out loud" },
    { caption: "The trouble", beat: "the thing that goes wrong" },
    { caption: "The try", beat: "the brave attempt that nearly works" },
    { caption: "The turn", beat: "the small idea that changes everything" },
    { caption: "Home again", beat: "what is different now, and who is glad" },
];

const AUDIENCE_VOICE: Record<StoryAudience, string> = {
    little: "Short sentences. Big feelings. Nothing frightening.",
    junior: "A proper adventure with a problem to solve.",
    teen: "A little more edge; the hero gets something wrong first.",
    family: "Read-aloud, for everybody in the room.",
};

export interface StoryBrief {
    prompt: string;
    audience: StoryAudience;
    scenes: number;
    hero: string;
}

/** Six scenes with a real shape, from nothing but the prompt. */
export function templateStory(brief: StoryBrief): StoryData {
    const hero = brief.hero || "our hero";
    const subject = brief.prompt.trim() || "a small brave adventure";
    const n = Math.max(3, Math.min(8, brief.scenes || 6));
    const scenes: StoryScene[] = Array.from({ length: n }, (_, i) => {
        const beat = SCENE_BEATS[Math.min(i, SCENE_BEATS.length - 1)];
        return {
            n: i + 1,
            caption: beat.caption,
            visual: `${cap(subject)} — ${beat.beat}. ${hero} in the middle of the frame, warm light, storybook colours.`,
            narration:
                i === 0
                    ? `This is ${hero}. Nothing much has happened yet, and that is about to change.`
                    : i === n - 1
                      ? `${cap(hero)} comes home. It is the same house, and ${hero} is not quite the same.`
                      : `${cap(hero)} meets ${beat.beat}.`,
            imageUrl: null,
            imageKind: "none",
        };
    });
    return { audience: brief.audience, scenes, prompt: subject, source: "template", model: null, reelId: null, sentToReelAt: null };
}

export function clampStory(raw: unknown, brief: StoryBrief): StoryData {
    const fallback = templateStory(brief);
    if (!isRecord(raw) || !Array.isArray(raw.scenes)) return fallback;
    const scenes: StoryScene[] = raw.scenes
        .filter(isRecord)
        .slice(0, 8)
        .map((s, i) => ({
            n: i + 1,
            caption: str(s.caption, fallback.scenes[Math.min(i, fallback.scenes.length - 1)].caption).slice(0, 70),
            visual: str(s.visual, fallback.scenes[Math.min(i, fallback.scenes.length - 1)].visual).slice(0, 300),
            narration: str(s.narration).slice(0, 400),
            imageUrl: null,
            imageKind: "none" as const,
        }))
        .filter((s) => s.narration.length > 0);
    if (scenes.length < 3) return fallback;
    return { ...fallback, scenes, source: "ai" };
}

export const audienceNote = (a: StoryAudience): string => AUDIENCE_VOICE[a];

// ---------------------------------------------------------------------------
// Sing-along timing
// ---------------------------------------------------------------------------

/**
 * How long one lyric line should hold at this tempo, in milliseconds. A line
 * is roughly a bar and a half of 4/4 — slow enough for a five-year-old, quick
 * enough that a chorus does not drag.
 */
export const lineMs = (tempo: number): number => Math.round((60000 / Math.max(40, Math.min(200, tempo))) * 6);

export const songLines = (song: SongData): Array<{ section: string; chords: string; line: string; first: boolean }> =>
    song.structure.flatMap((s) =>
        s.lyrics.split("\n").map((line, i) => ({ section: s.section, chords: s.chords, line: line.trim(), first: i === 0 })),
    );

// ---------------------------------------------------------------------------
// The typographic card (what an image becomes when the plan has no model)
// ---------------------------------------------------------------------------

export const IMAGE_UNAVAILABLE = "Image generation isn't on this plan, so I've kept your words and set them properly instead — the prompt is saved, and it will render as a picture the moment images are switched on.";

/** Six warm grounds from the design tokens, chosen by the prompt itself. */
export const CARD_PALETTES = [
    { bg: "#3E4A3A", ink: "#F4EFE6", tint: "#9AA88F" },
    { bg: "#B5563D", ink: "#FBF8F2", tint: "#F6E3DC" },
    { bg: "#C09040", ink: "#1F2320", tint: "#F7EEDA" },
    { bg: "#8A5A6B", ink: "#FBF8F2", tint: "#F3E5E9" },
    { bg: "#4F6B4A", ink: "#F4EFE6", tint: "#E3ECDF" },
    { bg: "#3F6F8F", ink: "#FBF8F2", tint: "#E1ECF3" },
];

export function paletteFor(prompt: string): number {
    let h = 0;
    for (const c of prompt) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % CARD_PALETTES.length;
}
