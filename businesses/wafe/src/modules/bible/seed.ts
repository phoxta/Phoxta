import type { SeedContext, Visibility } from "@/data/core";
import { isoDate } from "@/lib/format";
import { SCHEDULE, type BiblePlan, type BibleState, type MemoryVerse, type PlanDay, type Prayer, type PrayerMilestone, type PrayerReaction, type PrayerTag, type SessionDone, type Sensitivity, type Study, type StudySession, type StudyType, type VerseReview } from "./types";

/**
 * The Adeyemi family's Bible, in September.
 *
 * A reading plan the whole house is on (Proverbs, day 9 today), seven studies
 * — five from the library, one topical, one Oluwafemi wrote himself for the Lagos
 * trip — fourteen memory verses at every stage of the ladder, and a prayer
 * wall with eleven things still open, twenty-seven answered and the two
 * private lists that never touch it.
 *
 * Everything is relative to `today`, so the demo is never out of date, and the
 * scripture is public domain (World English Bible) so it can ship in the app.
 */

// ---------------------------------------------------------------------------
// The reading plan: Proverbs, one thought a day
// ---------------------------------------------------------------------------

/** Thirty days of Proverbs. Day 9 is the family's own verse — today's. */
const PROVERBS: Array<[string, string]> = [
    ["Proverbs 1:7", "The fear of Yahweh is the beginning of knowledge; but the foolish despise wisdom and instruction."],
    ["Proverbs 2:6", "For Yahweh gives wisdom. Out of his mouth comes knowledge and understanding."],
    ["Proverbs 3:5–6", "Trust in Yahweh with all your heart, and don't lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight."],
    ["Proverbs 4:23", "Keep your heart with all diligence, for out of it is the wellspring of life."],
    ["Proverbs 6:6", "Go to the ant, you sluggard. Consider her ways, and be wise."],
    ["Proverbs 10:12", "Hatred stirs up strife, but love covers all wrongs."],
    ["Proverbs 11:25", "The liberal soul shall be made fat. He who waters shall be watered also himself."],
    ["Proverbs 15:1", "A gentle answer turns away wrath, but a harsh word stirs up anger."],
    ["Proverbs 22:6", "Train up a child in the way he should go, and when he is old he will not depart from it."],
    ["Proverbs 16:3", "Commit your deeds to Yahweh, and your plans shall succeed."],
    ["Proverbs 16:9", "A man's heart plans his course, but Yahweh directs his steps."],
    ["Proverbs 17:17", "A friend loves at all times; and a brother is born for adversity."],
    ["Proverbs 18:10", "The name of Yahweh is a strong tower: the righteous run to him, and are safe."],
    ["Proverbs 19:17", "He who has pity on the poor lends to Yahweh; he will reward him."],
    ["Proverbs 20:11", "Even a child makes himself known by his doings, whether his work is pure, and whether it is right."],
    ["Proverbs 21:5", "The plans of the diligent surely lead to profit; and everyone who is hasty surely rushes to poverty."],
    ["Proverbs 22:1", "A good name is more desirable than great riches, and loving favour is better than silver and gold."],
    ["Proverbs 23:12", "Apply your heart to instruction, and your ears to the words of knowledge."],
    ["Proverbs 24:16", "For a righteous man falls seven times and rises up again."],
    ["Proverbs 25:11", "A word fitly spoken is like apples of gold in settings of silver."],
    ["Proverbs 25:28", "Like a city that is broken down and without walls is a man whose spirit is without restraint."],
    ["Proverbs 27:1", "Don't boast about tomorrow; for you don't know what a day may bring."],
    ["Proverbs 27:17", "Iron sharpens iron; so a man sharpens his friend's countenance."],
    ["Proverbs 28:13", "He who conceals his sins doesn't prosper, but whoever confesses and renounces them finds mercy."],
    ["Proverbs 29:11", "A fool vents all of his anger, but a wise man brings himself under control."],
    ["Proverbs 30:8", "Remove far from me falsehood and lies. Give me neither poverty nor riches. Feed me with the food that is needful for me."],
    ["Proverbs 31:8", "Open your mouth for the mute, in the cause of all who are left desolate."],
    ["Proverbs 31:26", "She opens her mouth with wisdom. Faithful instruction is on her tongue."],
    ["Proverbs 3:9", "Honour Yahweh with your substance, with the first fruits of all your increase."],
    ["Proverbs 9:10", "The fear of Yahweh is the beginning of wisdom. The knowledge of the Holy One is understanding."],
];

const SUMMER_PSALMS: Array<[string, string]> = [
    ["Psalm 1:1–3", "Blessed is the man who doesn't walk in the counsel of the wicked… he will be like a tree planted by the streams of water."],
    ["Psalm 8:3–4", "When I consider your heavens, the work of your fingers, the moon and the stars, which you have ordained; what is man, that you think of him?"],
    ["Psalm 16:11", "You will show me the path of life. In your presence is fullness of joy."],
    ["Psalm 23:1–3", "Yahweh is my shepherd: I shall lack nothing. He makes me lie down in green pastures. He leads me beside still waters."],
    ["Psalm 27:1", "Yahweh is my light and my salvation. Whom shall I fear?"],
    ["Psalm 46:10", "Be still, and know that I am God."],
    ["Psalm 121:1–2", "I will lift up my eyes to the hills. Where does my help come from? My help comes from Yahweh, who made heaven and earth."],
];

