import type { Exercise, WorkoutTemplate } from "./types";

/**
 * The routine catalogue — named, not generic.
 *
 * Six routines a household actually uses: two strength, two cardio, one
 * mobility, and the two that are the point of a family product — a Saturday
 * walk everybody comes on, and ten minutes that gets a nine-year-old off the
 * sofa. Starting one copies its sessions into dated `Workout` rows, so the
 * plan owns its own schedule from then on and the catalogue never changes
 * under anybody.
 *
 * Live, these are `wf_catalog_workouts` rows seeded per organisation by
 * `wf_seed_wellness(p_org)`; the shapes match exactly.
 */

const ex = (name: string, opts: Partial<Exercise> = {}): Exercise => ({
    name,
    sets: opts.sets ?? null,
    reps: opts.reps ?? "",
    minutes: opts.minutes ?? null,
    note: opts.note ?? "",
});

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
    {
        id: "tpl-strength-3",
        name: "Beginner strength 3×/week",
        blurb: "Squat, push, pull, carry. Eight weeks of the four movements that keep a body useful, with nothing you need a gym for.",
        focus: "strength",
        band: "adult",
        weeks: 8,
        imageUrl: "/images/wellness-strength.jpg",
        sessions: [
            {
                title: "Full body A",
                weekday: 1,
                durationMin: 35,
                exercises: [
                    ex("Goblet squat", { sets: 3, reps: "10", note: "One kettlebell or a heavy bag." }),
                    ex("Press-ups", { sets: 3, reps: "8–12", note: "On the stairs if the floor is too hard." }),
                    ex("Bent-over row", { sets: 3, reps: "10" }),
                    ex("Farmer's carry", { sets: 3, reps: "30 steps" }),
                    ex("Dead bug", { sets: 2, reps: "10 each side" }),
                ],
            },
            {
                title: "Full body B",
                weekday: 3,
                durationMin: 35,
                exercises: [
                    ex("Romanian deadlift", { sets: 3, reps: "10" }),
                    ex("Split squat", { sets: 3, reps: "8 each leg" }),
                    ex("Overhead press", { sets: 3, reps: "8" }),
                    ex("Plank", { sets: 3, reps: "30–45s" }),
                ],
            },
            {
                title: "Full body C",
                weekday: 6,
                durationMin: 40,
                exercises: [
                    ex("Goblet squat", { sets: 4, reps: "8" }),
                    ex("Press-ups", { sets: 3, reps: "as many as good form allows" }),
                    ex("Single-arm row", { sets: 3, reps: "10 each side" }),
                    ex("Glute bridge", { sets: 3, reps: "12" }),
                    ex("Brisk walk to finish", { minutes: 10 }),
                ],
            },
        ],
    },
    {
        id: "tpl-couch-5k",
        name: "Couch to 5k",
        blurb: "Nine weeks from a standing start to running five kilometres without stopping. Walk breaks are part of the plan, not a failure.",
        focus: "cardio",
        band: "adult",
        weeks: 9,
        imageUrl: "/images/wellness-run.jpg",
        sessions: [
            {
                title: "Run 1",
                weekday: 2,
                durationMin: 28,
                exercises: [ex("Brisk walk", { minutes: 5, note: "Warm up." }), ex("Run 60s / walk 90s", { sets: 8, reps: "×", note: "Repeat until the clock says 20 minutes." }), ex("Walk home", { minutes: 5 })],
            },
            {
                title: "Run 2",
                weekday: 4,
                durationMin: 28,
                exercises: [ex("Brisk walk", { minutes: 5 }), ex("Run 60s / walk 90s", { sets: 8, reps: "×" }), ex("Walk home", { minutes: 5 })],
            },
            {
                title: "Run 3 — the long one",
                weekday: 7,
                durationMin: 34,
                exercises: [ex("Brisk walk", { minutes: 5 }), ex("Run 90s / walk 2 min", { sets: 7, reps: "×" }), ex("Stretch", { minutes: 5 })],
            },
        ],
    },
    {
        id: "tpl-commuter-cycling",
        name: "Commuter cycling build",
        blurb: "Eight weeks of turning the ride to the station into training: one steady, one hilly, one long at the weekend with the club.",
        focus: "cardio",
        band: "adult",
        weeks: 8,
        imageUrl: "/images/wellness-cycling.jpg",
        sessions: [
            {
                title: "Steady spin",
                weekday: 2,
                durationMin: 45,
                exercises: [ex("Easy warm-up", { minutes: 10 }), ex("Steady effort", { minutes: 25, note: "You can still hold a sentence." }), ex("Spin down", { minutes: 10 })],
            },
            {
                title: "Hills",
                weekday: 4,
                durationMin: 50,
                exercises: [ex("Warm-up", { minutes: 12 }), ex("Hill repeats", { sets: 6, reps: "2 min up, roll down" }), ex("Cool down", { minutes: 10 })],
            },
            {
                title: "Club run",
                weekday: 6,
                durationMin: 90,
                exercises: [ex("Addiscombe CC group ride", { minutes: 90, note: "Café stop counts as part of it." })],
            },
        ],
    },
    {
        id: "tpl-mobility-15",
        name: "Core & mobility 15",
        blurb: "Fifteen minutes before bed for hips, back and shoulders — the antidote to a day at a desk.",
        focus: "mobility",
        band: "adult",
        weeks: 6,
        imageUrl: "/images/wellness-mobility.jpg",
        sessions: [
            {
                title: "Unwind",
                weekday: 1,
                durationMin: 15,
                exercises: [ex("Cat–cow", { minutes: 2 }), ex("90/90 hip switches", { minutes: 3 }), ex("Thoracic openers", { minutes: 3 }), ex("Hamstring stretch", { minutes: 3 }), ex("Breathing", { minutes: 4 })],
            },
            {
                title: "Unwind",
                weekday: 3,
                durationMin: 15,
                exercises: [ex("Cat–cow", { minutes: 2 }), ex("Deep squat hold", { minutes: 3 }), ex("Couch stretch", { minutes: 4 }), ex("Breathing", { minutes: 6 })],
            },
            {
                title: "Unwind",
                weekday: 5,
                durationMin: 15,
                exercises: [ex("Full body flow", { minutes: 8 }), ex("Breathing", { minutes: 7 })],
            },
        ],
    },
    {
        id: "tpl-family-walk",
        name: "Family Saturday walk",
        blurb: "One long walk a week that everybody comes on — Lloyd Park, Shirley Hills, Farthing Downs. Nobody is too small for it.",
        focus: "family",
        band: "family",
        weeks: 12,
        imageUrl: "/images/wellness-walk.jpg",
        sessions: [
            {
                title: "Saturday walk",
                weekday: 6,
                durationMin: 60,
                exercises: [ex("Walk somewhere green", { minutes: 55, note: "Ayo picks the route once a month." }), ex("Something warm at the end", { minutes: 5 })],
            },
        ],
    },
    {
        id: "tpl-kids-burst",
        name: "Kids' 10-minute energy burst",
        blurb: "Ten minutes, five silly movements, no equipment. Made for a rainy Tuesday between lessons.",
        focus: "kids",
        band: "child",
        weeks: 6,
        imageUrl: "/images/wellness-kids.jpg",
        sessions: [
            {
                title: "Burst",
                weekday: 2,
                durationMin: 10,
                exercises: [ex("Star jumps", { sets: 3, reps: "20" }), ex("Bear crawl the hallway", { sets: 3, reps: "there and back" }), ex("Frog jumps", { sets: 3, reps: "10" }), ex("Balance on one leg", { sets: 2, reps: "20s each" }), ex("Silly dance", { minutes: 2 })],
            },
            {
                title: "Burst",
                weekday: 4,
                durationMin: 10,
                exercises: [ex("Hopscotch", { minutes: 3 }), ex("Wall sit race", { sets: 2, reps: "30s" }), ex("Crab walk", { sets: 3, reps: "the length of the room" }), ex("Silly dance", { minutes: 2 })],
            },
        ],
    },
];

export const templateById = (id: string | null): WorkoutTemplate | undefined => (id ? WORKOUT_TEMPLATES.find((t) => t.id === id) : undefined);
