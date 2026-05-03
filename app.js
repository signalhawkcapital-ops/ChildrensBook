// ==========================================
// StorySpark — Story generator (v2 — expanded)
// A narrative engine that produces a 10-page
// illustrated picture book with rich variety.
//
// Features:
//   • 10-beat story arc (cover→dedication→opening→world→inciting→
//     rising→complication→climax→resolution→closing)
//   • 5-8 distinct templates per beat
//   • Theme-specific vocabulary (forest, sea, space, etc.)
//   • Pluggable phrase libraries (sensory, dialogue, transitions)
//   • Character traits derived from user interests
//   • Age-tuned vocabulary (3-5, 5-8, 8-10)
//   • Pronoun inference + safe fallbacks
//   • Sound effects, dialogue, descriptive flourishes
//   • Varied illustrations per page type
// ==========================================

(function () {
  'use strict';

  // ---------- DOM refs ----------
  const form = document.getElementById('bookForm');
  const themeSel = document.getElementById('theme');
  const themeOtherWrap = document.getElementById('themeOtherWrap');
  const outcomeSel = document.getElementById('outcome');
  const outcomeOtherWrap = document.getElementById('outcomeOtherWrap');
  const dedicationCheck = document.getElementById('dedication');
  const dedicationWrap = document.getElementById('dedicationWrap');
  const preview = document.getElementById('preview');
  const submitBtn = form.querySelector('button[type="submit"]');

  // ---------- Conditional fields ----------
  themeSel.addEventListener('change', () => {
    themeOtherWrap.style.display = themeSel.value === 'other' ? 'block' : 'none';
  });
  outcomeSel.addEventListener('change', () => {
    outcomeOtherWrap.style.display = outcomeSel.value === 'other' ? 'block' : 'none';
  });
  dedicationCheck.addEventListener('change', () => {
    dedicationWrap.style.display = dedicationCheck.checked ? 'block' : 'none';
  });

  // ==========================================================
  // CORE HELPERS
  // ==========================================================
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pickN = (arr, n) => {
    const copy = [...arr];
    const out = [];
    for (let i = 0; i < n && copy.length; i++) {
      out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return out;
  };
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const cleanList = (s) => (s || '').split(',').map(x => x.trim()).filter(Boolean);
  const oxford = (arr) => {
    if (!arr.length) return '';
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
    return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
  };

  // ==========================================================
  // PRONOUN INFERENCE
  // Lightweight name → pronoun heuristic. Falls back to "they/them"
  // which works for any name and any kid.
  // ==========================================================
  const NAME_HINTS = {
    she: ['maya', 'sophia', 'emma', 'olivia', 'ava', 'isabella', 'mia', 'amelia', 'charlotte', 'lily',
          'harper', 'aria', 'luna', 'chloe', 'penelope', 'layla', 'zoe', 'nora', 'hazel', 'violet',
          'aurora', 'savannah', 'audrey', 'brooklyn', 'bella', 'claire', 'skylar', 'paisley', 'everly',
          'anna', 'naomi', 'aaliyah', 'elena', 'natalie', 'leah', 'hannah', 'lillian', 'addison', 'eleanor',
          'priya', 'aisha', 'fatima', 'mei', 'yui', 'sakura', 'amara', 'zara', 'ines', 'sofia'],
    he:  ['liam', 'noah', 'oliver', 'elijah', 'james', 'william', 'benjamin', 'lucas', 'henry', 'theodore',
          'jack', 'levi', 'alexander', 'jackson', 'mateo', 'daniel', 'michael', 'mason', 'sebastian', 'ethan',
          'logan', 'owen', 'samuel', 'jacob', 'asher', 'aiden', 'john', 'joseph', 'wyatt', 'david',
          'leo', 'julian', 'hudson', 'grayson', 'ezra', 'thomas', 'charles', 'caleb', 'isaiah', 'ryan',
          'arjun', 'dev', 'hiroshi', 'kenji', 'jamal', 'kwame', 'diego', 'mateus', 'omar', 'rafael']
  };
  function inferPronouns(name) {
    const lc = (name || '').toLowerCase().trim();
    if (NAME_HINTS.she.includes(lc)) return { sub: 'she', obj: 'her', poss: 'her', possPron: 'hers', refl: 'herself' };
    if (NAME_HINTS.he.includes(lc))  return { sub: 'he',  obj: 'him', poss: 'his', possPron: 'his',  refl: 'himself' };
    return { sub: 'they', obj: 'them', poss: 'their', possPron: 'theirs', refl: 'themself' };
  }
  // Verb conjugation helper for they/she/he subject
  function conj(pron, baseVerb) {
    // baseVerb examples: 'is', 'has', 'goes', 'was'
    if (pron.sub === 'they') {
      const map = { is: 'are', was: 'were', has: 'have', goes: 'go', does: 'do', "doesn't": "don't", "wasn't": "weren't", "isn't": "aren't" };
      return map[baseVerb] || baseVerb;
    }
    return baseVerb;
  }

  // ==========================================================
  // CAST PARSER
  // Interprets free-form cast entries into {name, descriptor, kind} so
  // templates can reference characters naturally ("Bailey the show dog
  // wagged her tail" instead of "show dog Bailey wagged...").
  //
  // Examples:
  //   "Bailey"                 → {name:"Bailey", descriptor:null}
  //   "show dog Bailey"        → {name:"Bailey", descriptor:"a show dog"}
  //   "Bailey the show dog"    → {name:"Bailey", descriptor:"the show dog"}
  //   "Bailey, a show dog"     → {name:"Bailey", descriptor:"a show dog"}
  //   "Grandma Rose"           → {name:"Rose", descriptor:"<hero-poss> grandma"}
  //   "Uncle Mike"             → {name:"Mike", descriptor:"<hero-poss> uncle"}
  //   "a sleepy turtle named Pip" → {name:"Pip", descriptor:"a sleepy turtle"}
  //   "his friend Sam"         → {name:"Sam", descriptor:"his friend"}
  // ==========================================================
  const FAMILY_TITLES = {
    grandma: 'grandma', grandpa: 'grandpa', granny: 'granny', grampa: 'grampa',
    nana: 'nana', papa: 'papa', mama: 'mama', mommy: 'mommy', daddy: 'daddy',
    pop: 'pop', pops: 'pops', nan: 'nan', gran: 'gran',
    aunt: 'aunt', auntie: 'auntie', uncle: 'uncle',
    cousin: 'cousin', sister: 'sister', brother: 'brother',
    mom: 'mom', dad: 'dad'
  };
  const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'mx', 'dr', 'sir', 'madam', 'miss', 'master', 'professor', 'prof', 'capt', 'captain']);
  // Animal/creature kinds — used to detect "show dog Bailey" patterns
  const KNOWN_KINDS = new Set([
    'dog', 'puppy', 'cat', 'kitten', 'rabbit', 'bunny', 'hamster', 'guinea pig', 'turtle', 'tortoise',
    'fish', 'goldfish', 'parrot', 'bird', 'lizard', 'gecko', 'snake', 'frog', 'toad',
    'horse', 'pony', 'cow', 'pig', 'sheep', 'goat', 'duck', 'chicken', 'rooster',
    'hedgehog', 'ferret', 'rat', 'mouse', 'mole',
    'bear', 'fox', 'wolf', 'deer', 'owl', 'eagle', 'hawk', 'raven', 'crow',
    'dragon', 'unicorn', 'fairy', 'elf', 'gnome', 'troll', 'mermaid', 'phoenix',
    'robot', 'alien', 'monster', 'ghost', 'wizard', 'witch',
    'teacher', 'friend', 'neighbor', 'classmate', 'coach', 'babysitter', 'nanny',
    'baby'
  ]);
  // Common descriptor adjectives that can precede a kind ("show dog", "rescue cat", "tabby kitten")
  const KIND_ADJECTIVES = new Set([
    'show', 'rescue', 'tabby', 'tiny', 'big', 'little', 'old', 'young', 'baby',
    'sleepy', 'grumpy', 'happy', 'silly', 'brave', 'wise', 'curious', 'shy',
    'fluffy', 'spotted', 'striped', 'gentle', 'wild', 'magical',
    'service', 'guide', 'therapy', 'lap', 'house', 'farm', 'pet',
    'best', 'new', 'twin', 'older', 'younger', 'favorite', 'good', 'kind'
  ]);
  function isLikelyName(token) {
    // A name typically starts capitalized and isn't a common noun/article
    if (!token) return false;
    if (/^(a|an|the|her|his|their|my|our|some|that|this)$/i.test(token)) return false;
    return /^[A-Z]/.test(token);
  }
  function parseCastEntry(raw, heroPron) {
    if (!raw) return null;
    const entry = raw.trim();
    if (!entry) return null;

    const heroPoss = heroPron.poss; // her / his / their

    // --- Pattern: comma form "Bailey, a show dog" ---
    if (entry.includes(',')) {
      const [first, ...rest] = entry.split(',').map(s => s.trim()).filter(Boolean);
      if (rest.length && isLikelyName(first.split(' ').pop())) {
        return { name: first, descriptor: rest.join(', '), kind: 'specified' };
      }
    }

    // --- Pattern: "...named X" ---
    const namedMatch = entry.match(/^(.+?)\s+named\s+(\S+)$/i);
    if (namedMatch) {
      const desc = namedMatch[1].trim();
      const nm = namedMatch[2].trim().replace(/[.,!?]$/, '');
      // "a sleepy turtle named Pip" → desc starts with article? keep as-is.
      return { name: cap(nm), descriptor: desc, kind: 'specified' };
    }

    // --- Pattern: "X the Y" (e.g. "Bailey the show dog") ---
    const theMatch = entry.match(/^(\S+)\s+the\s+(.+)$/i);
    if (theMatch && isLikelyName(theMatch[1])) {
      return { name: theMatch[1], descriptor: 'the ' + theMatch[2].trim(), kind: 'specified' };
    }

    const tokens = entry.split(/\s+/);

    // --- Pattern: family title like "Grandma Rose", "Uncle Mike" ---
    const firstLc = tokens[0].toLowerCase().replace(/[.,!?]$/, '');
    if (tokens.length >= 2 && FAMILY_TITLES[firstLc]) {
      const title = FAMILY_TITLES[firstLc];
      const restName = tokens.slice(1).join(' ');
      // "Grandma Rose" → name "Rose", descriptor "her grandma"
      return {
        name: restName,
        descriptor: `${heroPoss} ${title}`,
        kind: 'family',
        title: title
      };
    }
    // --- Pattern: adjective + family title, e.g. "baby brother Kai", "big sister Lily" ---
    if (tokens.length >= 3) {
      const secondLc = tokens[1].toLowerCase().replace(/[.,!?]$/, '');
      if (KIND_ADJECTIVES.has(firstLc) && FAMILY_TITLES[secondLc]) {
        const title = FAMILY_TITLES[secondLc];
        const restName = tokens.slice(2).join(' ');
        return {
          name: restName,
          descriptor: `${heroPoss} ${tokens[0].toLowerCase()} ${title}`,
          kind: 'family',
          title: title
        };
      }
    }

    // --- Pattern: honorific like "Mr. Henderson", "Dr. Patel" ---
    if (tokens.length >= 2 && HONORIFICS.has(firstLc.replace(/\.$/, ''))) {
      // Keep the whole thing as the name, no separate descriptor
      return { name: entry, descriptor: null, kind: 'honorific' };
    }

    // --- Pattern: possessive prefix "his friend Sam", "her dog Bailey" ---
    if (tokens.length >= 3 && /^(his|her|their|my|our)$/i.test(tokens[0])) {
      const last = tokens[tokens.length - 1];
      if (isLikelyName(last)) {
        const desc = tokens.slice(0, -1).join(' ');
        return { name: last, descriptor: desc, kind: 'specified' };
      }
    }

    // --- Pattern: "{kind} {Name}" e.g. "show dog Bailey", "rescue cat Mochi", "tabby kitten Luna" ---
    // Strategy: scan for known kinds; if found, take the trailing capitalized token as name.
    if (tokens.length >= 2) {
      const last = tokens[tokens.length - 1];
      if (isLikelyName(last)) {
        const beforeName = tokens.slice(0, -1).map(t => t.toLowerCase()).join(' ');
        // Check if it's all adjectives + a known kind (or just a known kind)
        const beforeWords = beforeName.split(/\s+/);
        // Find a known kind in the leading tokens
        let kindIdx = -1;
        for (let i = beforeWords.length - 1; i >= 0; i--) {
          if (KNOWN_KINDS.has(beforeWords[i])) { kindIdx = i; break; }
          // Try two-word kinds like "guinea pig"
          if (i > 0 && KNOWN_KINDS.has(beforeWords[i - 1] + ' ' + beforeWords[i])) {
            kindIdx = i - 1;
            break;
          }
        }
        if (kindIdx !== -1) {
          // Validate: any words before the kind must be known adjectives (or articles we'll strip)
          const adjPart = beforeWords.slice(0, kindIdx);
          const adjsOk = adjPart.every(w => KIND_ADJECTIVES.has(w) || /^(a|an|the)$/.test(w));
          if (adjsOk) {
            // Build descriptor: "a show dog" / "a rescue cat" / "a sleepy turtle"
            const adjs = adjPart.filter(w => !/^(a|an|the)$/.test(w));
            const kindStr = beforeWords.slice(kindIdx).join(' ');
            const fullDesc = (adjs.length ? adjs.join(' ') + ' ' : '') + kindStr;
            const article = /^[aeiou]/.test(fullDesc) ? 'an' : 'a';
            return {
              name: last,
              descriptor: `${article} ${fullDesc}`,
              kind: 'animal'
            };
          }
        }
      }
    }

    // --- Fallback: treat the whole entry as a name (no descriptor) ---
    // If it looks like a multi-word non-name (e.g. "the family cat"), keep as-is with no name field
    if (tokens.length === 1 && isLikelyName(tokens[0])) {
      return { name: tokens[0], descriptor: null, kind: 'plain' };
    }
    if (tokens.every(isLikelyName)) {
      return { name: entry, descriptor: null, kind: 'plain' };
    }
    // It's a description with no name, like "the family cat" — use as-is
    return { name: null, descriptor: entry, kind: 'unnamed' };
  }
  // Render a parsed cast entry as a referring phrase, choosing the most natural form
  // based on whether it's the first mention or a later one. First-mention with a
  // descriptor returns "Name, descriptor" — the caller is expected to follow it
  // with sentence content (the `fmt` cleanup pass will handle any double commas).
  function renderCast(parsed, opts = {}) {
    if (!parsed) return '';
    const { firstMention = true, useDescriptor = true } = opts;
    if (!parsed.name) return parsed.descriptor || '';
    if (!parsed.descriptor) return parsed.name;
    if (firstMention && useDescriptor) {
      // Closing comma is added so apposition reads naturally inline.
      // fmt() collapses any resulting double-commas.
      return `${parsed.name}, ${parsed.descriptor},`;
    }
    return parsed.name; // subsequent mentions: just the name
  }
  // Pronouns for parsed cast: gendered names get inferred; family titles get the family member's pronoun cue;
  // animals default to "they" (covers any species); honorifics default by title.
  function castPronouns(parsed) {
    if (!parsed) return inferPronouns('');
    if (parsed.kind === 'family') {
      const t = (parsed.title || '').toLowerCase();
      if (/^(grandma|granny|nana|gran|nan|aunt|auntie|sister|mom|mommy|mama)$/.test(t)) {
        return { sub: 'she', obj: 'her', poss: 'her', possPron: 'hers', refl: 'herself' };
      }
      if (/^(grandpa|grampa|papa|pop|pops|uncle|brother|dad|daddy)$/.test(t)) {
        return { sub: 'he', obj: 'him', poss: 'his', possPron: 'his', refl: 'himself' };
      }
    }
    if (parsed.kind === 'honorific') {
      const lc = (parsed.name || '').toLowerCase();
      if (/^(mr|sir|master|capt|captain)\.?\s/.test(lc)) {
        return { sub: 'he', obj: 'him', poss: 'his', possPron: 'his', refl: 'himself' };
      }
      if (/^(mrs|ms|miss|madam)\.?\s/.test(lc)) {
        return { sub: 'she', obj: 'her', poss: 'her', possPron: 'hers', refl: 'herself' };
      }
    }
    // Try inferring from the name
    if (parsed.name) return inferPronouns(parsed.name.split(' ').pop());
    return inferPronouns('');
  }


  // ==========================================================
  // CHARACTER TRAITS — derived from interests
  // Each interest suggests a trait the hero embodies.
  // ==========================================================
  const INTEREST_TRAITS = {
    dinosaur: ['fierce-hearted', 'thunder-stepped', 'mighty as a saurus'],
    dragon: ['fire-spirited', 'brave as a knight', 'storm-hearted'],
    space: ['star-eyed', 'cosmic-minded', 'galaxy-curious'],
    star: ['star-eyed', 'wish-keeper'],
    moon: ['moon-soft', 'dreamy-hearted'],
    rocket: ['rocket-spirited', 'whoosh-quick'],
    paint: ['rainbow-fingered', 'color-keeper'],
    art: ['rainbow-fingered', 'color-keeper'],
    draw: ['line-spinner', 'page-painter'],
    music: ['song-hearted', 'rhythm-keeper'],
    sing: ['song-hearted', 'melody-maker'],
    dance: ['twirl-quick', 'feather-footed'],
    book: ['story-keeper', 'word-curious'],
    read: ['story-keeper', 'word-curious'],
    cat: ['quiet-pawed', 'whisker-clever'],
    dog: ['waggy-hearted', 'loyal-souled'],
    horse: ['gallop-hearted', 'mane-in-the-wind'],
    ocean: ['wave-hearted', 'salt-bright'],
    sea: ['wave-hearted', 'salt-bright'],
    fish: ['silver-quick', 'bubble-following'],
    forest: ['leaf-quiet', 'root-deep'],
    tree: ['leaf-quiet', 'tall-rooted'],
    flower: ['petal-soft', 'garden-gentle'],
    cake: ['sweet-toothed', 'frosting-finder'],
    soccer: ['quick-footed', 'goal-bright'],
    football: ['quick-footed', 'goal-bright'],
    swim: ['fish-quick', 'water-brave'],
    bike: ['wheel-rolling', 'wind-in-hair'],
    train: ['track-following', 'whistle-bright'],
    car: ['zoom-loving', 'engine-eared'],
    truck: ['wheel-rumbling', 'big-roader'],
    pirate: ['salt-brave', 'treasure-eyed'],
    princess: ['crown-kind', 'glitter-souled'],
    knight: ['shield-bright', 'oath-keeping'],
    fairy: ['shimmer-winged', 'wish-soft'],
    unicorn: ['rainbow-maned', 'wonder-bright']
  };
  function traitsFromInterests(interests) {
    const traits = new Set();
    for (const i of interests) {
      const lc = i.toLowerCase();
      for (const key in INTEREST_TRAITS) {
        if (lc.includes(key)) {
          INTEREST_TRAITS[key].forEach(t => traits.add(t));
        }
      }
    }
    if (!traits.size) {
      ['curious-eyed', 'kind-hearted', 'bright-spirited', 'wonder-full'].forEach(t => traits.add(t));
    }
    return [...traits];
  }

  // ==========================================================
  // THEME VOCABULARIES
  // Each theme has its own bank of nouns, verbs, sensory words,
  // and atmospheric details. Templates pull from these so a
  // forest story sounds different from a space story.
  // ==========================================================
  const THEME_VOCAB = {
    'Bedtime & the moon': {
      mood: 'night',
      palette: { sky: '#1a2f5c', ground: '#2a4174', accent: '#ffd166' },
      places: ['moonlit room', 'windowsill', 'garden under stars', 'soft, quiet hallway'],
      creatures: ['the night owl', 'a sleepy moth', 'a gentle moon-bunny', 'a whispering star'],
      sounds: ['the hum of the heater', 'a soft tick of the clock', 'crickets singing low', 'a far-off train'],
      sensory: ['cool as moonlight', 'soft as a yawn', 'quiet as a feather falling', 'warm as cocoa'],
      objects: ['a silver thread of moon', 'a constellation map', 'a music box', 'a worn-soft blanket'],
      verbs: ['drifted', 'tiptoed', 'wandered', 'padded', 'slipped', 'crept'],
      onomatopoeia: ['hush', 'shhhh', 'tick-tock', 'creak', 'blink-blink'],
      refrain: 'And the night went on, soft and sure.',
      vibes: ['hushed', 'silver-quiet', 'sleepy', 'velvet-dark']
    },
    'Magical forest adventure': {
      mood: 'forest',
      palette: { sky: '#a8d8b9', ground: '#5a8c5e', accent: '#e85d75' },
      places: ['clearing of fern and moss', 'old oak grove', 'path lined with toadstools', 'whispering willow bend'],
      creatures: ['a velvet-eared rabbit', 'a clever little fox', 'a wise old owl', 'a bumblebee with spectacles'],
      sounds: ['the rustle of leaves', 'a brook chattering over stones', 'birdsong in three keys', 'the creak of an old branch'],
      sensory: ['piney and bright', 'green as a wish', 'sun-dappled', 'fragrant with rain'],
      objects: ['an acorn cap', 'a curl of birch bark', 'a feather no bigger than a thumb', 'a smooth, lucky stone'],
      verbs: ['tiptoed', 'wandered', 'climbed', 'scampered', 'wove', 'crept'],
      onomatopoeia: ['rustle', 'snap', 'whoosh', 'patter-patter', 'cheep'],
      refrain: 'Deeper into the green, the green, the green they went.',
      vibes: ['secret-keeping', 'green-hearted', 'golden-hour', 'leaf-dappled']
    },
    'Underwater journey': {
      mood: 'sea',
      palette: { sky: '#7ec4cf', ground: '#3a6c8c', accent: '#ffd166' },
      places: ['kelp cathedral', 'coral garden bright as candy', 'sunken ship soft with moss', 'tide pool full of stars'],
      creatures: ['a shy little octopus', 'a pufferfish named Dot', 'a school of silver fish', 'a sea turtle, very old and very kind'],
      sounds: ['the slosh of distant waves', 'bubbles rising like laughter', 'a whale\'s far-off song', 'the click of a curious crab'],
      sensory: ['cool and salt-bright', 'shimmering blue', 'slow and floaty', 'sun-rippled'],
      objects: ['a perfect spiraled shell', 'a pearl as big as a wish', 'a sea-glass treasure', 'a forgotten anchor'],
      verbs: ['glided', 'drifted', 'somersaulted', 'wove', 'darted', 'swam'],
      onomatopoeia: ['blub', 'splash', 'whoosh', 'glug-glug', 'swish'],
      refrain: 'Down they went, and down, and down again.',
      vibes: ['weightless', 'salt-sung', 'turquoise-bright', 'pearl-soft']
    },
    'Outer space exploration': {
      mood: 'space',
      palette: { sky: '#1a1a3e', ground: '#3d2c5c', accent: '#ffd166' },
      places: ['quiet little moon', 'ring of dust around Saturn', 'planet made of soft pink clouds', 'great wide dark between stars'],
      creatures: ['a friendly green alien named Blip', 'a star with a face', 'a cosmic kitten', 'a robot polite as pie'],
      sounds: ['the gentle hum of the rocket', 'a beep, beep, beep', 'silence so big it sang', 'the whoosh of comet tails'],
      sensory: ['cold and crystal-bright', 'weightless', 'sparkling silver', 'glowing soft'],
      objects: ['a tiny pocket of stars', 'a moon rock as smooth as glass', 'a flag for a brand-new world', 'a postcard from a comet'],
      verbs: ['floated', 'zoomed', 'orbited', 'drifted', 'whirled', 'soared'],
      onomatopoeia: ['whoosh', 'beep-boop', 'zoom', 'fizz', 'twinkle-twinkle'],
      refrain: 'On and on through the velvet dark they went.',
      vibes: ['vast', 'twinkling', 'velvet-black', 'cosmic-bright']
    },
    'First day of school': {
      mood: 'day',
      palette: { sky: '#ffe9d0', ground: '#ff8a5b', accent: '#7ec4cf' },
      places: ['big blue front gate', 'classroom with rows of cubbies', 'playground sandbox', 'quiet reading corner'],
      creatures: ['a kind teacher with crinkly eyes', 'a kid with a missing front tooth', 'a goldfish named Mr. Fin', 'a sleepy class hamster'],
      sounds: ['the ring of the bell', 'a hundred sneakers squeaking', 'a song everyone learned by lunch', 'pencils scribbling'],
      sensory: ['bright and a little buzzy', 'crayon-fresh', 'lemon-soap clean', 'paper-and-glue scented'],
      objects: ['a brand-new backpack', 'a juice box, perfectly cold', 'a name tag with a smudge', 'a sticker shaped like a star'],
      verbs: ['hurried', 'wandered', 'tiptoed', 'dashed', 'wove', 'skipped'],
      onomatopoeia: ['ring-ring', 'thump', 'squeak', 'shuffle', 'hush'],
      refrain: 'A brand-new day, a brand-new day, a brand-new everything.',
      vibes: ['fluttery', 'sun-bright', 'first-time', 'glue-stick-fresh']
    },
    'Making a new friend': {
      mood: 'day',
      palette: { sky: '#fff5d6', ground: '#ffd166', accent: '#e85d75' },
      places: ['bench by the apple tree', 'corner of the playground', 'quiet table at the library', 'new kid\'s empty seat'],
      creatures: ['a kid drawing dragons', 'a kid eating raspberries one at a time', 'a kid with the same lunchbox', 'a kid who\'d just moved in next door'],
      sounds: ['a hesitant hello', 'a giggle that grew into a laugh', 'two voices learning each other', 'the click of a snack box opening'],
      sensory: ['warm and sunny', 'a little brave, a little shy', 'open as a window', 'easy as breathing'],
      objects: ['half a granola bar to share', 'a paper crane offered carefully', 'a found four-leaf clover', 'a friendship bracelet, just made'],
      verbs: ['walked', 'wandered', 'strolled', 'skipped', 'drifted', 'circled'],
      onomatopoeia: ['tap-tap', 'giggle', 'whisper', 'shhh', 'hum'],
      refrain: 'Hello. Hello. Hello, again.',
      vibes: ['warm', 'open-hearted', 'lemonade-bright', 'beginning']
    },
    'Big sibling / new baby': {
      mood: 'day',
      palette: { sky: '#ffe6ee', ground: '#ffb3c8', accent: '#7ec4cf' },
      places: ['nursery, all painted yellow', 'rocking chair by the window', 'hush of a sleeping house', 'cozy reading nook'],
      creatures: ['a tiny new baby', 'a worn old teddy', 'the family cat, very curious', 'a wise older cousin'],
      sounds: ['a tiny baby breath', 'a lullaby half-remembered', 'soft cooing', 'the squeak of the rocker'],
      sensory: ['soft as a sleepwalk', 'milk-warm', 'cotton-clean', 'tender'],
      objects: ['a tiny knitted hat', 'a worn-soft blanket', 'a rattle that whispered', 'a photograph in a frame'],
      verbs: ['tiptoed', 'crept', 'padded', 'wandered', 'slipped', 'rocked'],
      onomatopoeia: ['coo', 'shhh', 'pat-pat', 'hum', 'whisper'],
      refrain: 'Soft and small. Small and soft.',
      vibes: ['tender', 'milk-soft', 'gently new', 'all-at-once']
    },
    'Overcoming a fear': {
      mood: 'twilight',
      palette: { sky: '#d8c5e8', ground: '#7c5fa0', accent: '#ffd166' },
      places: ['hallway with the long shadow', 'deep end of the pool', 'top of the slide', 'dark of bedtime'],
      creatures: ['a worry no bigger than a pebble', 'a brave little echo', 'a kind shadow', 'a tiny invisible cheerleader'],
      sounds: ['a heart going pitter-pat', 'the deep breath in', 'a quiet "I can"', 'the click of a flashlight on'],
      sensory: ['heart-thumpy', 'small-feeling', 'big-feeling', 'one-step-at-a-time'],
      objects: ['a flashlight, just-in-case', 'a pocket-sized brave thought', 'a hand to hold', 'a counted-to-three'],
      verbs: ['tiptoed', 'crept', 'edged', 'inched', 'stepped', 'wandered'],
      onomatopoeia: ['thump-thump', 'creak', 'whisper', 'breathe-in-breathe-out', 'click'],
      refrain: 'One small step. And then one more.',
      vibes: ['hush-quiet', 'heart-bright', 'small-but-strong', 'one-breath-at-a-time']
    },
    'Birthday quest': {
      mood: 'day',
      palette: { sky: '#ffe6ee', ground: '#e85d75', accent: '#ffd166' },
      places: ['kitchen full of frosting smell', 'backyard hung with streamers', 'secret note\'s first clue', 'spot marked X'],
      creatures: ['a parent pretending nothing was up', 'a sibling who knew but wouldn\'t tell', 'a balloon, a little helium-drunk', 'a dog wearing a party hat'],
      sounds: ['a Happy Birthday hummed in secret', 'paper crinkling', 'a candle whoosh', 'a chorus of cheers'],
      sensory: ['frosting-sweet', 'crinkle-paper bright', 'sparkly', 'cake-warm'],
      objects: ['a clue tucked in a teacup', 'a map drawn on a napkin', 'a present wrapped a little crookedly', 'a candle to wish on'],
      verbs: ['hunted', 'dashed', 'tiptoed', 'wandered', 'skipped', 'raced'],
      onomatopoeia: ['whoosh', 'rip', 'pop', 'cheer', 'crinkle'],
      refrain: 'One clue closer, one clue closer.',
      vibes: ['sparkly', 'sugar-bright', 'all-day-special', 'cake-warm']
    },
    'Holiday / seasonal': {
      mood: 'snow',
      palette: { sky: '#d6e9ff', ground: '#7ec4cf', accent: '#e85d75' },
      places: ['snowy front yard', 'hearth with stockings hung', 'kitchen full of cinnamon', 'porch lit golden'],
      creatures: ['a snowman with a carrot nose', 'a robin in the holly', 'a chubby gray squirrel', 'a sleepy gray cat by the fire'],
      sounds: ['carolers in the distance', 'snow crunching underfoot', 'the crackle of a fire', 'the jingle of small bells'],
      sensory: ['mitten-warm', 'cinnamon-spiced', 'snowflake-fresh', 'firelight-soft'],
      objects: ['a hand-knit scarf', 'a steaming mug of cocoa', 'a string of fairy lights', 'a paper snowflake just-made'],
      verbs: ['wandered', 'tiptoed', 'gathered', 'trudged', 'skipped', 'crunched'],
      onomatopoeia: ['jingle', 'crunch', 'crackle', 'whoosh', 'snap'],
      refrain: 'Cocoa-warm, mitten-warm, heart-warm.',
      vibes: ['twinkly', 'cocoa-warm', 'cinnamon-spiced', 'softly snowing']
    },
    'default': {
      mood: 'day',
      palette: { sky: '#ffe9d0', ground: '#ff8a5b', accent: '#e85d75' },
      places: ['sunlit garden', 'path home', 'quiet kitchen', 'top of a small hill'],
      creatures: ['a kind little friend', 'a wise old neighbor', 'a curious cat', 'a wandering bee'],
      sounds: ['a song hummed quietly', 'wind through tall grass', 'a door clicking shut', 'a kettle just-whistled'],
      sensory: ['warm', 'gentle', 'open', 'sunlit'],
      objects: ['a found treasure', 'a small surprise', 'a written note', 'a perfect pebble'],
      verbs: ['ran', 'wandered', 'skipped', 'tiptoed', 'dashed', 'wove'],
      onomatopoeia: ['hush', 'whoosh', 'tap-tap', 'pitter-patter', 'click'],
      refrain: 'On the day went, bright and full.',
      vibes: ['bright', 'open-hearted', 'storybook', 'wonder-full']
    }
  };

  // ==========================================================
  // OUTCOME LESSONS — short and varied morals
  // ==========================================================
  const OUTCOME_VOCAB = {
    'Learns to be brave': {
      lesson: ['Brave wasn\'t a thing you were — it was a thing you did, one small step at a time.',
               'Brave didn\'t mean not-scared. Brave meant scared, but going anyway.',
               'Brave was a quiet little voice that said: try.'],
      verbsOfDoing: ['tried', 'reached', 'took one breath, then another', 'said "I can"', 'put one foot in front of the other'],
      keyword: 'being brave'
    },
    'Discovers the value of kindness': {
      lesson: ['Kindness, even the smallest kind, makes the whole world a little softer.',
               'Kindness was a gift you could give a thousand times and never run out.',
               'A little kindness goes a very long way.'],
      verbsOfDoing: ['shared', 'helped', 'listened', 'held a hand', 'said something gentle'],
      keyword: 'kindness'
    },
    'Makes a lasting friendship': {
      lesson: ['Friendship doesn\'t need a map. It just needs a hello.',
               'Some friends are old, and some are brand-new — and both kinds make life sweeter.',
               'A real friend is someone who sees you, and stays.'],
      verbsOfDoing: ['waved', 'shared a snack', 'remembered a name', 'laughed together', 'walked side by side'],
      keyword: 'friendship'
    },
    'Finds confidence in being themselves': {
      lesson: ['Being yourself, it turned out, was the very best thing to be.',
               'The world is full of wonderful things — and you are one of them.',
               'There is no one quite like you. That\'s your magic.'],
      verbsOfDoing: ['stood tall', 'spoke up', 'tried it their way', 'wore what felt right', 'said yes to themselves'],
      keyword: 'being themselves'
    },
    'Solves a clever puzzle': {
      lesson: ['Sometimes the trickiest problems just need a curious mind and a quiet moment.',
               'Cleverness is just patience plus paying attention.',
               'Every puzzle has a key. You just have to look closely.'],
      verbsOfDoing: ['thought it through', 'noticed the small thing', 'tried again', 'asked a good question', 'pieced it together'],
      keyword: 'puzzles and patience'
    },
    'Falls peacefully asleep': {
      lesson: ['Eyes grew heavy, the world grew quiet, and dreams came rolling in like soft waves.',
               'Sleep tiptoed in on cat-feet, and the world drifted gently away.',
               'And the day was tucked away, neat as a folded blanket.'],
      verbsOfDoing: ['yawned', 'snuggled in', 'closed their eyes', 'breathed slow and deep', 'drifted'],
      keyword: 'sweet dreams'
    },
    'Realizes home is the best place': {
      lesson: ['Of all the wonderful places they had seen, home was still the very best.',
               'Home was where the lights stayed on for you, just in case.',
               'There\'s a feeling you only get at home: like you fit, exactly.'],
      verbsOfDoing: ['stepped through the door', 'kicked off their shoes', 'breathed in the home-smell', 'curled up in their spot', 'said "I\'m back"'],
      keyword: 'home'
    },
    'Celebrates with everyone they love': {
      lesson: ['Laughter, light, and love — every heart was full to the brim.',
               'The best parties aren\'t the biggest. They\'re the ones full of the right people.',
               'Joy, when it\'s shared, gets bigger and bigger and bigger.'],
      verbsOfDoing: ['cheered', 'danced', 'hugged', 'sang loud', 'lit candles together'],
      keyword: 'celebration'
    },
    'default': {
      lesson: ['And the day folded up like a perfect paper crane — small enough to keep, beautiful enough to remember.',
               'It was the kind of day you carry in your pocket forever.',
               'Some days are stories. This was one of them.'],
      verbsOfDoing: ['discovered', 'understood', 'felt it', 'knew, deep down', 'breathed it in'],
      keyword: 'wonder'
    }
  };

  // ==========================================================
  // TITLE GENERATION — varied, theme-aware
  // ==========================================================
  function generateTitle(hero, themeKey, outcomeKey, customTheme, vocab) {
    if (customTheme) {
      const patterns = [
        `${hero} and the ${cap(customTheme)}`,
        `The Day ${hero} Found ${cap(customTheme)}`,
        `${hero}'s ${cap(customTheme)} Adventure`,
        `When ${hero} Met ${cap(customTheme)}`
      ];
      return pick(patterns);
    }

    const themeWord = {
      'Bedtime & the moon': ['Sleepy Moon', 'Quiet Night', 'Whispering Stars', 'Velvet Dark'],
      'Magical forest adventure': ['Whispering Forest', 'Golden Grove', 'Hidden Path', 'Mossy Wood'],
      'Underwater journey': ['Deep Blue', 'Pearl Below', 'Coral Garden', 'Singing Sea'],
      'Outer space exploration': ['Far-Off Stars', 'Velvet Sky', 'Cosmic Wonder', 'Starlit Sea'],
      'First day of school': ['Big Blue Door', 'Brand-New Day', 'First Bell', 'Brave Beginning'],
      'Making a new friend': ['Quiet Hello', 'New Friend', 'Bench Beneath the Tree', 'Best Hello'],
      'Big sibling / new baby': ['Tiny New Wonder', 'Soft New Beginning', 'Smallest Hand', 'New Little One'],
      'Overcoming a fear': ['Big Brave', 'Quiet Worry', 'Long Hallway', 'Small Brave'],
      'Birthday quest': ['Birthday Quest', 'Sweetest Surprise', 'Candle\'s Wish', 'Frosting Trail'],
      'Holiday / seasonal': ['First Snowflake', 'Cocoa-Warm Day', 'Twinkle-Bright Night', 'Mitten-Warm Wonder'],
      'default': ['Bright Adventure', 'Wonderful Day', 'Quiet Magic', 'Storybook Day']
    }[themeKey] || ['Big Adventure'];

    const word = pick(themeWord);
    const patterns = [
      `${hero} and the ${word}`,
      `The Tale of ${hero} and the ${word}`,
      `${hero} Goes to the ${word}`,
      `When ${hero} Met the ${word}`,
      `${hero}'s ${word} Day`,
      `A ${word} for ${hero}`,
      `The Very ${pick(['Brave', 'Curious', 'Magical', 'Wonderful', 'Special', 'Quiet'])} ${hero}`
    ];
    return pick(patterns);
  }

  // ==========================================================
  // PAGE TEMPLATES — the heart of the engine
  // Each beat has many variants. Templates use {tokens} that
  // get filled in from the story context.
  // ==========================================================
  const PAGE_TEMPLATES = {
    // -------- Beat 1: OPENING — establish hero, world, and a small itch of anticipation --------
    // Page-turn hook: a hint that today is different.
    opening: [
      "Once, in {a_place}, there lived a child named {hero}. {Sub_cap} {wasVerb} {trait}, with {hairThing} and a habit of asking the kind of questions grown-ups have to think hard about. \"Why does the {sound} sound so {sensory} today?\" {sub} asked nobody in particular. Nobody in particular did not answer. But somewhere — somewhere {sub} couldn't quite name — something answered anyway. This is the story of one particular day. The day everything got a little bit interesting.",

      "Our story begins on what looked like a perfectly ordinary {timeOfDay}. The {sound} was doing its usual thing. The light was {sensory}, the way it always was. {Hero_cap}, who was {trait} on the inside and {trait} on the outside, was about to discover that ordinary days are sometimes the very best ones for adventures. {Sub_cap} was about to discover, in fact, that today was not going to be ordinary at all. {Sub_cap} just didn't know it yet.",

      "If you had walked past {place} that morning, you might have spotted {hero} — {trait}, with {hairThing}, sitting very still and listening to {sound}. {Sub_cap} had a feeling about today. {Sub_cap} couldn't say why. {Sub_cap} just knew. The kind of knowing that lives behind your ribs, that hums quietly, that whispers: pay attention. {Onom_cap}. Even the air felt {sensory}, like it was waiting for something. And so was {hero}.",

      "{Hero_cap} was the sort of child who noticed things other people missed. The way the light could be {sensory} one moment and {sensory} the next. The way {sound} sounded almost like words, if you really listened. The way the world had little secret pockets, if you knew where to look. Today, {sub} had a feeling {sub} was going to notice something very important indeed. {Sub_cap} stood at the edge of {place} and breathed in deep.",

      "There are some children who walk through the world. And there are some children, like {hero}, who skip — {trait}, eyes wide, ready for the small everyday wonders that other people rush right past. This morning, the wonder was already waiting. It was tucked into {place}, quiet as a folded note, patient as a held breath. All it needed was for {hero} to come and find it. And {hero}, of course, was already on {poss} way."
    ],

    // -------- Beat 2: WORLD-BUILDING — make the setting alive and specific --------
    // Page-turn hook: something is moving / something is calling.
    world: [
      "{Place_cap} stretched out like a story waiting to be read. Everything smelled {sensory}. Somewhere far off, {hero} could hear {sound}. Somewhere closer, {sound}. {Sub_cap} took it all in — slow, careful, the way you do when you don't want to miss anything. {Onom_cap}. The world here was the kind that watches you back. The kind that has things to show, if you'll only stand still and let it. {Hero_cap} stood very, very still.",

      "It was the kind of {timeOfDay} that felt {vibe} — like the air itself was holding its breath. {Hero_cap} stepped forward, then stopped. There were {object_pl}, glinting where the light caught them. There were {object2_pl} half-tucked into corners, as if they'd been waiting. The light was {sensory}. The sounds were {sensory}. Even {poss} fingertips were tingling. And then — there it was — that small, small sound again. {OnomDouble}.",

      "Everywhere {sub} looked, something twinkled. {Sound_cap}, then {sound}, then a kind of waiting hush. This was the sort of place where stories grow on the bushes like berries, {hero} thought, and you only had to be quiet enough to hear them ripen. {Sub_cap} crouched down. {Sub_cap} listened. The hush deepened. And then, very faintly, very clearly — the hush broke.",

      "The light was {sensory}. The wind whispered something that sounded almost like {poss} name. {Hero_cap}'s heart did a tiny, happy somersault — the kind it always does when something marvelous is just about to happen, and you can feel it in your bones before you can see it with your eyes. {Refrain} {Sub_cap} took one careful step forward. Then another. The world, very politely, made room.",

      "All around {hero}, {place} hummed with possibility. {Creature_cap} peeked out from the shadows, blinked twice, and ducked back. A leaf drifted by, though there wasn't really any wind. The whole world, it seemed, was paying attention. {Onom_cap}. Something was about to happen. {Hero_cap} could feel it — that good, fizzy, edge-of-something feeling. And then, all at once, something did."
    ],

    // -------- Beat 3: INCITING INCIDENT — the hook is set --------
    // Page-turn hook: the call to adventure has been made.
    inciting: [
      "And then, {hero} saw it: {object}, just sitting there as if it had been waiting the whole time. {Sub_cap} crouched down. {Sub_cap} reached out one careful finger. The thing felt {sensory} — and somehow, somehow, {sub} knew this was the start of something. {Onom_cap}. Something rustled in the bushes nearby. Something else gave a soft, clear {onom}. {Hero_cap} looked up. The world, quite suddenly, was looking back.",

      "Something rustled. Something {verbed_past}. {Hero_cap} turned, slow and careful, and there — right there, not three steps away — was {creature}, looking right at {obj}. They stared at each other. Neither one moved. The whole forest seemed to be holding its breath. And then the creature did something quite unexpected: it gave {obj} a tiny, knowing nod, and beckoned with one paw. \"Come,\" it seemed to say. \"You'll want to see this.\"",

      "{Creature_cap} appeared from absolutely nowhere and said, very politely, \"Excuse me. Are you {hero}?\" {Hero_cap}'s eyebrows shot up. {Sub_cap} had not expected to be addressed by name today, especially not by a creature {sub} had never met before. \"I... yes,\" {sub} managed. \"That's me.\" The creature smiled — or something very like a smile. \"Then this,\" it said, holding out {object}, \"is for you.\" And just like that, the day became something new.",

      "A small, curious sound made {hero} pause mid-step. {Sound_cap}, again. {Sub_cap} took one step closer, and then another, and then one more — until {sub} was standing right at the edge of something {sub} hadn't noticed before. Something that absolutely, definitely, hadn't been there a moment ago. {Onom_cap}. {Hero_cap}'s heart did a little flip. {Sub_cap} reached out, slow and careful, and the world, very gently, said yes.",

      "It started with {object}. Just one ordinary, magical {bare_object} — and a question {hero} couldn't quite ignore. Where had it come from? Who had left it here? And why, oh why, did it feel so much like it was meant for {obj}? {Sub_cap} picked it up. It was warm. It was {sensory}. It was, somehow, the beginning. Behind {obj}, very softly, something said {onom}. And {hero} smiled, because {sub} understood: the day had begun in earnest now."
    ],

    // -------- Beat 4: RISING ACTION — meeting friends, building momentum --------
    // Page-turn hook: a destination, a discovery, or a friend's lead.
    rising: [
      "{Hero_cap} wasn't alone for long. {Cast_cap} appeared, with a grin and a wave and exactly the right idea. \"There you are!\" {castSub_cap} said, as if they'd been looking everywhere. {Hero_cap} felt {poss} shoulders drop. Whatever was going to happen, {sub} wouldn't have to do it alone. Together they set off into {place}, swapping observations as they went. {Refrain} The path ahead curved, then climbed, then curved again — and at every turn, there was something new to point at, something new to wonder about.",

      "Together, {hero} and {firstCast} {verbed_past} deeper into {place}. They walked side by side, swapping observations in the easy way of people who like each other. \"Did you see that?\" {Hero_cap} would say. \"I saw,\" {firstCastShort} would answer. The day was getting brighter by the minute. {Onom_cap} went the leaves underfoot. {Onom_cap} went a small bird above. The whole world, it felt, was singing along. And then — up ahead — they spotted something that made them both stop short.",

      "\"Come on!\" called {firstCast}. \"You won't believe what's just up ahead!\" {Hero_cap} hurried to catch up — heart thumping a little, in the good way — and what {firstCastShort} pointed at was so unexpected, so perfect, that {hero} actually laughed out loud. \"How did you find this?\" {sub} asked. \"I didn't,\" {firstCastShort} said. \"It found us.\" And that, {hero} thought, was just about the most wonderful thing anyone had ever said to {obj}.",

      "Soon, {hero} wasn't walking alone — there was {castList}, and the day felt twice as bright for it. They told stories. They pointed things out to each other. They took turns leading the way. {Hero_cap} couldn't remember the last time {sub} had felt this {vibe}. {Refrain} A little farther on, the path opened into something so unexpected — so very, very unexpected — that everyone stopped at once. \"Oh,\" {hero} breathed. \"Oh, my.\"",

      "{Hero_cap}'s heart, full of {favoriteInterest}, gave {obj} a little nudge forward. {Sub_cap} {verbed_past} ahead, {trait} as ever. {firstCast_cap} kept pace beside {obj}, asking the right questions and laughing at the right moments. This, thought {hero}, is what good days are made of. Side by side, they crossed a stretch of {place}. The {sound} kept them company. The light shifted softly. And then, very suddenly, they were not alone anymore."
    ],

    // -------- Beat 5: COMPLICATION — the snag that makes the story matter --------
    // Page-turn hook: how will they get past this?
    complication: [
      "But then — uh oh. The path forked, and neither way looked easy. {Hero_cap}'s heart did a tiny pitter-pat. {firstCast_cap} stopped beside {obj}, frowning. \"Hmm,\" {firstCastShort} said. \"Hmm,\" {hero} agreed. They stood there for a long moment, looking at one path, then the other, then the one again. Neither one was a good one. Both ones, actually, looked a bit unfriendly. {Hero_cap} took a slow breath. There would have to be a third way — only, {sub} couldn't see it yet.",

      "Just when everything seemed to be going so well, {hero} spotted something that made {obj} stop short. \"Oh no,\" {sub} whispered. {firstCast_cap} caught up, looked, and let out a long, slow breath. They were going to have to figure this out. There was no other way around. {Onom_cap} went {hero}'s heart. {Onom_cap} went the wind. The thing in front of them — the great big tricky thing — was not going to move on its own.",

      "And that's when the trouble began. Not big trouble, mind you — not the sort with monsters or thunderstorms. Just the sort that quietly asks a question of you, and waits, very patiently, for an answer. {Hero_cap} sat down. {firstCast_cap} sat down beside {obj}. \"Right,\" {hero} said. \"Let's think.\" The trouble waited. The trouble was good at waiting. The trouble had, in fact, all the time in the world.",

      "Something was wrong. Or maybe not wrong, exactly — just tricky. The kind of tricky that makes a person stop, and tilt their head, and think very hard. {Hero_cap} did all three of these things. {Sub_cap} could feel an idea forming, somewhere in the back of {poss} mind, but it wasn't quite ready yet. \"Don't worry,\" {firstCast_cap} said softly. \"You'll get it.\" {Hero_cap} hoped that was true. {Sub_cap} hoped it very, very much.",

      "A great big {challenge} stood between {hero} and what {sub} wanted most. For a long moment, {sub} just stared at it. {Sub_cap} had not expected this. {Sub_cap} was not at all sure what to do. But somewhere underneath the not-sure feeling, there was a small spark of: well, {sub} had to do something. {Sub_cap} thought about turning back. {Sub_cap} thought about giving up. And then {sub} thought: not yet. Not until I've at least tried."
    ],

    // -------- Beat 6: TURNING POINT — the idea, the breath, the small bravery --------
    // Page-turn hook: the attempt is about to begin.
    turning: [
      "{Hero_cap} took a deep breath, the way {favoriteInterest} had taught {obj}. In, and out. In, and out. {OnomDouble}. The world got just the tiniest bit quieter. The puzzle got just the tiniest bit smaller. And there — there it was — the edge of an idea, peeking out like {creature}. {Sub_cap} reached for it, careful as catching a butterfly. The idea sat down in {poss} hand. \"All right,\" {hero} whispered to it. \"Let's try.\"",

      "\"I think,\" said {hero} slowly, \"I think I have an idea.\" {firstCast_cap} leaned in closer. \"Tell me,\" {firstCastShort} whispered. So {hero} did. And as {sub} talked, the idea got bigger and brighter and better, the way ideas do when you say them out loud. {firstCastShort_cap} listened, and nodded, and listened some more. \"Yes,\" {firstCastShort} said at the end. \"Yes, that's it. Let's go.\" {Refrain} And they went.",

      "Sometimes the bravest thing is just trying. So {hero} {tried_past}. It didn't quite work. So {sub} took a breath and tried something a little different. {Onom_cap}. {Hero_cap}'s shoulders sagged a little. {firstCast_cap} reached out and patted {poss} arm. \"One more,\" {firstCastShort} said. \"Just one more.\" And so {hero} took a breath, and tried once more — and on the third try, something shifted, just a little. {Hero_cap} felt it.",

      "{Hero_cap} thought about everything {sub} loved — {interestList} — and a little spark of an idea began to glow. What if, {sub} thought, what if {sub} used {favoriteInterest} to help? It was a strange idea. It was probably a silly idea. But {sub} couldn't get it out of {poss} head. {Sub_cap} looked at {firstCast_cap}. \"This will sound funny,\" {sub} said. \"Funny is fine,\" {firstCastShort} said back. So {hero} explained — and the funny idea, it turned out, was not so funny after all.",

      "It would have been easy to turn back. {Hero_cap} thought about turning back. {Sub_cap} pictured the soft chair at home, and the warm cup, and the not-having-to-do-this-anymore. And then {sub} thought: no. Not today. Today {sub} was going to keep going. {Sub_cap} squared {poss} shoulders. {Sub_cap} took a long, slow breath. {firstCast_cap} squeezed {poss} hand. And then — together, exactly together — they began."
    ],

    // -------- Beat 7: CLIMAX — the big bright moment --------
    // Page-turn hook: the world has changed; what now?
    climax: [
      "And then — oh! Then it happened. Right there in the middle of {place}, {hero} {outcome_action_past}, just like that. {firstCast_cap} let out a whoop of delight. The whole world, it seemed, was cheering. {Onom_cap}, went {hero}'s heart. {Onom_cap}, went the trees. {Onom_cap}, went absolutely everything. The {challenge} that had stood so tall a moment ago — well. It just wasn't a problem anymore. {Hero_cap} stared at what {sub} had just done. \"I... did that,\" {sub} whispered. \"I really did.\"",

      "{Hero_cap} did the thing. The actual thing. {Sub_cap} {outcome_action_past}, and everything around them seemed to grow a little brighter, a little louder, a little more alive. {firstCast_cap} stared. {Hero_cap} stared right back. Then they both burst out laughing — the kind of laugh that starts in your belly and bubbles all the way up to your eyes. {Refrain} The day, it felt, had been holding its breath for this exact moment. And now, with one long happy sigh, the day let go.",

      "Right at that perfect, sparkling moment, everything came together. {Hero_cap} knew exactly what to do, and {sub} did it — bold and {trait}, the way {sub} had always secretly hoped {sub} could be. The {challenge}? It just... wasn't a problem anymore. \"You did it!\" cried {firstCast_cap}, jumping up and down. \"I — I think I did,\" {hero} said, blinking, a little surprised at {possRefl}. And then {sub} smiled. A slow, sure smile. The kind of smile that means: yes. That happened. That really, really happened.",

      "Deep in the heart of {place}, {hero} found what {sub} had been searching for all along. It looked a lot like {object}. It felt a lot like {feeling}. And {sub} understood, finally, that it had been right there waiting the whole time. {Sub_cap} had only needed to come and find it. {Onom_cap} went {hero}'s heart. {Sub_cap} held the moment in both hands, as carefully as you'd hold a wish, and breathed it in. It tasted like sunlight. It tasted like home.",

      "And just like that, {hero} {outcome_action_past}. A small thing, really. And the very biggest thing. {Hero_cap}'s hands were shaking a little. {firstCast_cap} was beaming. The day, somehow, had become exactly what it was supposed to be. \"You did it,\" {firstCast_cap} said, very quietly, as if {castSub} could hardly believe it. \"I did it,\" {hero} echoed back, just as quietly. And then, louder, with a laugh: \"I DID IT!\""
    ],

    // -------- Beat 8: RESOLUTION — the lesson lands, gently --------
    // Page-turn hook: the day is winding toward home.
    resolution: [
      "{Hero_cap} smiled — a slow, sure smile that started in {poss} eyes and worked its way down. {Lesson} It was the sort of thought {sub} would carry around for a long, long time. {Sub_cap} sat down beside {firstCast_cap}, and for a while neither of them said anything. They didn't need to. The {sound} kept them company. So did {sound}. So did the soft, gold light of late afternoon. {Refrain}",

      "Sitting there, with {firstCast_cap} beside {obj} and {place} glowing soft and golden, {hero} knew something true: {lesson_lower} It wasn't a fancy thought. It was just a real one. \"You know what?\" {sub} said, after a long quiet moment. \"What?\" {firstCastShort} answered. \"I'm glad you were here,\" {hero} said. {firstCastShort_cap} smiled. \"I'm glad I was, too.\" And the day, listening in, smiled too.",

      "It was a small lesson, but a big one — the sort grown-ups call a moral, but really it was simpler than that. {Lesson} {Hero_cap} tried saying it out loud, just to hear it. It sounded right. It sounded like the kind of thing you'd tell yourself, late at night, when something was hard and you needed to remember. {Sub_cap} tucked it carefully into {poss} chest, somewhere safe, somewhere {sub} could find it again.",

      "{Hero_cap} tucked the moment away, deep down where the most important things live, right next to {poss} love of {favoriteInterest} and the smell of home. {Lesson} {Sub_cap} would remember this. Not just the doing — but the way it had felt. The way the world had stretched a little wider, a little kinder, a little more full of possible things. {firstCast_cap} squeezed {poss} hand, gently. Neither of them needed to speak.",

      "And the funny thing was, {hero} hadn't really changed. {Sub_cap} had just remembered something {sub} had known all along, somewhere underneath everything else: {lesson_lower} {firstCast_cap} smiled, as if {castSub} had known it too. \"You knew,\" {hero} said quietly. \"I knew,\" {firstCastShort} answered. \"And now you know that I knew.\" {Hero_cap} laughed — a soft, surprised laugh. The kind of laugh that means: yes, I do. {Refrain}"
    ],

    // -------- Beat 9: CLOSING — winding down toward home, sleep, or one last warm beat --------
    // Page-turn hook: a hint of comfort, a promise of tomorrow.
    closing: [
      "By the time the {timeOfDay} began to soften into evening, {hero} was on the way home — heart full, feet only a little tired, head buzzing with everything {sub} had seen and done and learned. {Sub_cap} couldn't wait to tell someone. {Sub_cap} couldn't wait to keep it secret. Maybe both. The light went rose, then gold, then gentle blue. {Onom_cap} went the gate as {sub} pushed it open. And there, glowing through the window, was home.",

      "{Hero_cap} waved goodbye to {firstCast}, who waved back with both hands. \"Same time tomorrow?\" \"Same time tomorrow.\" And then {firstCastShort} was off, and {hero} was off, and the day folded itself up neatly behind them. {Sub_cap} walked the long way home, just because. The sky did its slow evening trick. The first star showed up early, as if it didn't want to miss anything. {Hero_cap} smiled at it. The star, very politely, twinkled back.",

      "And so the day folded up around {hero} like a soft, well-loved blanket. There would be more stories — there always are. But this one, {sub} thought, this one was just right. {Sub_cap} would remember it for a very long time. {Refrain} Back at home, the lights were on. Someone had left them on for {obj}, just in case. {Hero_cap} smiled and pushed the door open. The smell of supper drifted out to meet {obj}.",

      "Back home, with the lights warm and the world soft around the edges, {hero} thought about the day. About {firstCastShort}. About the {challenge}. About the moment {sub} had finally {outcome_action_past}. It had been a {vibe} sort of day. The very best sort. {Sub_cap} curled up in {poss} favorite spot. {Sub_cap} closed {poss} eyes for just a moment. And the day, very kindly, kept on glowing inside {obj}.",

      "The {timeOfDay} drifted gently into evening, and {hero}'s eyes drifted gently closed. Tomorrow, after all, would have its own stories. But for now, this one — full of {firstCastShort} and {favoriteInterest} and the brave, bright thing {sub} had done — was more than enough. {OnomDouble}, said {hero}'s slow, sleepy breaths. {OnomDouble}, said the world. And little by little, the day let {obj} go.",

      "{Hero_cap} held the day close, like a small, glowing thing {sub} could put in {poss} pocket. Some days you live and forget. Some days you keep forever. This was one of the keep-forever kind. {Sub_cap} pressed {poss} hand to {poss} heart, where the day was still warm. {Refrain} And then — slowly, gently, the way good days end — the world tucked itself in around {obj}, and the story rested, and {hero} rested too."
    ],

    // -------- Beat 10: THE END — a wink, a kiss, a final note --------
    closing_final: [
      "The end. (Or maybe… just the beginning of {hero}'s next adventure.)",
      "And that, dear reader, is how {hero} learned about {keyword}. The end. ♥",
      "The end — for now. (Some stories never really end, do they?)",
      "Sweet dreams, {hero}. Sweet dreams, dear reader. ✨",
      "And they all lived, very happily, until tomorrow's adventure began. The end."
    ]
  };

  // ==========================================================
  // SUPPORTING PHRASES (for token replacement)
  // ==========================================================
  const TIME_OF_DAY = {
    'night': ['evening', 'starry night', 'moonlit hour', 'quiet bedtime'],
    'forest': ['morning', 'sun-dappled afternoon', 'golden hour', 'misty dawn'],
    'sea': ['bright morning', 'shimmering afternoon', 'salt-sweet day'],
    'space': ['cosmic morning', 'starlit hour', 'comet-bright day'],
    'day': ['sunny morning', 'bright afternoon', 'golden day', 'lemon-yellow day'],
    'twilight': ['hush of evening', 'soft-edged dusk', 'lavender hour'],
    'snow': ['snow-soft morning', 'crisp winter afternoon', 'frosty day']
  };

  const HAIR_THINGS = ['ribbons in their hair', 'a wild swoop of curls', 'a perfectly crooked part',
                       'hair like a sunbeam', 'a single stubborn cowlick', 'a braid down their back',
                       'a knit cap pulled low', 'hair that always looked a bit windblown'];

  // ==========================================================
  // BUILD STORY
  // ==========================================================
  function buildStory(input) {
    const hero = cap(input.heroName || 'Friend');
    const pron = inferPronouns(hero);

    const castList = cleanList(input.supportingCast);
    const interestList = cleanList(input.interests);

    const themeKey = input.theme === 'other' ? 'default' : (input.theme || 'default');
    const customTheme = input.themeOther;
    const outcomeKey = input.outcome === 'other' ? 'default' : (input.outcome || 'default');
    const customOutcome = input.outcomeOther;

    const vocab = THEME_VOCAB[themeKey] || THEME_VOCAB['default'];
    const outcomeBank = OUTCOME_VOCAB[outcomeKey] || OUTCOME_VOCAB['default'];
    const traits = traitsFromInterests(interestList);

    // Cast parsing — interpret each entry into {name, descriptor, kind, pron}
    const parsedCast = castList.map(c => {
      const p = parseCastEntry(c, pron);
      if (!p) return null;
      p.pron = castPronouns(p);
      p.mentioned = false;  // tracks first-mention so descriptor only appears once
      return p;
    }).filter(Boolean);

    // If no cast was provided, fall back to a theme creature so templates referring
    // to a friend still work.
    if (!parsedCast.length) {
      const fallback = pick(vocab.creatures); // e.g. "a clever little fox"
      parsedCast.push({
        name: null,
        descriptor: fallback,
        kind: 'unnamed',
        pron: inferPronouns(''),
        mentioned: false
      });
    }

    // Helper: render a cast member, automatically using their introduction (with descriptor)
    // on first mention and their short name on subsequent mentions.
    const refCast = (idx) => {
      const c = parsedCast[idx] || parsedCast[0];
      const isFirst = !c.mentioned;
      c.mentioned = true;
      return renderCast(c, { firstMention: isFirst });
    };
    const refCastShort = (idx) => {
      const c = parsedCast[idx] || parsedCast[0];
      // mark mentioned so any later {firstCast} uses the short form
      c.mentioned = true;
      return c.name || c.descriptor || '';
    };

    // Render the full cast as a comma-separated phrase with proper introductions.
    // ("Bailey, a show dog, and Joe, her grandpa")
    const fullCastIntro = () => {
      const parts = parsedCast.map((c, i) => {
        const isFirst = !c.mentioned;
        c.mentioned = true;
        return renderCast(c, { firstMention: isFirst });
      });
      return oxford(parts);
    };

    const firstCastChar = parsedCast[0];

    // Token bank for substitution.
    // String values are static; function values get called fresh for each token in a template
    // (so {sensory} appearing twice in one template gives two different values).
    const articleFor = (s) => {
      const first = s.trim().charAt(0).toLowerCase();
      return /[aeiou]/.test(first) ? 'an' : 'a';
    };
    const usedThisPage = new Set();
    const pickFresh = (arr) => {
      // Try to pick a value not yet used on this page; fall back if exhausted.
      const fresh = arr.filter(v => !usedThisPage.has(v));
      const chosen = pick(fresh.length ? fresh : arr);
      usedThisPage.add(chosen);
      return chosen;
    };

    const ctx = {
      // ----- Static (always the same across the book) -----
      hero,
      Hero_cap: hero,
      sub: pron.sub,
      Sub_cap: cap(pron.sub),
      obj: pron.obj,
      Obj_cap: cap(pron.obj),
      poss: pron.poss,
      Poss_cap: cap(pron.poss),
      possRefl: pron.refl,
      wasVerb: conj(pron, 'was'),
      isVerb: conj(pron, 'is'),
      hasVerb: conj(pron, 'has'),
      interestList: interestList.length ? oxford(interestList) : 'all the bright things',
      keyword: outcomeBank.keyword,

      // ----- Cast tokens (resolver functions; track first-mention) -----
      // {firstCast} — the primary supporting character. On first reference,
      // includes their descriptor ("Bailey, a show dog"). After that, just their name.
      firstCast: () => refCast(0),
      firstCast_cap: () => cap(refCast(0)),
      // {firstCastShort} — always the short form (just name) regardless of mention count
      firstCastShort: () => refCastShort(0),
      firstCastShort_cap: () => cap(refCastShort(0)),
      // Pronouns for the first cast member
      castSub: () => firstCastChar.pron.sub,
      castSub_cap: () => cap(firstCastChar.pron.sub),
      castObj: () => firstCastChar.pron.obj,
      castPoss: () => firstCastChar.pron.poss,
      // Full cast as a list ("Bailey, a show dog, and Joe, her grandpa")
      castList: () => fullCastIntro(),
      // {cast} — synonym for firstCast (backwards-compat)
      cast: () => refCast(0),
      Cast_cap: () => cap(refCast(0)),

      // ----- Variable (resolver fn — fresh value each call) -----
      trait: () => pickFresh(traits),
      hairThing: () => pickFresh(HAIR_THINGS),
      timeOfDay: () => pickFresh(TIME_OF_DAY[vocab.mood] || TIME_OF_DAY['day']),
      sound: () => pickFresh(vocab.sounds),
      Sound_cap: () => cap(pickFresh(vocab.sounds)),
      // Onomatopoeia — short sound words for picture-book rhythm.
      // {onom} returns one ("hush"), {Onom_cap} capitalized, {onomDouble} doubles it ("hush, hush").
      onom: () => pickFresh(vocab.onomatopoeia || ['hush']),
      Onom_cap: () => cap(pickFresh(vocab.onomatopoeia || ['hush'])),
      onomDouble: () => {
        const w = pickFresh(vocab.onomatopoeia || ['hush']);
        return `${w}, ${w}`;
      },
      // Refrain — the recurring phrase that gives the book its rhythm.
      // Same value across the whole book (set once, not on each call).
      refrain: vocab.refrain || 'On the day went, bright and full.',
      sensory: () => pickFresh(vocab.sensory),
      vibe: () => pickFresh(vocab.vibes),
      verb: () => pickFresh(vocab.verbs),
      verbed_past: () => pickFresh(vocab.verbs),
      tried_past: () => pickFresh(outcomeBank.verbsOfDoing),
      object: () => {
        const o = pickFresh(vocab.objects).replace(/^(a |an |the )/, '');
        return articleFor(o) + ' ' + o;
      },
      bare_object: () => pickFresh(vocab.objects).replace(/^(a |an |the )/, ''),
      object_pl: () => smartPlural(pickFresh(vocab.objects).replace(/^(a |an |the )/, '')),
      object2_pl: () => smartPlural(pickFresh(vocab.objects).replace(/^(a |an |the )/, '')),
      creature: () => pickFresh(vocab.creatures),
      Creature_cap: () => cap(pickFresh(vocab.creatures)),
      // Place handling — multiple forms for grammatical correctness
      place: () => 'the ' + pickFresh(vocab.places),                         // "the old oak grove"
      Place_cap: () => 'The ' + pickFresh(vocab.places),                      // "The old oak grove" (sentence start)
      bare_place: () => pickFresh(vocab.places),                              // "old oak grove"
      a_place: () => {                                                         // "a clearing" / "an oak grove"
        const p = pickFresh(vocab.places);
        return articleFor(p) + ' ' + p;
      },
      challenge: () => pick(['puzzle', 'tricky thing', 'wide gap', 'tall wall', 'tangle of brambles', 'mystery']),
      feeling: () => pick(['joy', 'wonder', 'home', 'magic', 'sunshine', 'a brand-new beginning']),
      favoriteInterest: () => interestList.length ? pick(interestList) : 'making things',
      lesson: () => pick(outcomeBank.lesson),
      lesson_lower: () => pick(outcomeBank.lesson).replace(/^./, c => c.toLowerCase()),
      outcome_action_past: () => pick(outcomeBank.verbsOfDoing)
    };

    // Custom outcome override (replaces lesson resolvers with fixed values)
    if (customOutcome) {
      ctx.lesson = `And ${hero} ${customOutcome}.`;
      ctx.lesson_lower = `${hero} ${customOutcome}.`;
    }

    // Title
    const title = generateTitle(hero, themeKey, outcomeKey, customTheme, vocab);

    // Build pages — one template per beat, picked randomly each time.
    // Reset usedThisPage between beats so each page can re-use values from earlier pages
    // (but won't repeat within a single page).
    const beatOrder = ['opening', 'world', 'inciting', 'rising', 'complication', 'turning', 'climax', 'resolution', 'closing', 'closing_final'];
    const pages = beatOrder.map((beat, i) => {
      usedThisPage.clear();
      const tmpl = pick(PAGE_TEMPLATES[beat]);
      return {
        beat,
        index: i,
        text: ageTune(fmt(tmpl, ctx), input.heroAge)
      };
    });

    return { title, pages, palette: vocab.palette, mood: vocab.mood, hero, pron };
  }

  function pluralize(s) {
    if (s.endsWith('s')) return s;
    if (s.endsWith('y') && !/[aeiou]y$/.test(s)) return s.slice(0, -1) + 'ies';
    if (s.endsWith('f')) return s.slice(0, -1) + 'ves';   // leaf → leaves
    if (s.endsWith('ch') || s.endsWith('sh') || s.endsWith('x') || s.endsWith('z')) return s + 'es';
    return s + 's';
  }
  // For multi-word noun phrases like "feather no bigger than a thumb",
  // "flag for a brand-new world", or "juice box, perfectly cold", pluralize
  // the HEAD noun (everything before a preposition or comma), not the last word.
  function smartPlural(phrase) {
    // If there's a comma, the head is what comes before it: "juice box, perfectly cold" → "juice boxes, perfectly cold"
    const commaIdx = phrase.indexOf(',');
    if (commaIdx !== -1) {
      const head = phrase.slice(0, commaIdx).trim();
      const tail = phrase.slice(commaIdx);
      const headWords = head.split(/\s+/);
      const lastHead = headWords.pop();
      const adjs = headWords.join(' ');
      return (adjs ? adjs + ' ' : '') + pluralize(lastHead) + tail;
    }
    // If there's a preposition, head is what comes before it
    const PREPS = /\b(of|for|with|like|in|on|at|to|from|around|under|beside|between|among|by|named|than)\b/;
    const m = phrase.match(PREPS);
    if (m) {
      const headPart = phrase.slice(0, m.index).trim();
      const tailPart = phrase.slice(m.index);
      const headWords = headPart.split(/\s+/);
      const head = headWords.pop();
      const adjs = headWords.join(' ');
      return (adjs ? adjs + ' ' : '') + pluralize(head) + ' ' + tailPart;
    }
    // No preposition or comma — pluralize the last word
    const words = phrase.split(/\s+/);
    const last = words.pop();
    return (words.length ? words.join(' ') + ' ' : '') + pluralize(last);
  }

  // ==========================================================
  // TEMPLATE FORMATTER — replaces {tokens}, calls resolver fns,
  // and cleans up double articles (e.g. "in the the forest" -> "in the forest")
  // ==========================================================
  function fmt(tmpl, ctx) {
    let out = tmpl.replace(/\{(\w+)\}/g, (_, key) => {
      const v = key in ctx ? ctx[key] : ctx[key.toLowerCase()];
      if (v === undefined) return '';
      return typeof v === 'function' ? v() : v;
    });
    // Cleanup: collapse repeated articles, fix "a apple" -> "an apple"
    out = out.replace(/\b(the)\s+the\b/gi, '$1');
    out = out.replace(/\b(a)\s+a\b/gi, '$1');
    out = out.replace(/\b(an)\s+an\b/gi, '$1');
    out = out.replace(/\bin a (the )/gi, 'in $1');
    out = out.replace(/\b(a) ([aeiouAEIOU])/g, 'an $2');
    out = out.replace(/\b(A) ([aeiouAEIOU])/g, 'An $2');
    // Comma cleanup for cast appositions:
    //   ", , "  →  ", "        (comma after a closing-comma already in template)
    //   ",." → "."             (closing comma right before period)
    //   ",!" / ",?"  → "!"/"?"
    //   ",,"  →  ","
    out = out.replace(/,\s*,/g, ',');
    out = out.replace(/,(\s*[.!?])/g, '$1');
    // Collapse double spaces
    out = out.replace(/\s{2,}/g, ' ').trim();
    return out;
  }

  // ==========================================================
  // AGE TUNING — light vocabulary adjustment for ages 3-5
  // ==========================================================
  const AGE_3_5_REPLACEMENTS = [
    [/perfectly ordinary/g, 'plain'],
    [/extraordinary/g, 'amazing'],
    [/cathedral/g, 'tall castle'],
    [/possibility/g, 'maybe-thing'],
    [/somersaulted/g, 'flipped'],
    [/luminous/g, 'glowing'],
    [/crystal-bright/g, 'shiny'],
    [/cosmic/g, 'space'],
    [/courageous/g, 'brave'],
    [/spectacles/g, 'glasses']
  ];
  const AGE_8_10_FLOURISHES = [
    // For older kids, leave the language as-is. The templates already
    // skew slightly literary, which works for this range.
  ];
  function ageTune(text, age) {
    if (age === '3-5') {
      let out = text;
      for (const [re, rep] of AGE_3_5_REPLACEMENTS) out = out.replace(re, rep);
      // Trim very long sentences for younger ears (split on '. ')
      const sentences = out.split(/(?<=[.!?])\s+/);
      return sentences.slice(0, Math.min(3, sentences.length)).join(' ');
    }
    return text;
  }

  // ==========================================================
  // ILLUSTRATION ENGINE — varied scenes per beat
  // ==========================================================
  function illoBackground(palette, mood, variant = 0) {
    const v = variant % 3;
    if (mood === 'night') {
      return `
        <rect width="340" height="200" fill="${palette.sky}"/>
        ${v === 0 ? `<circle cx="270" cy="50" r="28" fill="#fff5d6"/><circle cx="260" cy="45" r="22" fill="${palette.sky}"/>` : ''}
        ${v === 1 ? `<circle cx="170" cy="40" r="24" fill="#fff5d6"/>` : ''}
        ${v === 2 ? `<circle cx="60" cy="50" r="20" fill="#fff5d6"/>` : ''}
        ${randomStars(15 + v * 5, 'a' + variant)}
        <path d="M0 ${160 - v * 5} Q170 ${130 - v * 5} 340 ${160 - v * 5} L340 200 L0 200 Z" fill="${palette.ground}"/>
      `;
    }
    if (mood === 'forest') {
      return `
        <rect width="340" height="200" fill="${palette.sky}"/>
        ${v === 0 ? `<circle cx="60" cy="50" r="22" fill="#ffd166"/>` : ''}
        ${v === 1 ? `<circle cx="280" cy="40" r="20" fill="#ffd166"/>` : ''}
        ${v === 2 ? `${cloud(80, 40)} ${cloud(220, 50)}` : ''}
        ${treeLine(palette.ground, v)}
        <rect y="170" width="340" height="30" fill="${palette.ground}"/>
        ${v >= 1 ? mushrooms(v) : ''}
      `;
    }
    if (mood === 'sea') {
      return `
        <rect width="340" height="200" fill="${palette.sky}"/>
        ${bubbles(8 + v * 3)}
        ${v === 0 ? seaweed() : ''}
        ${v === 1 ? coral() : ''}
        ${v === 2 ? `${seaweed()} ${coral()}` : ''}
        <path d="M0 170 Q60 ${150 - v * 4} 120 170 T240 170 T340 170 L340 200 L0 200 Z" fill="${palette.ground}"/>
      `;
    }
    if (mood === 'space') {
      return `
        <rect width="340" height="200" fill="${palette.sky}"/>
        ${randomStars(20 + v * 5, 'b' + variant)}
        ${v === 0 ? planet(280, 60, '#ff8a5b', '#ffd166') : ''}
        ${v === 1 ? planet(70, 50, '#7ec4cf', '#fff') : ''}
        ${v === 2 ? `${planet(250, 40, '#ff8a5b', '#ffd166')} ${planet(80, 70, '#7ec4cf', '#fff')}` : ''}
        <path d="M0 160 Q170 ${130 + v * 3} 340 160 L340 200 L0 200 Z" fill="${palette.ground}"/>
      `;
    }
    if (mood === 'twilight') {
      return `
        <rect width="340" height="200" fill="${palette.sky}"/>
        ${randomStars(8, 'c' + variant)}
        ${v === 1 ? `<circle cx="60" cy="60" r="18" fill="#ffd166" opacity="0.7"/>` : ''}
        <path d="M0 150 Q170 120 340 150 L340 200 L0 200 Z" fill="${palette.ground}"/>
      `;
    }
    if (mood === 'snow') {
      return `
        <rect width="340" height="200" fill="${palette.sky}"/>
        ${snowflakes(12 + v * 4, variant)}
        ${v === 0 ? `${tree(60, 165, '#fff', '#5a8c5e')} ${tree(280, 165, '#fff', '#5a8c5e')}` : ''}
        ${v === 1 ? `${tree(280, 165, '#fff', '#5a8c5e')}` : ''}
        <path d="M0 160 Q60 140 120 155 T240 150 T340 160 L340 200 L0 200 Z" fill="#fff"/>
      `;
    }
    // day
    return `
      <rect width="340" height="200" fill="${palette.sky}"/>
      ${v === 0 ? `<circle cx="270" cy="40" r="22" fill="#ffd166"/>` : ''}
      ${v === 1 ? `<circle cx="60" cy="40" r="22" fill="#ffd166"/>` : ''}
      ${v === 2 ? `<circle cx="170" cy="35" r="20" fill="#ffd166"/>` : ''}
      ${cloud(60 + v * 30, 50)} ${cloud(160 + v * 20, 35)}
      <path d="M0 160 Q170 ${140 - v * 3} 340 160 L340 200 L0 200 Z" fill="${palette.ground}"/>
      ${v >= 1 ? flowers() : ''}
    `;
  }

  function randomStars(n, seed) {
    let stars = '';
    for (let i = 0; i < n; i++) {
      // Pseudo-random but deterministic per seed/i
      const x = ((Math.sin((seed || 0).toString().charCodeAt(0) + i * 12.9) + 1) * 170) % 340;
      const y = ((Math.cos((seed || 0).toString().charCodeAt(0) + i * 7.3) + 1) * 65) % 130;
      const r = 1 + (Math.sin(i * 3.1) + 1);
      stars += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="#fff" opacity="${0.55 + ((Math.cos(i * 1.7) + 1) / 4).toFixed(2)}"/>`;
    }
    return stars;
  }
  function snowflakes(n, seed = 0) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = ((Math.sin(seed + i * 2.1) + 1) * 170);
      const y = ((Math.cos(seed + i * 1.7) + 1) * 75);
      s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="2" fill="#fff"/>`;
    }
    return s;
  }
  function bubbles(n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = ((Math.sin(i * 3.1) + 1) * 170);
      const y = ((Math.cos(i * 2.3) + 1) * 75);
      const r = 3 + ((Math.sin(i * 1.7) + 1) * 3);
      s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(0)}" fill="#fff" opacity="0.4"/>`;
    }
    return s;
  }
  function cloud(x, y) {
    return `
      <ellipse cx="${x}" cy="${y}" rx="22" ry="10" fill="#fff" opacity="0.9"/>
      <ellipse cx="${x + 14}" cy="${y - 4}" rx="14" ry="9" fill="#fff" opacity="0.9"/>
      <ellipse cx="${x - 14}" cy="${y - 2}" rx="14" ry="8" fill="#fff" opacity="0.9"/>
    `;
  }
  function treeLine(color, variant = 0) {
    let trees = '';
    const count = 5 + variant;
    for (let i = 0; i < count; i++) {
      const x = 30 + i * (280 / count);
      const h = 80 + ((Math.sin(i * 2.1) + 1) * 15);
      trees += `
        <polygon points="${x},${170 - h} ${x - 22},${170} ${x + 22},${170}" fill="${shade(color, -10)}"/>
        <polygon points="${x},${170 - h + 25}  ${x - 18},${170 - 20}  ${x + 18},${170 - 20}" fill="${shade(color, 10)}"/>
      `;
    }
    return trees;
  }
  function tree(x, y, snowColor, treeColor) {
    return `
      <polygon points="${x},${y - 60} ${x - 18},${y} ${x + 18},${y}" fill="${treeColor}"/>
      <polygon points="${x},${y - 60} ${x - 14},${y - 24} ${x + 14},${y - 24}" fill="${snowColor}"/>
      <polygon points="${x},${y - 40} ${x - 16},${y - 8} ${x + 16},${y - 8}" fill="${snowColor}"/>
    `;
  }
  function mushrooms(variant) {
    return `
      <ellipse cx="50" cy="180" rx="10" ry="6" fill="#e85d75"/>
      <rect x="47" y="180" width="6" height="10" fill="#fff5d6"/>
      <ellipse cx="290" cy="183" rx="8" ry="5" fill="#ff8a5b"/>
      <rect x="287" y="183" width="6" height="8" fill="#fff5d6"/>
    `;
  }
  function flowers() {
    return `
      <circle cx="40" cy="180" r="4" fill="#e85d75"/>
      <circle cx="40" cy="180" r="2" fill="#ffd166"/>
      <circle cx="290" cy="178" r="4" fill="#fff"/>
      <circle cx="290" cy="178" r="2" fill="#ffd166"/>
      <circle cx="200" cy="183" r="3" fill="#7ec4cf"/>
    `;
  }
  function seaweed() {
    return `
      <path d="M30 200 Q35 170 30 140 Q35 120 30 100" stroke="#5a8c5e" stroke-width="3" fill="none"/>
      <path d="M310 200 Q315 175 310 150 Q315 130 310 110" stroke="#5a8c5e" stroke-width="3" fill="none"/>
    `;
  }
  function coral() {
    return `
      <path d="M270 200 L270 175 L260 165 M270 175 L280 165 M270 185 L262 178 M270 185 L278 178" stroke="#e85d75" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M65 200 L65 180 L58 170 M65 180 L72 170" stroke="#ff8a5b" stroke-width="3" fill="none" stroke-linecap="round"/>
    `;
  }
  function planet(cx, cy, color, ringColor) {
    return `
      <circle cx="${cx}" cy="${cy}" r="18" fill="${color}"/>
      <ellipse cx="${cx}" cy="${cy}" rx="28" ry="6" fill="none" stroke="${ringColor}" stroke-width="2" transform="rotate(-15 ${cx} ${cy})"/>
    `;
  }
  function shade(hex, p) {
    const h = hex.replace('#', '');
    const num = parseInt(h, 16);
    let r = (num >> 16) + p, g = ((num >> 8) & 0xff) + p, b = (num & 0xff) + p;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  // -------- Hero character (consistent across pages) --------
  function illoHero(x, y, palette, pose) {
    const skin = '#ffd9b3', hair = '#5b3a29';
    const shirt = palette.accent;
    return `
      <g transform="translate(${x}, ${y})">
        <rect x="-8" y="35" width="6" height="18" rx="2" fill="#3a2618"/>
        <rect x="2" y="35" width="6" height="18" rx="2" fill="#3a2618"/>
        <rect x="-12" y="15" width="24" height="24" rx="6" fill="${shirt}"/>
        ${poseArm(pose, shirt)}
        <circle cx="0" cy="0" r="13" fill="${skin}"/>
        <path d="M-13 -2 Q-13 -16 0 -16 Q13 -16 13 -2 L11 0 Q5 -8 0 -8 Q-5 -8 -11 0 Z" fill="${hair}"/>
        ${poseFace(pose)}
        <circle cx="-7" cy="3" r="1.5" fill="#ff8a5b" opacity="0.5"/>
        <circle cx="7" cy="3" r="1.5" fill="#ff8a5b" opacity="0.5"/>
      </g>
    `;
  }
  function poseArm(pose, shirt) {
    if (pose === 'wave')   return `<rect x="-20" y="0" width="6" height="20" rx="3" fill="${shirt}" transform="rotate(-25 -17 10)"/><rect x="12" y="18" width="6" height="18" rx="3" fill="${shirt}"/>`;
    if (pose === 'reach')  return `<rect x="-20" y="-2" width="6" height="22" rx="3" fill="${shirt}" transform="rotate(-45 -17 10)"/><rect x="14" y="-2" width="6" height="22" rx="3" fill="${shirt}" transform="rotate(45 17 10)"/>`;
    if (pose === 'think')  return `<rect x="-18" y="18" width="6" height="18" rx="3" fill="${shirt}"/><rect x="12" y="0" width="6" height="20" rx="3" fill="${shirt}" transform="rotate(45 15 10)"/>`;
    if (pose === 'sleep')  return `<rect x="-18" y="22" width="6" height="14" rx="3" fill="${shirt}"/><rect x="12" y="22" width="6" height="14" rx="3" fill="${shirt}"/>`;
    if (pose === 'cheer')  return `<rect x="-22" y="-4" width="6" height="22" rx="3" fill="${shirt}" transform="rotate(-30 -19 7)"/><rect x="16" y="-4" width="6" height="22" rx="3" fill="${shirt}" transform="rotate(30 19 7)"/>`;
    if (pose === 'walk')   return `<rect x="-18" y="20" width="6" height="18" rx="3" fill="${shirt}" transform="rotate(-15 -15 25)"/><rect x="12" y="16" width="6" height="18" rx="3" fill="${shirt}" transform="rotate(15 15 25)"/>`;
    return                       `<rect x="-18" y="18" width="6" height="18" rx="3" fill="${shirt}"/><rect x="12" y="18" width="6" height="18" rx="3" fill="${shirt}"/>`;
  }
  function poseFace(pose) {
    if (pose === 'sleep')  return `<path d="M-6 0 L-2 0" stroke="#1a1a2e" stroke-width="1.5" stroke-linecap="round"/><path d="M2 0 L6 0" stroke="#1a1a2e" stroke-width="1.5" stroke-linecap="round"/><path d="M-2 5 Q0 6 2 5" stroke="#1a1a2e" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
    if (pose === 'think')  return `<circle cx="-4" cy="0" r="1.5" fill="#1a1a2e"/><circle cx="4" cy="0" r="1.5" fill="#1a1a2e"/><path d="M-2 6 L2 6" stroke="#1a1a2e" stroke-width="1.2" stroke-linecap="round"/>`;
    if (pose === 'cheer')  return `<circle cx="-4" cy="0" r="1.5" fill="#1a1a2e"/><circle cx="4" cy="0" r="1.5" fill="#1a1a2e"/><path d="M-4 4 Q0 9 4 4" stroke="#1a1a2e" stroke-width="1.5" fill="#1a1a2e" stroke-linecap="round"/>`;
    return                       `<circle cx="-4" cy="0" r="1.5" fill="#1a1a2e"/><circle cx="4" cy="0" r="1.5" fill="#1a1a2e"/><path d="M-3 5 Q0 7 3 5" stroke="#1a1a2e" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  }

  function illoFriend(x, y, palette) {
    const skin = '#f4c2a1', hair = '#c9a44a';
    const shirt = palette.sky === '#ffe9d0' ? '#7ec4cf' : '#ffd166';
    return `
      <g transform="translate(${x}, ${y})">
        <rect x="-8" y="35" width="6" height="18" rx="2" fill="#3a2618"/>
        <rect x="2" y="35" width="6" height="18" rx="2" fill="#3a2618"/>
        <rect x="-12" y="15" width="24" height="24" rx="6" fill="${shirt}"/>
        <rect x="-18" y="18" width="6" height="18" rx="3" fill="${shirt}"/>
        <rect x="12" y="18" width="6" height="18" rx="3" fill="${shirt}"/>
        <circle cx="0" cy="0" r="13" fill="${skin}"/>
        <path d="M-13 -4 Q-13 -16 0 -16 Q13 -16 13 -4 Q13 4 11 4 L-11 4 Q-13 4 -13 -4 Z" fill="${hair}"/>
        <circle cx="-4" cy="0" r="1.5" fill="#1a1a2e"/>
        <circle cx="4" cy="0" r="1.5" fill="#1a1a2e"/>
        <path d="M-3 5 Q0 7 3 5" stroke="#1a1a2e" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      </g>
    `;
  }

  function illoStar(x, y, size, color) {
    const s = size;
    return `<path d="M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y - s * 0.2} L${x + s * 0.4} ${y + s * 0.2} L${x + s * 0.5} ${y + s} L${x} ${y + s * 0.5} L${x - s * 0.5} ${y + s} L${x - s * 0.4} ${y + s * 0.2} L${x - s} ${y - s * 0.2} L${x - s * 0.3} ${y - s * 0.3} Z" fill="${color}"/>`;
  }

  function illoHeart(x, y, size, color) {
    return `<path d="M${x} ${y + size * 0.4} Q${x - size} ${y - size * 0.2} ${x - size * 0.5} ${y - size * 0.6} Q${x} ${y - size * 0.4} ${x + size * 0.5} ${y - size * 0.6} Q${x + size} ${y - size * 0.2} ${x} ${y + size * 0.4} Z" fill="${color}"/>`;
  }

  // ---------- Cover ----------
  function makeCover(story) {
    const p = story.palette;
    return `
      <svg viewBox="0 0 340 240" xmlns="http://www.w3.org/2000/svg">
        ${illoBackground(p, story.mood, 0)}
        ${illoHero(170, 130, p, 'wave')}
        ${illoStar(60, 40, 12, p.accent)}
        ${illoStar(290, 80, 8, '#fff')}
        ${illoStar(40, 110, 6, p.accent)}
      </svg>
    `;
  }

  // ---------- Per-page illustration with beat-aware composition ----------
  function makePageIllo(page, story, idx) {
    const p = story.palette;
    const variant = idx % 3;
    let scene = illoBackground(p, story.mood, variant);

    switch (page.beat) {
      case 'opening':
        scene += illoHero(170, 130, p, 'stand');
        scene += illoStar(80, 50, 8, p.accent);
        break;
      case 'world':
        scene += illoHero(120, 130, p, 'walk');
        scene += illoStar(240, 60, 12, p.accent);
        scene += illoStar(280, 100, 6, '#fff');
        break;
      case 'inciting':
        scene += illoHero(120, 130, p, 'reach');
        scene += illoStar(220, 110, 14, p.accent);
        break;
      case 'rising':
        scene += illoHero(110, 130, p, 'walk');
        scene += illoFriend(220, 130, p);
        scene += illoStar(60, 50, 6, p.accent);
        scene += illoStar(290, 50, 6, '#fff');
        break;
      case 'complication':
        scene += illoHero(170, 130, p, 'think');
        scene += `<text x="190" y="100" font-family="Caveat, cursive" font-size="20" fill="${p.accent}">?</text>`;
        scene += `<text x="155" y="95" font-family="Caveat, cursive" font-size="14" fill="${p.accent}">?</text>`;
        break;
      case 'turning':
        scene += illoHero(120, 130, p, 'think');
        scene += illoFriend(220, 130, p);
        scene += `<text x="160" y="90" font-family="Caveat, cursive" font-size="22" fill="${p.accent}">!</text>`;
        break;
      case 'climax':
        scene += illoHero(170, 125, p, 'cheer');
        scene += illoStar(80, 40, 14, p.accent);
        scene += illoStar(260, 40, 14, '#fff');
        scene += illoStar(160, 25, 10, p.accent);
        scene += illoStar(50, 90, 6, '#fff');
        scene += illoStar(290, 90, 6, p.accent);
        break;
      case 'resolution':
        scene += illoHero(120, 130, p, 'stand');
        scene += illoFriend(220, 130, p);
        scene += illoHeart(170, 80, 8, p.accent);
        scene += illoStar(60, 60, 6, p.accent);
        break;
      case 'closing':
        scene += illoHero(120, 130, p, 'wave');
        scene += illoFriend(220, 130, p);
        scene += `<path d="M120 110 Q170 90 220 110" stroke="${p.accent}" stroke-width="2" fill="none" stroke-dasharray="4 3"/>`;
        break;
      case 'closing_final':
      default:
        if (story.mood === 'night') {
          scene += illoHero(170, 130, p, 'sleep');
          scene += illoStar(60, 50, 8, '#fff');
          scene += illoStar(290, 60, 6, '#fff');
        } else {
          scene += illoHero(170, 130, p, 'wave');
          scene += illoHeart(60, 50, 8, p.accent);
          scene += illoHeart(280, 60, 6, p.accent);
          scene += illoStar(100, 80, 5, p.accent);
        }
        break;
    }
    return `<svg viewBox="0 0 340 200" xmlns="http://www.w3.org/2000/svg">${scene}</svg>`;
  }

  // ==========================================================
  // RENDER
  // ==========================================================
  function renderBook(story, dedication) {
    // Calculate reading time (read-aloud: ~110 wpm is a comfortable picture-book pace)
    const totalWords = story.pages.reduce((s, p) => s + p.text.split(/\s+/).length, 0);
    const readMinutes = Math.max(1, Math.round(totalWords / 110));
    const totalPages = story.pages.length;

    // Preview pages: cover + (dedication if present) + first 2 story pages.
    // This is roughly 25% of the content and ends just as the inciting incident lands —
    // perfectly placed to make the reader want more.
    const PREVIEW_STORY_PAGES = 2;
    const previewPagesHtml = [];
    const lockedPagesCount = totalPages - PREVIEW_STORY_PAGES;

    // Cover
    previewPagesHtml.push(`
      <div class="page-spread cover" style="background: linear-gradient(160deg, #fff5d6, #ffe9d0); animation-delay: 0s;">
        <div class="page-num">cover</div>
        <div class="page-illustration">${makeCover(story)}</div>
        <div class="page-text" style="font-size: 1.5rem; font-weight: 800; font-family: var(--display);">${escapeHtml(story.title)}</div>
        <div class="page-text" style="font-family: var(--script); font-size: 1.2rem; color: var(--coral); margin-top: 0.3rem;">A story for ${escapeHtml(story.hero)}</div>
      </div>
    `);

    // Dedication (if provided)
    if (dedication) {
      previewPagesHtml.push(`
        <div class="page-spread dedication" style="animation-delay: 0.08s;">
          <div class="page-num">dedication</div>
          <div class="page-text">${escapeHtml(dedication)}</div>
        </div>
      `);
    }

    // First N story pages (the preview)
    story.pages.slice(0, PREVIEW_STORY_PAGES).forEach((page, i) => {
      previewPagesHtml.push(`
        <div class="page-spread" style="animation-delay: ${(i + 1) * 0.08}s">
          <div class="page-num">page ${i + 1} of ${totalPages}</div>
          <div class="page-illustration">${makePageIllo(page, story, i)}</div>
          <div class="page-text">${escapeHtml(page.text)}</div>
        </div>
      `);
    });

    // Build the teaser line — something specific about what's still ahead.
    // Pull the climax page text and extract a short, intriguing fragment to hint at.
    const teaserBeats = [];
    if (story.pages.find(p => p.beat === 'inciting')) teaserBeats.push('a curious discovery');
    if (story.pages.find(p => p.beat === 'rising')) teaserBeats.push('an unexpected friend');
    if (story.pages.find(p => p.beat === 'climax')) teaserBeats.push('the bright, brave moment');
    if (story.pages.find(p => p.beat === 'resolution')) teaserBeats.push('a quiet, true lesson');
    if (story.pages.find(p => p.beat === 'closing')) teaserBeats.push('the soft way home');
    const teaserList = teaserBeats.length
      ? teaserBeats.slice(0, 3).join(', ')
      : 'the rest of the adventure';

    // Paywall gate — fades the next page in behind a soft veil, with the CTA on top.
    // The "blurred preview" technique is well-established in storefront UX and signals
    // "the content is real, you just need to unlock it."
    const blurredPeekText = story.pages[PREVIEW_STORY_PAGES] ? story.pages[PREVIEW_STORY_PAGES].text : '';
    const paywallHtml = `
      <div class="paywall">
        <div class="paywall-peek" aria-hidden="true">
          <div class="page-spread blurred">
            <div class="page-num">page ${PREVIEW_STORY_PAGES + 1} of ${totalPages}</div>
            <div class="page-illustration">${story.pages[PREVIEW_STORY_PAGES] ? makePageIllo(story.pages[PREVIEW_STORY_PAGES], story, PREVIEW_STORY_PAGES) : ''}</div>
            <div class="page-text">${escapeHtml(blurredPeekText)}</div>
          </div>
          <div class="paywall-fade"></div>
        </div>
        <div class="paywall-card">
          <div class="paywall-eyebrow">Preview ends here</div>
          <h3 class="paywall-title">Want to read the rest of ${escapeHtml(story.hero)}'s story?</h3>
          <p class="paywall-body">
            You've read 2 of ${totalPages} pages. The full story —
            ${escapeHtml(teaserList)} — is waiting on the other side.
            Get the complete book, beautifully formatted and ready to read tonight.
          </p>
          <div class="paywall-meta">
            <span class="paywall-meta-pill">📖 ${totalPages} pages</span>
            <span class="paywall-meta-pill">⏱ ~${readMinutes} min read-aloud</span>
            <span class="paywall-meta-pill">🎨 fully illustrated</span>
          </div>
          <div class="paywall-cta-row">
            <a href="#pricing" class="paywall-cta paywall-cta-primary">
              <span class="cta-label">Get the PDF</span>
              <span class="cta-price">$9</span>
              <span class="cta-sub">Instant download · Read tonight</span>
            </a>
            <a href="#pricing" class="paywall-cta paywall-cta-secondary">
              <span class="cta-label">Order the Hardcover</span>
              <span class="cta-price">$34</span>
              <span class="cta-sub">Printed &amp; shipped · Keepsake quality</span>
            </a>
          </div>
          <p class="paywall-finepr">
            Free preview · No account required to buy ·
            Money-back guarantee if you don't love it.
          </p>
        </div>
      </div>
    `;

    return `
      <div class="book">
        <div class="book-header">
          <h3 class="book-title">${escapeHtml(story.title)}</h3>
          <div class="book-meta">
            <span class="book-meta-item">${totalPages} pages</span>
            <span class="book-meta-sep">·</span>
            <span class="book-meta-item">${readMinutes} min read</span>
          </div>
          <div class="book-actions">
            <button type="button" id="newBookBtn" title="Generate a new variation">↻ Try another</button>
          </div>
        </div>
        ${previewPagesHtml.join('')}
        ${paywallHtml}
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ==========================================================
  // SUBMIT HANDLER
  // ==========================================================
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = collectFormData();
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    setTimeout(() => {
      const story = buildStory(data);
      preview.innerHTML = renderBook(story, data.dedication);
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      wireBookButtons(data);
      preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 700);
  });

  function collectFormData() {
    return {
      heroName: document.getElementById('heroName').value.trim() || 'Friend',
      heroAge: document.getElementById('heroAge').value,
      supportingCast: document.getElementById('supportingCast').value.trim(),
      interests: document.getElementById('interests').value.trim(),
      theme: document.getElementById('theme').value,
      themeOther: document.getElementById('themeOther').value.trim(),
      outcome: document.getElementById('outcome').value,
      outcomeOther: document.getElementById('outcomeOther').value.trim(),
      dedication: dedicationCheck.checked
        ? document.getElementById('dedicationText').value.trim()
        : ''
    };
  }

  function wireBookButtons(data) {
    const newBtn = document.getElementById('newBookBtn');
    if (newBtn) newBtn.addEventListener('click', () => {
      const story = buildStory(data);
      preview.innerHTML = renderBook(story, data.dedication);
      wireBookButtons(data);
    });
  }
})();