/** The rolling family list — what the house reads when no plan is running. */
const ROLLING: Array<{ reference: string; text: string }> = [
    { reference: "Joshua 24:15", text: "As for me and my house, we will serve Yahweh." },
    { reference: "Micah 6:8", text: "What does Yahweh require of you, but to act justly, to love mercy, and to walk humbly with your God?" },
    { reference: "Psalm 127:1", text: "Unless Yahweh builds the house, they labour in vain who build it." },
    { reference: "Colossians 3:23", text: "Whatever you do, work heartily, as for the Lord and not for men." },
    { reference: "1 John 4:19", text: "We love him, because he first loved us." },
    { reference: "Lamentations 3:22–23", text: "His compassions don't fail. They are new every morning. Great is your faithfulness." },
    { reference: "Hebrews 10:24", text: "Let's consider how to provoke one another to love and good works." },
    { reference: "Philippians 4:8", text: "Whatever things are true, whatever things are honourable… think about these things." },
];

// ---------------------------------------------------------------------------
// Studies
// ---------------------------------------------------------------------------

type SessionSeed = [passage: string, passageText: string, devotional: string, q1: string, q2: string, prayer: string];

interface StudySeed {
    id: string;
    title: string;
    type: StudyType;
    description: string;
    childSafe: boolean;
    value?: string;
    minutes: number;
    cover: string;
    sessions: SessionSeed[];
}

