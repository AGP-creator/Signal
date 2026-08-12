/** Canonical GP / operator X watchlist from config/watchlists.yaml. */
export type GpVoice = {
  name: string;
  handle: string;
  url: string;
  /** person = individual; page = publication / show / org */
  kind: "person" | "page";
};

export const GP_WATCHLIST: GpVoice[] = [
  { name: "Molly O'Shea", handle: "mollysoshea", url: "https://x.com/mollysoshea", kind: "person" },
  { name: "Arfur Rock", handle: "arfurrock", url: "https://x.com/arfurrock", kind: "person" },
  { name: "Deedy", handle: "deedydas", url: "https://x.com/deedydas", kind: "person" },
  { name: "Ramtin Naimi", handle: "ramtinnaimi", url: "https://x.com/ramtinnaimi", kind: "person" },
  { name: "Alex Klein", handle: "alexklein0x", url: "https://x.com/alexklein0x", kind: "person" },
  { name: "Elad Gil", handle: "eladgil", url: "https://x.com/eladgil", kind: "person" },
  { name: "Everett Randle", handle: "everettrandle", url: "https://x.com/everettrandle", kind: "person" },
  { name: "The Information", handle: "theinformation", url: "https://x.com/theinformation", kind: "page" },
  { name: "Rick Gerson", handle: "rick_gerson", url: "https://x.com/rick_gerson", kind: "person" },
  { name: "David George", handle: "davidgeorge83", url: "https://x.com/davidgeorge83", kind: "person" },
  { name: "Beth Turner", handle: "elizabethturner", url: "https://x.com/elizabethturner", kind: "person" },
  { name: "Jaya Gupta", handle: "jayagup10", url: "https://x.com/jayagup10", kind: "person" },
  { name: "Anjney Midha", handle: "anjneymidha", url: "https://x.com/anjneymidha", kind: "person" },
  { name: "Chetan Puttagunta", handle: "chetanp", url: "https://x.com/chetanp", kind: "person" },
  { name: "Andrew Reed", handle: "andrew__reed", url: "https://x.com/andrew__reed", kind: "person" },
  { name: "Keith Rabois", handle: "rabois", url: "https://x.com/rabois", kind: "person" },
  { name: "Pat Grady", handle: "gradypb", url: "https://x.com/gradypb", kind: "person" },
  { name: "Colossus", handle: "colossusmag", url: "https://x.com/colossusmag", kind: "page" },
  { name: "David Senra", handle: "davidsenra", url: "https://x.com/davidsenra", kind: "person" },
  { name: "Uncapped", handle: "uncapped_pod", url: "https://x.com/uncapped_pod", kind: "page" },
  { name: "David Haber", handle: "dhaber", url: "https://x.com/dhaber", kind: "person" },
  { name: "Ravi Gupta", handle: "guptark22", url: "https://x.com/guptark22", kind: "person" },
  { name: "Mark Goldberg", handle: "mark_goldberg_", url: "https://x.com/mark_goldberg_", kind: "person" },
  { name: "Varun Gupta", handle: "varungupta", url: "https://x.com/varungupta", kind: "person" },
  { name: "Delian Asparouhov", handle: "zebulgar", url: "https://x.com/zebulgar", kind: "person" },
  { name: "Kevin Hartz", handle: "kevinhartz", url: "https://x.com/kevinhartz", kind: "person" },
  { name: "Tom Hulme", handle: "thulme", url: "https://x.com/thulme", kind: "person" },
  { name: "Kyle Harrison", handle: "kwharrison13", url: "https://x.com/kwharrison13", kind: "person" },
  { name: "Nikunj Kothari", handle: "nikunj", url: "https://x.com/nikunj", kind: "person" },
  { name: "Aditya Agarwal", handle: "adityaag", url: "https://x.com/adityaag", kind: "person" },
  { name: "Miles Grimshaw", handle: "milesgrimshaw", url: "https://x.com/milesgrimshaw", kind: "person" },
  { name: "Shaun Maguire", handle: "shaunmmaguire", url: "https://x.com/shaunmmaguire", kind: "person" },
  { name: "Brad Gerstner", handle: "altcap", url: "https://x.com/altcap", kind: "person" },
  { name: "Martin Casado", handle: "martin_casado", url: "https://x.com/martin_casado", kind: "person" },
  { name: "Bill Ackman", handle: "billackman", url: "https://x.com/billackman", kind: "person" },
  { name: "Logan Bartlett", handle: "loganbartlett", url: "https://x.com/loganbartlett", kind: "person" },
  { name: "Wiz", handle: "wizlikewizard", url: "https://x.com/wizlikewizard", kind: "person" },
  { name: "Gavin Baker", handle: "gavinsbaker", url: "https://x.com/gavinsbaker", kind: "person" },
  { name: "Jamin Ball", handle: "jaminball", url: "https://x.com/jaminball", kind: "person" },
  { name: "Sarah Wang", handle: "sarahdingwang", url: "https://x.com/sarahdingwang", kind: "person" },
  { name: "Sarah Guo", handle: "saranormous", url: "https://x.com/saranormous", kind: "person" },
  { name: "TBPN", handle: "tbpn", url: "https://x.com/tbpn", kind: "page" },
  { name: "Trae Stephens", handle: "traestephens", url: "https://x.com/traestephens", kind: "person" },
  { name: "Josh Wolfe", handle: "wolfejosh", url: "https://x.com/wolfejosh", kind: "person" },
  { name: "George Kurtz", handle: "george_kurtz", url: "https://x.com/george_kurtz", kind: "person" },
  { name: "Jason Lemkin", handle: "jasonlk", url: "https://x.com/jasonlk", kind: "person" },
  { name: "Chamath Palihapitiya", handle: "chamath", url: "https://x.com/chamath", kind: "person" },
  { name: "David Sacks", handle: "davidsacks", url: "https://x.com/davidsacks", kind: "person" },
  { name: "Elon Musk", handle: "elonmusk", url: "https://x.com/elonmusk", kind: "person" },
  { name: "Bill Gurley", handle: "bgurley", url: "https://x.com/bgurley", kind: "person" },
  { name: "Cem Sertoglu", handle: "csertoglu", url: "https://x.com/csertoglu", kind: "person" },
  { name: "Rex Salisbury", handle: "rex_woodbury", url: "https://x.com/rex_woodbury", kind: "person" },
  { name: "Eric Newcomer", handle: "ericnewcomer", url: "https://x.com/ericnewcomer", kind: "person" },
  { name: "Ian Rountree", handle: "ianrountree", url: "https://x.com/ianrountree", kind: "person" },
  { name: "Vinod Khosla", handle: "vkhosla", url: "https://x.com/vkhosla", kind: "person" },
  { name: "Marc Andreessen", handle: "pmarca", url: "https://x.com/pmarca", kind: "person" },
  { name: "Paul Graham", handle: "paulg", url: "https://x.com/paulg", kind: "person" },
  { name: "Sam Altman", handle: "sama", url: "https://x.com/sama", kind: "person" },
  { name: "Patrick Collison", handle: "patrickc", url: "https://x.com/patrickc", kind: "person" },
  { name: "Tobi Lütke", handle: "tobi", url: "https://x.com/tobi", kind: "person" },
  { name: "Aswath Damodaran", handle: "aswathdamodaran", url: "https://x.com/aswathdamodaran", kind: "person" },
  { name: "Morgan Housel", handle: "morganhousel", url: "https://x.com/morganhousel", kind: "person" },
  { name: "Byrne Hobart", handle: "byrnehobart", url: "https://x.com/byrnehobart", kind: "person" },
  { name: "Mario Gabriele", handle: "mariogabriele", url: "https://x.com/mariogabriele", kind: "person" },
  { name: "Howard Lindzon", handle: "howardlindzon", url: "https://x.com/howardlindzon", kind: "person" },
  { name: "Kauffman Fellows", handle: "kauffmanfellows", url: "https://x.com/kauffmanfellows", kind: "page" },
  { name: "Beezer Clarkson", handle: "beezer232", url: "https://x.com/beezer232", kind: "person" },
  { name: "Alex Konrad", handle: "alexrkonrad", url: "https://x.com/alexrkonrad", kind: "person" },
  { name: "Dan Primack", handle: "danprimack", url: "https://x.com/danprimack", kind: "person" },
  { name: "Katie Roof", handle: "katie_roof", url: "https://x.com/katie_roof", kind: "person" },
  { name: "Semil Shah", handle: "semil", url: "https://x.com/semil", kind: "person" },
  { name: "Hunter Walk", handle: "hunterwalk", url: "https://x.com/hunterwalk", kind: "person" },
  { name: "Packy McCormick", handle: "packym", url: "https://x.com/packym", kind: "person" },
];