const STUDIES: StudySeed[] = [
    {
        id: "study-mark",
        title: "The Gospel of Mark, scene by scene",
        type: "preloaded",
        description: "Six sittings in the fastest of the gospels: a man in a hurry, and the people he stopped for.",
        childSafe: false,
        value: "Faith",
        minutes: 15,
        cover: "bible-mark",
        sessions: [
            [
                "Mark 1:16–18",
                "Passing along by the sea of Galilee, he saw Simon and Andrew casting a net. Jesus said to them, \"Come after me, and I will make you into fishers for men.\" Immediately they left their nets, and followed him.",
                "Mark never says how long they thought about it. The whole gospel moves at this pace — a man calls, and a working life turns on its heel. Notice that they were asked mid-shift, hands wet, not on a quiet retreat.",
                "What were you in the middle of the last time you sensed you were being asked something?",
                "What would \"leaving the nets\" cost in our house this month?",
                "That we would answer quickly when we are sure, and honestly when we are not.",
            ],
            [
                "Mark 1:35",
                "Early in the morning, while it was still dark, he rose up and went out, and departed into a deserted place, and prayed there.",
                "One verse, and it is the hinge of the chapter. The busiest day of his ministry so far is followed by the earliest morning. Rest and prayer were not what was left over; they were what everything else was built on.",
                "What is the first thing our household actually does in the morning?",
                "Where is the deserted place in a house of five?",
                "For one quiet quarter of an hour tomorrow, before the noise.",
            ],
            [
                "Mark 2:3–5",
                "They came, bringing to him a man who was paralysed, carried by four. When they were not able to come near to him for the crowd, they removed the roof… and let down the mat. Jesus, seeing their faith, said to the paralytic, \"Son, your sins are forgiven you.\"",
                "It is their faith Jesus sees, not his. Some people are carried to God by their friends, and the roof gets damaged in the process. Faith here is inconvenient, structural and shared.",
                "Who are we carrying at the moment?",
                "Who has carried us, and have we told them?",
                "For the four people we would want holding the corners of our mat.",
            ],
            [
                "Mark 4:37–39",
                "A big wind storm arose, and the waves beat into the boat… He himself was in the stern, asleep on the cushion. They woke him up, and told him, \"Teacher, don't you care that we are dying?\" He awoke, and rebuked the wind: \"Peace! Be still!\"",
                "They ask the question every anxious family asks in the small hours: do you not care? He does not scold them for waking him. He stills the thing that frightened them, and then asks about their fear.",
                "What storm are we in the middle of that we have not actually said out loud?",
                "What does it mean to be afraid and faithful at the same time?",
                "For the thing that keeps one of us awake.",
            ],
            [
                "Mark 6:31",
                "He said to them, \"You come apart into a deserted place, and rest awhile.\" For there were many coming and going, and they had no leisure so much as to eat.",
                "The disciples had just come back from their most fruitful trip. His response to fruitfulness was a nap and a meal. A family that never stops is not more faithful; it is only more tired.",
                "When did we last rest on purpose rather than by collapse?",
                "What would a real Sabbath afternoon look like for us this month?",
                "That we would learn to stop before we are made to.",
            ],
            [
                "Mark 10:45",
                "For the Son of Man also came not to be served, but to serve, and to give his life as a ransom for many.",
                "This is Mark's whole thesis in one line, and it arrives just after two disciples have asked for the best seats. Greatness is redefined, quietly, in the middle of an argument about status.",
                "Where do we quietly keep score in this house?",
                "What is one act of service nobody would see?",
                "For a week of unseen service, done gladly.",
            ],
        ],
    },
    {
        id: "study-psalms",
        title: "Psalms for anxious hearts",
        type: "preloaded",
        description: "Five psalms for the nights when the mind will not settle. Written for teenagers and the adults who were once one.",
        childSafe: true,
        value: "Faith",
        minutes: 12,
        cover: "bible-psalms",
        sessions: [
            [
                "Psalm 34:18",
                "Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit.",
                "Nearness is the promise, not immediate rescue. The psalm does not tell you to cheer up; it tells you where God is standing while you are not cheerful.",
                "What would it change to believe God is near rather than disappointed?",
                "Who do you know with a crushed spirit this week?",
                "For nearness, in the exact place it hurts.",
            ],
            [
                "Psalm 56:3",
                "When I am afraid, I will put my trust in you.",
                "\"When\", not \"if\". David assumes the fear and puts trust inside it rather than instead of it. Courage in the psalms is almost always fear with somewhere to go.",
                "What are you afraid of that you have not named?",
                "What is one small act of trust you could make today?",
                "For the courage that admits it is afraid.",
            ],
            [
                "Psalm 62:8",
                "Trust in him at all times, you people. Pour out your heart before him. God is a refuge for us.",
                "Pour out — not tidy up first. The psalms are full of unedited speech; God is not embarrassed by it, and neither should we be at our own table.",
                "Where do you edit yourself when you pray?",
                "What would an unedited prayer sound like tonight?",
                "That we would say the true thing rather than the tidy one.",
            ],
            [
                "Psalm 94:19",
                "In the multitude of my thoughts within me, your comforts delight my soul.",
                "\"The multitude of my thoughts\" is the best description of 2 a.m. ever written. Comfort here is not the absence of the thoughts but company in the middle of them.",
                "What does your 2 a.m. sound like?",
                "What has comforted you before that you have forgotten to use?",
                "For quiet in a loud mind.",
            ],
            [
                "Psalm 139:23–24",
                "Search me, God, and know my heart. Try me, and know my thoughts. See if there is any wicked way in me, and lead me in the everlasting way.",
                "The psalm that begins with being fully known ends by asking to be known further. That is only safe because of everything the first twenty-two verses said about who is doing the searching.",
                "What would you rather God did not look at?",
                "What would it mean to be fully known and still wanted?",
                "For the courage to be searched.",
            ],
        ],
    },
    {
        id: "study-fruit",
        title: "Fruit of the Spirit, for children",
        type: "preloaded",
        description: "Nine short sessions, one for each fruit: a verse, a picture and something to try before bedtime.",
        childSafe: true,
        value: "Love",
        minutes: 10,
        cover: "bible-fruit",
        sessions: [
            ["Galatians 5:22 · Love", "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith, gentleness, and self-control.", "Fruit grows slowly and it grows on the inside first. Nobody shouts at an apple tree to hurry up. God grows these nine things in us the same patient way.", "Which fruit is easiest for you?", "Which one is hardest?", "That God would grow love in us this week."],
            ["1 John 4:19 · Love", "We love him, because he first loved us.", "We do not start the loving. We answer it. That is why loving a brother who has annoyed you is possible at all — you are passing on something you were given first.", "Who loved you first today?", "Who could you love before they love you?", "Thank you that you loved us first."],
            ["Psalm 118:24 · Joy", "This is the day that Yahweh has made. We will rejoice and be glad in it!", "Joy is not the same as everything going well. It is noticing what is good on a very ordinary Tuesday, out loud, so everyone hears it.", "What was good about today?", "Who could you tell?", "For eyes that notice the good things."],
            ["John 14:27 · Peace", "Peace I leave with you. My peace I give to you; not as the world gives, give I to you. Don't let your heart be troubled, neither let it be fearful.", "Peace is a present you are handed, like a blanket. It does not mean nothing scary happens; it means you are not carrying it on your own.", "What makes your heart feel troubled?", "What helps you feel peaceful again?", "For a quiet heart at bedtime."],
            ["James 1:19 · Patience", "Let every man be swift to hear, slow to speak, and slow to anger.", "Patience is mostly a game of speed: fast ears, slow mouth. Try it for one meal and see how strange and lovely it feels.", "When is it hardest to wait?", "Who waits patiently for you?", "Help us to be quick to listen today."],
            ["Ephesians 4:32 · Kindness", "And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you.", "Kindness is small and on purpose. It is the cup of water nobody asked you to fetch, and the sorry you say first.", "What kind thing did someone do for you?", "What could you do for someone before bed?", "For one kind thing, done quietly."],
            ["Psalm 34:8 · Goodness", "Oh taste and see that Yahweh is good. Blessed is the man who takes refuge in him.", "Taste and see — you find out that God is good the way you find out a mango is sweet. Not by being told. By trying it.", "What has tasted good about God this week?", "What would you like to try?", "Thank you that you are good."],
            ["Lamentations 3:22–23 · Faithfulness", "His compassions don't fail. They are new every morning. Great is your faithfulness.", "Every single morning is a fresh delivery. Yesterday's mistakes do not get carried forward. That is what faithfulness means when you are nine.", "What would you like a fresh start with?", "Who is faithful to you every day?", "Thank you for new mornings."],
            ["Proverbs 25:28 · Self-control", "Like a city that is broken down and without walls is a man whose spirit is without restraint.", "Walls are not there to make a city smaller. They are there so the good things inside stay safe. Self-control is the wall around a happy house.", "When is it hardest to stop yourself?", "What is your best trick for calming down?", "Help us to stop and think first."],
        ],
    },
    {
        id: "study-parables",
        title: "Parables for children",
        type: "preloaded",
        description: "Five stories Jesus told, with a question a five-year-old can answer and one a ten-year-old cannot.",
        childSafe: true,
        value: "Joy",
        minutes: 10,
        cover: "bible-parables",
        sessions: [
            ["Luke 15:4–6 · The lost sheep", "Which of you men, if you had one hundred sheep and lost one of them, wouldn't leave the ninety-nine and go after the one that was lost, until he found it? When he has found it, he carries it on his shoulders, rejoicing.", "Ninety-nine is a very good score. The shepherd does not think so. This is a story about being counted, not about being useful.", "Have you ever been lost? What did it feel like?", "Why does the shepherd carry the sheep home instead of making it walk?", "Thank you that you count us one by one."],
            ["Luke 10:33–34 · The good Samaritan", "But a certain Samaritan, as he travelled, came where he was. When he saw him, he was moved with compassion, came to him, and bound up his wounds, pouring on oil and wine.", "Two religious men crossed the road. The one who stopped was the one everybody in the crowd thought was the wrong sort. Jesus chose him on purpose.", "Who is hard for you to be kind to?", "What did it cost the Samaritan to stop?", "For eyes that see who is at the side of the road."],
            ["Mark 4:31–32 · The mustard seed", "It's like a grain of mustard seed, which, when it is sown in the earth, though it is less than all the seeds that are on the earth, yet when it is sown, grows up and becomes greater than all the herbs.", "Small does not mean unimportant. It means early. Almost everything good in a family started as something nobody would have photographed.", "What is the smallest good thing you did today?", "What would you like to grow into?", "For small beginnings and patient growing."],
            ["Matthew 7:24–25 · Two builders", "Everyone therefore who hears these words of mine and does them, I will liken him to a wise man who built his house on a rock. The rain came down, the floods came, and the winds blew and beat on that house; and it didn't fall, for it was founded on the rock.", "Both houses looked fine on a sunny day. The difference only showed in the weather. That is why what we do on ordinary days matters.", "What is our family's 'rock'?", "What helps a house stand up in a storm?", "That we would build carefully, on the right ground."],
            ["Mark 4:8 · The sower", "Others fell into the good ground and yielded fruit, growing up and increasing. Some produced thirty times, some sixty times, and some one hundred times as much.", "The sower is wildly generous with the seed. He throws it on the path, the rocks, the weeds and the field. That is what God's word is like — offered everywhere, taking root where there is room.", "What helps a seed grow?", "What makes your heart 'good ground'?", "Make room in us for good things to grow."],
        ],
    },
    {
        id: "study-proverbs",
        title: "Proverbs: a chapter a day",
        type: "preloaded",
        description: "Wisdom for the household — money, words, work and friendship — five chapters at a time.",
        childSafe: false,
        value: "Diligence",
        minutes: 12,
        cover: "bible-proverbs",
        sessions: [
            ["Proverbs 3:5–6", "Trust in Yahweh with all your heart, and don't lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.", "Not \"do not think\" — \"do not lean\". Understanding is a good tool and a poor crutch. Proverbs asks for a heart that trusts and a head that works.", "Where are we leaning hardest at the moment?", "What decision are we making on our own understanding alone?", "For a straight path through this month's decisions."],
            ["Proverbs 4:23", "Keep your heart with all diligence, for out of it is the wellspring of life.", "The heart is treated here as a water source for a whole household. Whatever gets into it comes out again, downstream, in how we speak at dinner.", "What have we been putting into our hearts this week?", "What would guarding the spring look like practically?", "That what flows out of us would be clean."],
            ["Proverbs 15:1", "A gentle answer turns away wrath, but a harsh word stirs up anger.", "This is the most immediately testable verse in the Bible. It works at home, at a school gate and on a group chat, every single time.", "Where did a gentle answer work this week?", "Where did we choose the harsh one, and why?", "For gentleness in the moment it costs something."],
            ["Proverbs 22:6", "Train up a child in the way he should go, and when he is old he will not depart from it.", "\"The way he should go\" is, in the Hebrew, closer to \"according to his way\" — the bent of this particular child. Training is not standardising; it is noticing.", "What is the particular bent of each of our children?", "What are we training by accident?", "For wisdom to raise these three, not three children in general."],
            ["Proverbs 27:17", "Iron sharpens iron; so a man sharpens his friend's countenance.", "Sharpening makes a noise and a few sparks. A friendship with no friction has probably never been asked to do anything difficult.", "Who sharpens us?", "Who have we gone soft on when we should have spoken?", "For two or three friends who will tell us the truth."],
        ],
    },
    {
        id: "study-stewardship",
        title: "Stewardship: what we do with what we have",
        type: "topical",
        description: "Four sessions on money, generosity and the family ledger — best done with the budget open in front of you.",
        childSafe: false,
        value: "Generosity",
        minutes: 20,
        cover: "bible-stewardship",
        sessions: [
            ["Luke 16:10", "He who is faithful in a very little is faithful also in much. He who is dishonest in a very little is also dishonest in much.", "The small sums are the training ground. How a household handles forty pounds tells you what it will do with forty thousand.", "What is our 'very little' at the moment?", "Where are we being slightly dishonest with ourselves in the budget?", "For faithfulness in the small numbers."],
            ["2 Corinthians 9:7", "Let each man give according as he has determined in his heart; not grudgingly, or under compulsion, for God loves a cheerful giver.", "\"Determined in his heart\" implies a decision made in advance, calmly, not an emotional response to an appeal. Cheerful giving is usually planned giving.", "What have we actually determined, in advance, to give?", "When did giving last feel like a grudge?", "That our giving would be decided, and glad."],
            ["Proverbs 3:9", "Honour Yahweh with your substance, with the first fruits of all your increase.", "First fruits, not leftovers. The order of the outgoings is itself a statement about who the household belongs to.", "What comes out of our account first?", "What would change if giving came before the direct debits?", "For a ledger that says what we believe."],
            ["Matthew 6:21", "For where your treasure is, there your heart will be also.", "Jesus reverses the order we expect: the money leads and the heart follows it. If you want to know what a family loves, read twelve months of statements.", "What do our last three months say we love?", "What one line would we like to be different by Christmas?", "That our treasure and our hearts would end up in the same place."],
        ],
    },
    {
        id: "study-lagos",
        title: "Christmas in Lagos: praying our way there",
        type: "custom",
        description: "Oluwafemi wrote this one for us — three sessions on family, welcome and going home, for the weeks before we fly.",
        childSafe: true,
        value: "Love",
        minutes: 15,
        cover: "bible-devotion",
        sessions: [
            ["Psalm 121:8", "Yahweh will keep your going out and your coming in, from this time forward, and forever more.", "A travelling psalm, sung by families walking to a festival. It covers the leaving and the arriving, which is exactly the pair of moments an airport makes you feel.", "What are we most looking forward to about going?", "What are we quietly anxious about?", "For our going out, and our coming in."],
            ["Proverbs 16:9", "A man's heart plans his course, but Yahweh directs his steps.", "Plans are not the opposite of trust; they are the raw material of it. We book the flights and hold them loosely.", "What have we planned that we are holding too tightly?", "What would trusting look like on the days a plan falls through?", "For plans held with an open hand."],
            ["Romans 12:13", "Contributing to the needs of the saints; given to hospitality.", "We arrive as guests and we will be received as family. Hospitality runs in both directions on this trip, and it is worth deciding now what we are bringing.", "Who are we going to bless while we are there?", "What do we want the children to remember about Nigerian hospitality?", "For open hands and an open house, at both ends."],
        ],
    },
];