/** Alias names that appear in chatter but differ from canonical display name. */
const NAME_ALIASES: Record<string, string[]> = {
  Deedy: ["Deedy Das"],
  "Delian Asparouhov": ["Delian"],
  "Chamath Palihapitiya": ["Chamath"],
  "Tobi Lütke": ["Tobi Lutke"],
  "Josh Wolfe": ["Josh Wolf"],
  "Molly O'Shea": ["Molly O’Shea", "Molly OShea"],
};

export function voiceAliases(voice: GpVoice): string[] {
  return [voice.name, ...(NAME_ALIASES[voice.name] || [])];
}

export function findVoiceInText(text: string): GpVoice | null {
  const raw = text || "";
  const lower = raw.toLowerCase();
  for (const voice of GP_WATCHLIST) {
    if (lower.includes(`@${voice.handle.toLowerCase()}`)) return voice;
  }
  // Longer names first to avoid partial collisions (e.g. "Jason" before shorter tokens)
  const ranked = [...GP_WATCHLIST].sort(
    (a, b) => Math.max(...voiceAliases(b).map((n) => n.length)) - Math.max(...voiceAliases(a).map((n) => n.length)),
  );
  for (const voice of ranked) {
    for (const alias of voiceAliases(voice)) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "i");
      if (re.test(raw)) return voice;
    }
  }
  return null;
}