// ---------------------------------------------------------------------------
// Prayer
// ---------------------------------------------------------------------------

type Who = "ife" | "tunde" | "dami" | "tobi" | "ayo" | "folake" | "dayo";

type OpenSeed = [id: string, title: string, detail: string, author: Who, tags: PrayerTag[], createdDays: number, opts?: { visibility?: Visibility; sharedWith?: Who[]; childSafe?: boolean; guests?: boolean; sensitivity?: Sensitivity; fromGuest?: boolean }];

const OPEN: OpenSeed[] = [
    ["pr-lagos-travel", "Safe travels for the December visit", "That the flights, the paperwork and my old knees would all hold together, and that I would see all three of my grandchildren under one roof at Christmas.", "folake", ["travel", "family"], -6, { visibility: "child", childSafe: true, guests: true, fromGuest: true }],
    ["pr-science-fair", "Tobi's science fair on Thursday", "He has built a volcano and rehearsed his talk eleven times. Pray for steady hands and a brave voice.", "ife", ["school"], -5, { visibility: "child", childSafe: true }],
    ["pr-gcse", "Dami's GCSE year — steady nerves", "A long year ahead. That she would work hard and sleep well, and that her worth would never hang on a grade.", "tunde", ["school", "family"], -21, { visibility: "child", childSafe: true, guests: true }],
    ["pr-building-fund", "Grace Chapel's building fund", "£40,000 to go on the roof before winter. Pray for the church family and for wisdom on the trustees.", "tunde", ["church", "provision"], -14, { guests: true }],
    ["pr-bella", "Bella's paw is healing", "She cut it on the fence and had to wear the cone. Please pray it does not get infected because she hates the cone.", "tobi", ["health"], -4, { visibility: "child", childSafe: true }],
    ["pr-knee", "Mama Fọláké's knee", "The specialist in Ibadan wants to see her again in October. Pray for less pain on the stairs, and for her to accept help.", "ife", ["health", "family"], -12, { visibility: "child", childSafe: true, guests: true }],
    // Shared, not broadcast: the numbers are between the two of them.
    ["pr-clients", "Two clients still deciding", "The consultancy needs one of them to say yes before the end of the month. Pray for calm and for provision, in that order.", "ife", ["work", "provision"], -41, { visibility: "shared", sharedWith: ["tunde"], sensitivity: "financial" }],
    ["pr-okonkwos", "The Okonkwos as they move house", "Completion keeps slipping and the children start a new school in a fortnight.", "tunde", ["family"], -9, { visibility: "child", childSafe: true }],
    ["pr-mens-group", "Pastor Dayo's men's group", "Twelve men, most of them new. Pray for honesty in the room and for Dayo, who carries more than he says.", "tunde", ["church", "mission"], -18, { guests: true }],
    ["pr-mrs-hall", "Mrs Hall next door, since Bill died", "Six weeks now. She is still saying she is fine. Pray for a way in, and for our own courage to keep knocking.", "ife", ["grief"], -16, {}],
    ["pr-ayo-reception", "Ayo settling into Reception", "New shoes, new teacher, and she cried at the gate on Tuesday. Pray for one good friend.", "ife", ["school", "family"], -8, { visibility: "child", childSafe: true }],
];

type AnsweredSeed = [id: string, title: string, author: Who, tags: PrayerTag[], answeredDays: number, testimony: string, opts?: { childSafe?: boolean; guests?: boolean; sensitivity?: Sensitivity; fromGuest?: boolean }];

const ANSWERED: AnsweredSeed[] = [
    ["pr-a-seun", "Uncle Seun's new job", "ife", ["work", "family"], -4, "Offer letter on Wednesday, after fourteen months of looking. He rang Oluwafemi from the car park and neither of them could speak.", { guests: true }],
    ["pr-a-contract", "Oluwafemi's contract renewed", "tunde", ["work", "provision"], -5, "Two years, and a title he did not ask for. We prayed about this every Sunday since March.", {}],
    ["pr-a-scan", "Mama Fọláké's scan came back clear", "ife", ["health", "family"], -19, "Clear. She said she had known all along, which is not what she said in August.", { childSafe: true, guests: true }],
    ["pr-a-tobi-friend", "A friend for Tobi at co-op", "ife", ["school", "family"], -26, "Kayode. They have built three volcanoes and a trebuchet since June.", { childSafe: true }],
    ["pr-a-boiler", "The boiler, before winter", "tunde", ["provision"], -33, "Fixed for £180 instead of replaced for £2,600. The engineer found a valve.", {}],
    ["pr-a-ayo-reading", "That Ayo would love books", "ife", ["school", "family"], -40, "She read a whole page to Mama Fọláké down the phone and then asked to do it again.", { childSafe: true, guests: true }],
    ["pr-a-dami-place", "Dami's place on the maths programme", "tunde", ["school"], -47, "Offered in July. She pretended not to mind and then told six people.", { childSafe: true }],
    ["pr-a-neighbour", "A way in with the Hendersons", "ife", ["family", "mission"], -61, "They came to the street barbecue. Two hours in our garden and an invitation back.", { childSafe: true }],
    ["pr-a-visa", "Mama Fọláké's visa for the summer", "tunde", ["travel", "family"], -75, "Granted in eleven days when we were told to expect eight weeks.", { childSafe: true, guests: true }],
    ["pr-a-car", "A car we could actually afford", "ife", ["provision"], -88, "The Okonkwos sold us theirs at half what it was worth and refused to discuss it.", {}],
    ["pr-a-bible-study", "Oluwafemi's Tuesday study getting off the ground", "tunde", ["church", "mission"], -103, "Four men became nine. Two of them had never opened a Bible before.", { guests: true }],
    ["pr-a-tobi-fear", "Tobi's fear of the dark", "ife", ["health", "family"], -117, "Gone by half term. He now sleeps with the door shut, which we never expected.", { childSafe: true }],
    ["pr-a-clients-spring", "Work for the spring", "ife", ["work", "provision"], -131, "Three projects in one fortnight after an empty February.", {}],
    ["pr-a-dayo-health", "Pastor Dayo's blood pressure", "tunde", ["health"], -145, "Down, after the doctor put the fear of God in him and Grace hid the salt.", { guests: true }],
    ["pr-a-school-place", "The right school place for Ayo", "tunde", ["school", "family"], -160, "Our first choice, five minutes' walk, and Tobi's old teacher in the next classroom.", { childSafe: true }],
    ["pr-a-grandad", "Peace when Grandpa Adeyemi died", "tunde", ["grief", "family"], -178, "Not the absence of grief. The strange, real steadiness that came with it, and a full house in Ibadan.", {}],
    ["pr-a-passport", "Dami's passport in time", "ife", ["travel"], -196, "Four days before the flight. Delivered by a man who apologised for the delay.", { childSafe: true }],
    ["pr-a-rent", "Provision the month the invoices were late", "ife", ["provision"], -214, "Two clients paid on the same Friday. We have never worked out why.", {}],
    ["pr-a-bella", "A dog the children would love", "tobi", ["family"], -231, "Bella. Nine years old, one ear, and entirely Tobi's.", { childSafe: true }],
    ["pr-a-marriage", "A better rhythm for us two", "ife", ["family"], -249, "Friday nights, protected since January. Fifteen of them so far and only two missed.", {}],
    ["pr-a-tobi-reading", "Tobi's reading, when it would not come", "ife", ["school"], -268, "Something clicked in the spring. He now reads under the covers with a torch.", { childSafe: true }],
    ["pr-a-church-family", "That we would find our people at Grace Chapel", "tunde", ["church"], -287, "The Wednesday house group. Six families and a great deal of jollof.", { guests: true }],
    ["pr-a-work-peace", "Peace about leaving the old firm", "tunde", ["work"], -305, "Clarity came on a Sunday walk, and the resignation was written that evening.", {}],
    ["pr-a-ife-mother", "Strength for Mum after the fall", "ife", ["health", "family"], -324, "Walking unaided by Christmas, against the physio's expectations.", { childSafe: true, guests: true }],
    ["pr-a-lagos-trip", "That we could get to Nigeria at all last year", "tunde", ["travel", "family"], -342, "Five seats on one flight, found the day the price dropped.", { childSafe: true }],
    ["pr-a-generosity", "That we would be a generous house", "ife", ["provision", "mission"], -360, "The giving line went up the year the income went down, and nothing fell over.", {}],
    ["pr-a-first-home", "This house", "ife", ["provision", "family"], -382, "Offer accepted on the eleventh attempt. We prayed on the doorstep before we had the keys.", { childSafe: true }],
];

// ---------------------------------------------------------------------------
// Memory verses
// ---------------------------------------------------------------------------

type VerseSeed = [id: string, who: Who, reference: string, text: string, addedDays: number, passed: number, dueIn: number, readAloud?: boolean];

const VERSES: VerseSeed[] = [
    // Dami: six, two of them due today.
    ["mv-dami-1", "dami", "Psalm 119:11", "I have hidden your word in my heart, that I might not sin against you.", -64, 3, 0],
    ["mv-dami-2", "dami", "Philippians 4:6–7", "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.", -30, 2, -2],
    ["mv-dami-3", "dami", "Romans 12:2", "Don't be conformed to this world, but be transformed by the renewing of your mind.", -21, 2, 4],
    ["mv-dami-4", "dami", "Isaiah 40:31", "But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles.", -48, 4, 11],
    ["mv-dami-5", "dami", "Proverbs 3:5–6", "Trust in Yahweh with all your heart, and don't lean on your own understanding.", -95, 5, 21],
    ["mv-dami-6", "dami", "Joshua 1:9", "Be strong and courageous. Don't be afraid, neither be dismayed, for Yahweh your God is with you wherever you go.", -9, 1, 1],
    // Tobi: three, one due.
    ["mv-tobi-1", "tobi", "John 3:16", "For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.", -40, 3, 0],
    ["mv-tobi-2", "tobi", "Psalm 23:1", "Yahweh is my shepherd: I shall lack nothing.", -18, 2, 6],
    ["mv-tobi-3", "tobi", "Ephesians 6:1", "Children, obey your parents in the Lord, for this is right.", -6, 1, 13],
    // Ayo: one, read aloud, due today.
    ["mv-ayo-1", "ayo", "Psalm 136:1", "Give thanks to Yahweh, for he is good; for his loving kindness endures forever.", -11, 1, 0, true],
    // The parents keep their own.
    ["mv-ife-1", "ife", "Proverbs 22:6", "Train up a child in the way he should go, and when he is old he will not depart from it.", -120, 5, 2],
    ["mv-ife-2", "ife", "Lamentations 3:22–23", "His compassions don't fail. They are new every morning. Great is your faithfulness.", -25, 2, 0],
    ["mv-tunde-1", "tunde", "Micah 6:8", "What does Yahweh require of you, but to act justly, to love mercy, and to walk humbly with your God?", -52, 3, -1],
    ["mv-tunde-2", "tunde", "Joshua 24:15", "As for me and my house, we will serve Yahweh.", -140, 5, 9],
];

// ---------------------------------------------------------------------------
// seed()
// ---------------------------------------------------------------------------

export function seed(ctx: SeedContext): BibleState {
    const { at, img, space } = ctx;
    /**
     * A LOCAL date helper, on purpose.
     *
     * `ctx.day()` derives its date from a UTC ISO string, so through British
     * Summer Time it lands a day early — harmless for a caption, fatal here,
     * where a card is due when `dueAt <= ctx.today` and a streak is counted
     * day by day against that same string. Everything date-only in this seed
     * is measured from `ctx.today` in local time so the arithmetic the screens
     * do matches the arithmetic the seed did.
     */
    const dayOf = (n: number): string => {
        const d = new Date(`${ctx.today}T12:00:00`);
        d.setDate(d.getDate() + n);
        return isoDate(d);
    };
    const [ife, tunde] = ctx.parents;
    const [dami, tobi, ayo] = ctx.kids;
    const folake = ctx.guests.find((g) => g.relation === "Grandma") ?? ctx.guests[0];
    const dayo = ctx.guests.find((g) => g.relation === "Mentor") ?? ctx.guests[1];
    const who: Record<string, string> = { ife: ife.id, tunde: tunde.id, dami: dami.id, tobi: tobi.id, ayo: ayo.id, folake: folake.id, dayo: dayo.id };

    // -- studies and sessions ------------------------------------------------

    const ENROLLED: Record<string, string[]> = {
        "study-mark": [ife.id, tunde.id],
        "study-psalms": [dami.id],
        "study-fruit": [tobi.id, ayo.id],
        "study-lagos": [ife.id, tunde.id, dami.id],
        "study-parables": [],
        "study-proverbs": [],
        "study-stewardship": [],
    };

    const studies: Study[] = STUDIES.map((s, i) => ({
        id: s.id,
        spaceId: space.id,
        title: s.title,
        type: s.type,
        description: s.description,
        childSafe: s.childSafe,
        assigneeMemberIds: ENROLLED[s.id] ?? [],
        value: s.value,
        coverUrl: img(s.cover),
        minutes: s.minutes,
        createdAt: at(-200 + i * 12, "20:30"),
    }));

    const sessions: StudySession[] = STUDIES.flatMap((s) =>
        s.sessions.map((row, i) => ({
            id: `${s.id}-s${i + 1}`,
            studyId: s.id,
            order: i + 1,
            passage: row[0],
            passageText: row[1],
            devotional: row[2],
            questions: [row[3], row[4]],
            prayerFocus: row[5],
        })),
    );

    /** Who has finished which sessions, and roughly when. */
    const PROGRESS: Array<[studyId: string, memberId: string, count: number, startedDays: number, everyDays: number]> = [
        ["study-mark", ife.id, 3, -12, 4],
        ["study-mark", tunde.id, 3, -12, 4],
        ["study-psalms", dami.id, 4, -16, 4],
        ["study-fruit", tobi.id, 4, -14, 3],
        ["study-fruit", ayo.id, 3, -14, 4],
        ["study-lagos", ife.id, 1, -9, 3],
    ];
    const done: SessionDone[] = [];
    for (const [studyId, memberId, count, startedDays, everyDays] of PROGRESS) {
        for (let i = 0; i < count; i += 1) {
            const d = startedDays + i * everyDays;
            done.push({ id: `done-${studyId}-${memberId}-${i + 1}`, studyId, sessionId: `${studyId}-s${i + 1}`, memberId, date: dayOf(d), at: at(d, "19:40") });
        }
    }

    // -- plans ---------------------------------------------------------------

    const plans: BiblePlan[] = [
        {
            id: "plan-proverbs",
            spaceId: space.id,
            title: "Proverbs in September",
            // Day 9 lands on today — Proverbs 22:6, the verse this family
            // has said over its children since Dami was born.
            startDate: dayOf(-8),
            translation: "WEB",
            assigneeMemberIds: [ife.id, tunde.id, dami.id, tobi.id, ayo.id],
            active: true,
            createdAt: at(-10, "21:15"),
        },
        {
            id: "plan-psalms-summer",
            spaceId: space.id,
            title: "Psalms for the summer",
            startDate: dayOf(-70),
            translation: "WEB",
            assigneeMemberIds: [ife.id, tunde.id, dami.id],
            active: false,
            createdAt: at(-74, "20:00"),
        },
    ];

    const planDays: PlanDay[] = [
        ...PROVERBS.map(([passage, passageText], i) => ({ planId: "plan-proverbs", day: i + 1, passage, passageText })),
        ...SUMMER_PSALMS.map(([passage, passageText], i) => ({ planId: "plan-psalms-summer", day: i + 1, passage, passageText })),
    ];

    // -- memory verses and their review ladders ------------------------------

    const memoryVerses: MemoryVerse[] = [];
    const reviews: VerseReview[] = [];
    for (const [id, key, reference, text, addedDays, passed, dueIn, readAloud] of VERSES) {
        const memberId = who[key];
        memoryVerses.push({ id, spaceId: space.id, memberId, reference, text, readAloud: Boolean(readAloud), addedAt: at(addedDays, "19:00") });
        // The rungs already climbed, each answered on the day it came up.
        let cursor = addedDays;
        for (let step = 0; step < passed; step += 1) {
            const dueDay = cursor + SCHEDULE[step];
            reviews.push({
                id: `${id}-r${step + 1}`,
                verseId: id,
                memberId,
                dueAt: dayOf(dueDay),
                intervalDays: SCHEDULE[step],
                step,
                result: "knew",
                reviewedAt: at(dueDay, "07:20"),
            });
            cursor = dueDay;
        }
        // …and the card that is waiting.
        const step = Math.min(passed, SCHEDULE.length - 1);
        reviews.push({ id: `${id}-r${passed + 1}`, verseId: id, memberId, dueAt: dayOf(dueIn), intervalDays: SCHEDULE[step], step, result: null, reviewedAt: null });
    }

    // -- prayer --------------------------------------------------------------

    const prayers: Prayer[] = [];

    for (const [id, title, detail, author, tags, createdDays, opts] of OPEN) {
        prayers.push({
            id,
            spaceId: space.id,
            authorMemberId: who[author],
            title,
            detail,
            tags,
            visibility: opts?.visibility ?? "family",
            sharedWith: (opts?.sharedWith ?? []).map((k) => who[k]),
            sensitivity: opts?.sensitivity ?? "general",
            status: "open",
            answeredAt: null,
            testimony: "",
            childSafe: opts?.childSafe ?? false,
            sharedWithGuests: opts?.guests ?? false,
            fromGuest: opts?.fromGuest ?? false,
            createdAt: at(createdDays, "21:05"),
        });
    }

    for (const [id, title, author, tags, answeredDays, testimony, opts] of ANSWERED) {
        prayers.push({
            id,
            spaceId: space.id,
            authorMemberId: who[author],
            title,
            detail: "",
            tags,
            visibility: opts?.childSafe ? "child" : "family",
            sharedWith: [],
            sensitivity: opts?.sensitivity ?? "general",
            status: "answered",
            answeredAt: dayOf(answeredDays),
            testimony,
            childSafe: opts?.childSafe ?? false,
            sharedWithGuests: opts?.guests ?? false,
            fromGuest: opts?.fromGuest ?? false,
            createdAt: at(answeredDays - 34, "21:05"),
        });
    }

    // The two private lists. These never appear on a wall, in a briefing or in
    // the companion's grounding for anyone but their author (AC2).
    prayers.push({
        id: "pr-private-ife",
        spaceId: space.id,
        authorMemberId: ife.id,
        title: "My own heart about the business",
        detail: "That I would stop measuring myself by the invoices, and that Oluwafemi would not have to carry my worry as well as his own.",
        tags: ["work"],
        visibility: "private",
        sharedWith: [],
        sensitivity: "private",
        status: "open",
        answeredAt: null,
        testimony: "",
        childSafe: false,
        sharedWithGuests: false,
        fromGuest: false,
        createdAt: at(-7, "22:40"),
    });
    prayers.push({
        id: "pr-private-dami",
        spaceId: space.id,
        authorMemberId: dami.id,
        title: "That I would stop being so afraid of the results",
        detail: "I don't want to talk about it yet. Just writing it down.",
        tags: ["school"],
        visibility: "private",
        sharedWith: [],
        sensitivity: "private",
        status: "open",
        answeredAt: null,
        testimony: "",
        childSafe: false,
        sharedWithGuests: false,
        fromGuest: false,
        createdAt: at(-2, "23:10"),
    });

    // -- "I prayed" ----------------------------------------------------------
    //
    // Ifeoluwa has prayed every day for a week except Thursday, which the family
    // had already agreed was a grace day — so her streak reads seven, with one
    // day stepped over rather than a chain broken (AC9).
    const reactions: PrayerReaction[] = [];
    const react = (memberId: string, prayerId: string, days: number): void => {
        reactions.push({ id: `rx-${prayerId}-${memberId}-${days}`, prayerId, memberId, type: "prayed", date: dayOf(days), at: at(days, "07:35") });
    };
    const wallOpenIds = OPEN.map((o) => o[0]);
    for (const d of [0, -1, -2, -4, -5, -6, -7]) react(ife.id, wallOpenIds[Math.abs(d) % wallOpenIds.length], d);
    for (const d of [0, -1, -2, -5, -6]) react(tunde.id, wallOpenIds[(Math.abs(d) + 3) % wallOpenIds.length], d);
    for (const d of [-1, -2, -6]) react(dami.id, wallOpenIds[(Math.abs(d) + 1) % wallOpenIds.length], d);
    for (const d of [0, -2]) react(tobi.id, "pr-bella", d);
    react(tobi.id, "pr-science-fair", -1);
    for (const d of [0, -1, -3, -4]) react(folake.id, "pr-gcse", d);
    react(folake.id, "pr-knee", -2);
    react(folake.id, "pr-mens-group", -5);
    react(tunde.id, "pr-lagos-travel", 0);
    react(dami.id, "pr-lagos-travel", -1);
    react(ife.id, "pr-mrs-hall", -1);
    react(ife.id, "pr-building-fund", -2);

    // -- the family timeline -------------------------------------------------

    const timeline: PrayerMilestone[] = prayers
        .filter((p) => p.status === "answered" && p.answeredAt)
        .map((p) => ({
            id: `pm-${p.id}`,
            prayerId: p.id,
            date: p.answeredAt as string,
            title: `Answered: ${p.title}`,
            body: p.testimony,
            href: "/grow/bible/prayer",
            memberIds: [],
            ownerMemberId: p.authorMemberId,
            visibility: p.visibility,
            sharedWith: p.sharedWith,
        }));

    return {
        studies,
        sessions,
        done,
        plans,
        planDays,
        memoryVerses,
        reviews,
        prayers,
        reactions,
        // Mama Fọláké was granted the wall object; Pastor Dayo was not, so his
        // wall is absent rather than empty-looking (AC4).
        wallGuestIds: [folake.id],
        // Days the family agreed to rest: the Thursday they drove to Manchester
        // and the Saturday of the wedding.
        graceDays: [dayOf(-3), dayOf(-17)],
        rollingVerses: ROLLING,
        verses: [],
        timeline,
        units: [],
    };
}
