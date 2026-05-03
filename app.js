// ==========================================
// StorySpark — Story generator
// Template-driven engine that produces an
// 8-page illustrated picture book from form input.
// ==========================================

(function () {
  'use strict';

  // -------- DOM refs --------
  const form = document.getElementById('bookForm');
  const themeSel = document.getElementById('theme');
  const themeOtherWrap = document.getElementById('themeOtherWrap');
  const outcomeSel = document.getElementById('outcome');
  const outcomeOtherWrap = document.getElementById('outcomeOtherWrap');
  const dedicationCheck = document.getElementById('dedication');
  const dedicationWrap = document.getElementById('dedicationWrap');
  const preview = document.getElementById('preview');
  const submitBtn = form.querySelector('button[type="submit"]');

  // -------- Conditional fields --------
  themeSel.addEventListener('change', () => {
    themeOtherWrap.style.display = themeSel.value === 'other' ? 'block' : 'none';
  });
  outcomeSel.addEventListener('change', () => {
    outcomeOtherWrap.style.display = outcomeSel.value === 'other' ? 'block' : 'none';
  });
  dedicationCheck.addEventListener('change', () => {
    dedicationWrap.style.display = dedicationCheck.checked ? 'block' : 'none';
  });

  // -------- Helpers --------
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const cleanList = (s) => (s || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);

  // -------- Theme settings (color palettes + scenes) --------
  const themePalettes = {
    'Bedtime & the moon':         { sky: '#1a2f5c', ground: '#2a4174', accent: '#ffd166', mood: 'night' },
    'Magical forest adventure':   { sky: '#a8d8b9', ground: '#5a8c5e', accent: '#e85d75', mood: 'forest' },
    'Underwater journey':         { sky: '#7ec4cf', ground: '#3a6c8c', accent: '#ffd166', mood: 'sea' },
    'Outer space exploration':    { sky: '#1a1a3e', ground: '#3d2c5c', accent: '#ffd166', mood: 'space' },
    'First day of school':        { sky: '#ffe9d0', ground: '#ff8a5b', accent: '#7ec4cf', mood: 'day' },
    'Making a new friend':        { sky: '#fff5d6', ground: '#ffd166', accent: '#e85d75', mood: 'day' },
    'Big sibling / new baby':     { sky: '#ffe6ee', ground: '#ffb3c8', accent: '#7ec4cf', mood: 'day' },
    'Overcoming a fear':          { sky: '#d8c5e8', ground: '#7c5fa0', accent: '#ffd166', mood: 'twilight' },
    'Birthday quest':             { sky: '#ffe6ee', ground: '#e85d75', accent: '#ffd166', mood: 'day' },
    'Holiday / seasonal':         { sky: '#d6e9ff', ground: '#7ec4cf', accent: '#e85d75', mood: 'snow' },
    'default':                    { sky: '#ffe9d0', ground: '#ff8a5b', accent: '#e85d75', mood: 'day' }
  };

  // -------- Story template engine --------
  // Each theme has multiple page templates. We pick one or weave together.
  const themeOpenings = {
    'Bedtime & the moon': [
      "When the stars peeked out and the world grew hush, {hero} pulled the covers up tight.",
      "The moon was big and round the night {hero} couldn't fall asleep.",
      "Outside {hero}'s window, the sky turned soft as velvet."
    ],
    'Magical forest adventure': [
      "Just past the old oak tree, {hero} found a path no one had ever walked before.",
      "The forest was full of secrets, and {hero} was ready to find every one.",
      "{hero} loved the forest more than anywhere else in the world."
    ],
    'Underwater journey': [
      "{hero} held their breath, jumped in — and discovered a world made of blue.",
      "Down where the sunlight wiggled, {hero} met a fish with eyes like marbles.",
      "The sea sang a song only {hero} could hear."
    ],
    'Outer space exploration': [
      "Three… two… one… BLAST OFF! {hero}'s rocket zoomed past the moon.",
      "{hero} had always wondered what was on the other side of the stars.",
      "Far, far above the clouds, {hero} floated through a silver galaxy."
    ],
    'First day of school': [
      "{hero} stood at the gate of the big new school. Their tummy did a little flip.",
      "The school bell rang for the very first time, and {hero} was ready — almost.",
      "Today was the day {hero} had been waiting for. Or maybe worrying about."
    ],
    'Making a new friend': [
      "{hero} sat alone on the bench, watching everyone else laugh together.",
      "Sometimes the world feels very big, especially when you don't know anyone yet.",
      "Today, {hero} decided, would be the day they said hello to someone new."
    ],
    'Big sibling / new baby': [
      "Mama's belly was getting bigger, and so was {hero}'s wonder.",
      "{hero} was about to become the most important thing in the whole wide world: a big sibling.",
      "There was a tiny new person coming, and {hero} had a tiny new question: what now?"
    ],
    'Overcoming a fear': [
      "There was one thing that made {hero}'s heart go pitter-pat — and not the good kind.",
      "Some nights, {hero}'s brave got a little tired.",
      "{hero} was brave about lots of things. But not this one."
    ],
    'Birthday quest': [
      "It was {hero}'s birthday, and the very best surprise was about to begin.",
      "{hero} woke up to a curious note slipped under the door.",
      "Birthdays were magic. And this one would be the most magic of all."
    ],
    'Holiday / seasonal': [
      "The first snowflake of the year landed right on {hero}'s nose.",
      "Lights twinkled in every window, and {hero}'s heart twinkled too.",
      "Something special was in the air, and {hero} was ready to find out what."
    ],
    'default': [
      "Once upon a time, in a place not so far away, lived a child named {hero}.",
      "{hero} was no ordinary child. {heroPron_cap} was about to begin a great adventure.",
      "This is the story of {hero}, and how one small day became a very big one."
    ]
  };

  const middleBeats = [
    "Along the way, {hero} met {cast}, who beamed and waved hello.",
    "{cast} had been waiting for {hero}, and together they set off side by side.",
    "{hero} and {cast} walked and talked and laughed until their cheeks hurt.",
    "Suddenly, something stirred — a rustle, a giggle, a tiny adventure beginning.",
    "{hero} thought about {interest}, and a clever idea flickered like a candle.",
    "With a heart full of {interest}, {hero} took the next brave step.",
    "There was a wobble. There was a wonder. {hero} kept going anyway.",
    "{cast} squeezed {hero}'s hand. 'You can do this,' they whispered.",
    "The path twisted and turned, but {hero} remembered something important.",
    "A puzzle stood in the way — but {hero} had been thinking about {interest} all morning."
  ];

  const climaxByTheme = {
    'Bedtime & the moon': "The moon smiled down and tucked its silver light around {hero}'s shoulders.",
    'Magical forest adventure': "Deep in the heart of the forest, {hero} found a clearing made of golden light.",
    'Underwater journey': "At the very bottom of the sea, {hero} discovered a pearl as big as a wish.",
    'Outer space exploration': "{hero} reached out and touched a star — it was warm, and it hummed.",
    'First day of school': "By the time the bell rang again, {hero} had three new friends and one favorite color.",
    'Making a new friend': "And just like that, two strangers became something better: a we.",
    'Big sibling / new baby': "When the baby finally arrived, {hero} held a tiny finger and felt very, very tall.",
    'Overcoming a fear': "{hero} took one breath, then another, and the big scary thing got a little smaller.",
    'Birthday quest': "At the end of the trail, everyone {hero} loved was waiting — singing, smiling, glowing.",
    'Holiday / seasonal': "Snowflakes spun, songs were sung, and {hero}'s whole world felt wrapped in warmth.",
    'default': "And right there, in that perfect moment, {hero} understood something wonderful."
  };

  const endingsByOutcome = {
    'Learns to be brave': [
      "{hero} smiled. Brave wasn't a thing you were — it was a thing you did, one small step at a time.",
      "And {hero} knew, deep down, that brave had been there all along. It just needed a turn."
    ],
    'Discovers the value of kindness': [
      "{hero} learned that kindness, even the smallest kind, makes the whole world a little softer.",
      "Kindness, {hero} discovered, was a gift you could give a thousand times and never run out."
    ],
    'Makes a lasting friendship': [
      "And from that day on, {hero} and {cast} were the very best of friends — the kind that last.",
      "Friendship, {hero} learned, doesn't need a map. It just needs a hello."
    ],
    'Finds confidence in being themselves': [
      "{hero} stood a little taller. Being yourself, it turned out, was the very best thing to be.",
      "The world is full of wonderful things, and {hero} was one of them, exactly as they were."
    ],
    'Solves a clever puzzle': [
      "{hero} had done it. Sometimes the trickiest problems just need a curious mind and a quiet moment.",
      "And just like that, the puzzle was solved — and {hero} felt every bit as clever as the stars."
    ],
    'Falls peacefully asleep': [
      "{hero}'s eyes grew heavy, the world grew quiet, and dreams came rolling in like soft waves.",
      "And there, in the hush of the room, {hero} drifted off to sleep with a smile."
    ],
    'Realizes home is the best place': [
      "Of all the wonderful places {hero} had seen, home — with its warm lights and waiting hugs — was still the best.",
      "{hero} stepped through the door, and home wrapped around them like the very best blanket."
    ],
    'Celebrates with everyone they love': [
      "And there they all were — every person {hero} loved, smiling back. The day was perfect.",
      "Laughter, light, and love — {hero}'s whole heart felt full to the brim."
    ],
    'default': [
      "And {hero} closed the day with a heart full of wonder, ready for whatever tomorrow might bring.",
      "From that day on, {hero} carried a little spark of magic, wherever they went."
    ]
  };

  const titleTemplates = [
    "The Brave Tale of {hero}",
    "{hero} and the {themeWord}",
    "When {hero} Met the {themeWord}",
    "{hero}'s Big {themeWord} Day",
    "A {themeWord} for {hero}"
  ];

  const themeWord = (theme) => {
    const map = {
      'Bedtime & the moon': 'Moon',
      'Magical forest adventure': 'Forest',
      'Underwater journey': 'Deep Blue',
      'Outer space exploration': 'Stars',
      'First day of school': 'New Beginning',
      'Making a new friend': 'New Friend',
      'Big sibling / new baby': 'Tiny One',
      'Overcoming a fear': 'Big Brave',
      'Birthday quest': 'Birthday Quest',
      'Holiday / seasonal': 'Sparkly Day'
    };
    return map[theme] || 'Adventure';
  };

  // -------- Story builder --------
  function buildStory(input) {
    const heroPron = 'They';
    const hero = cap(input.heroName);
    const castList = cleanList(input.supportingCast);
    const interestList = cleanList(input.interests);
    const cast = castList.length ? castList.join(' and ') : 'a kind little friend';
    const firstCast = castList[0] || 'a kind friend';
    const interest = interestList.length ? pick(interestList) : 'big ideas';

    const themeKey = (input.theme === 'other') ? 'default' : input.theme;
    const customTheme = input.themeOther;
    const outcomeKey = (input.outcome === 'other') ? 'default' : input.outcome;
    const customOutcome = input.outcomeOther;

    const palette = themePalettes[themeKey] || themePalettes['default'];

    const subOpening = (themeOpenings[themeKey] || themeOpenings['default']);
    const subClimax = climaxByTheme[themeKey] || climaxByTheme['default'];
    const subEnding = (endingsByOutcome[outcomeKey] || endingsByOutcome['default']);

    const fmt = (s) => s
      .replace(/\{hero\}/g, hero)
      .replace(/\{heroPron_cap\}/g, heroPron)
      .replace(/\{cast\}/g, cast)
      .replace(/\{firstCast\}/g, firstCast)
      .replace(/\{interest\}/g, interest);

    // Pick a title
    let title;
    if (customTheme) {
      title = `${hero} and the ${cap(customTheme)}`;
    } else {
      title = fmt(pick(titleTemplates).replace('{themeWord}', themeWord(themeKey)));
    }

    // Pages
    const pages = [];

    // Page 1: Opening
    pages.push({ kind: 'open', text: fmt(pick(subOpening)) });

    // Page 2: Setting / introduce theme
    if (customTheme) {
      pages.push({ kind: 'setting', text: fmt(`The day was all about ${customTheme}, and ${hero} couldn't wait to see what would happen.`) });
    } else {
      pages.push({ kind: 'setting', text: fmt(pick(middleBeats)) });
    }

    // Page 3: Introduce supporting cast / interest
    pages.push({ kind: 'meet', text: fmt(pick(middleBeats)) });

    // Page 4: A challenge
    pages.push({ kind: 'challenge', text: fmt(pick(middleBeats)) });

    // Page 5: Climax
    pages.push({ kind: 'climax', text: fmt(subClimax) });

    // Page 6: Resolution beat
    if (customOutcome) {
      pages.push({ kind: 'resolution', text: fmt(`And as the story drew toward its end, ${hero} ${customOutcome}.`) });
    } else {
      pages.push({ kind: 'resolution', text: fmt(pick(subEnding)) });
    }

    // Page 7: Final ending
    pages.push({ kind: 'ending', text: fmt(pick(subEnding)) });

    // Page 8: The end
    pages.push({ kind: 'end', text: fmt(`The end. (Or maybe… just the beginning of ${hero}'s next adventure.)`) });

    return { title, pages, palette, hero, themeKey };
  }

  // -------- Illustration generators (SVG) --------
  function illoBackground(palette, mood) {
    if (mood === 'night') {
      return `
        <rect width="340" height="200" fill="${palette.sky}"/>
        <circle cx="270" cy="50" r="28" fill="#fff5d6"/>
        <circle cx="260" cy="45" r="22" fill="${palette.sky}"/>
        ${randomStars(15)}
        <path d="M0 160 Q170 120 340 160 L340 200 L0 200 Z" fill="${palette.ground}"/>
      `;
    }
    if (mood === 'forest') {
      return `
        <rect width="340" height="200" fill="${palette.sky}"/>
        <circle cx="60" cy="50" r="22" fill="#ffd166"/>
        ${treeLine(palette.ground)}
        <rect y="170" width="340" height="30" fill="${palette.ground}"/>
      `;
    }
    if (mood === 'sea') {
      return `
        <rect width="340" height="200" fill="${palette.sky}"/>
        ${bubbles(8)}
        <path d="M0 170 Q60 150 120 170 T240 170 T340 170 L340 200 L0 200 Z" fill="${palette.ground}"/>
      `;
    }
    if (mood === 'space') {
      return `
        <rect width="340" height="200" fill="${palette.sky}"/>
        ${randomStars(20)}
        <circle cx="280" cy="60" r="18" fill="#ff8a5b"/>
        <ellipse cx="280" cy="60" rx="28" ry="6" fill="none" stroke="#ffd166" stroke-width="2" transform="rotate(-15 280 60)"/>
        <path d="M0 160 Q170 130 340 160 L340 200 L0 200 Z" fill="${palette.ground}"/>
      `;
    }
    if (mood === 'twilight') {
      return `
        <rect width="340" height="200" fill="${palette.sky}"/>
        ${randomStars(8)}
        <path d="M0 150 Q170 120 340 150 L340 200 L0 200 Z" fill="${palette.ground}"/>
      `;
    }
    if (mood === 'snow') {
      return `
        <rect width="340" height="200" fill="${palette.sky}"/>
        ${snowflakes(12)}
        <path d="M0 160 Q60 140 120 155 T240 150 T340 160 L340 200 L0 200 Z" fill="#fff"/>
      `;
    }
    // day
    return `
      <rect width="340" height="200" fill="${palette.sky}"/>
      <circle cx="270" cy="40" r="22" fill="#ffd166"/>
      <path d="M260 40 L290 40 M270 25 L270 55 M255 25 L285 55 M255 55 L285 25" stroke="#ffd166" stroke-width="2" opacity="0.6"/>
      ${cloud(60, 50)} ${cloud(160, 35)}
      <path d="M0 160 Q170 140 340 160 L340 200 L0 200 Z" fill="${palette.ground}"/>
    `;
  }

  function randomStars(n) {
    let stars = '';
    for (let i = 0; i < n; i++) {
      const x = Math.random() * 340;
      const y = Math.random() * 130;
      const r = 1 + Math.random() * 1.5;
      stars += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="#fff" opacity="${0.6 + Math.random() * 0.4}"/>`;
    }
    return stars;
  }
  function snowflakes(n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = Math.random() * 340;
      const y = Math.random() * 150;
      s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="2" fill="#fff"/>`;
    }
    return s;
  }
  function bubbles(n) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = Math.random() * 340;
      const y = Math.random() * 150;
      const r = 3 + Math.random() * 6;
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
  function treeLine(color) {
    let trees = '';
    for (let i = 0; i < 6; i++) {
      const x = 30 + i * 55;
      const h = 80 + Math.random() * 30;
      trees += `
        <polygon points="${x},${170 - h} ${x - 22},${170} ${x + 22},${170}" fill="${shade(color, -10)}"/>
        <polygon points="${x},${170 - h + 25}  ${x - 18},${170 - 20}  ${x + 18},${170 - 20}" fill="${shade(color, 10)}"/>
      `;
    }
    return trees;
  }
  function shade(hex, p) {
    // simple hex shading
    const h = hex.replace('#', '');
    const num = parseInt(h, 16);
    let r = (num >> 16) + p;
    let g = ((num >> 8) & 0xff) + p;
    let b = (num & 0xff) + p;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  // Hero character — same look across pages, varies pose
  function illoHero(x, y, palette, pose) {
    const skin = '#ffd9b3';
    const hair = '#5b3a29';
    const shirt = palette.accent;
    const armUp = pose === 'wave' || pose === 'reach';
    return `
      <g transform="translate(${x}, ${y})">
        <!-- legs -->
        <rect x="-8" y="35" width="6" height="18" rx="2" fill="#3a2618"/>
        <rect x="2" y="35" width="6" height="18" rx="2" fill="#3a2618"/>
        <!-- body -->
        <rect x="-12" y="15" width="24" height="24" rx="6" fill="${shirt}"/>
        <!-- arms -->
        ${armUp
          ? `<rect x="-20" y="0" width="6" height="20" rx="3" fill="${shirt}" transform="rotate(-25 -17 10)"/>`
          : `<rect x="-18" y="18" width="6" height="18" rx="3" fill="${shirt}"/>`}
        <rect x="12" y="18" width="6" height="18" rx="3" fill="${shirt}"/>
        <!-- head -->
        <circle cx="0" cy="0" r="13" fill="${skin}"/>
        <!-- hair -->
        <path d="M-13 -2 Q-13 -16 0 -16 Q13 -16 13 -2 L11 0 Q5 -8 0 -8 Q-5 -8 -11 0 Z" fill="${hair}"/>
        <!-- face -->
        <circle cx="-4" cy="0" r="1.5" fill="#1a1a2e"/>
        <circle cx="4" cy="0" r="1.5" fill="#1a1a2e"/>
        <path d="M-3 5 Q0 7 3 5" stroke="#1a1a2e" stroke-width="1.2" fill="none" stroke-linecap="round"/>
        <circle cx="-7" cy="3" r="1.5" fill="#ff8a5b" opacity="0.5"/>
        <circle cx="7" cy="3" r="1.5" fill="#ff8a5b" opacity="0.5"/>
      </g>
    `;
  }

  // Friend / supporting cast — slightly different look
  function illoFriend(x, y, palette) {
    const skin = '#f4c2a1';
    const hair = '#c9a44a';
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

  // Cover illustration
  function makeCover(story) {
    const p = story.palette;
    return `
      <svg viewBox="0 0 340 240" xmlns="http://www.w3.org/2000/svg">
        ${illoBackground(p, p.mood)}
        ${illoHero(170, 130, p, 'wave')}
        ${illoStar(60, 40, 12, p.accent)}
        ${illoStar(290, 80, 8, '#fff')}
      </svg>
    `;
  }

  // Page-specific illustration
  function makePageIllo(page, story, idx) {
    const p = story.palette;
    const total = story.pages.length;

    let scene = illoBackground(p, p.mood);

    if (page.kind === 'open') {
      scene += illoHero(170, 130, p, 'stand');
    } else if (page.kind === 'setting') {
      scene += illoHero(120, 130, p, 'stand');
      scene += illoStar(240, 70, 14, p.accent);
    } else if (page.kind === 'meet') {
      scene += illoHero(120, 130, p, 'wave');
      scene += illoFriend(220, 130, p);
    } else if (page.kind === 'challenge') {
      scene += illoHero(170, 130, p, 'reach');
      scene += illoStar(80, 60, 10, p.accent);
      scene += illoStar(270, 60, 10, '#fff');
    } else if (page.kind === 'climax') {
      scene += illoHero(170, 125, p, 'reach');
      scene += illoStar(100, 50, 16, p.accent);
      scene += illoStar(240, 50, 16, '#fff');
      scene += illoStar(170, 30, 12, p.accent);
    } else if (page.kind === 'resolution') {
      scene += illoHero(120, 130, p, 'stand');
      scene += illoFriend(220, 130, p);
      scene += illoStar(50, 50, 8, p.accent);
    } else if (page.kind === 'ending') {
      scene += illoHero(120, 130, p, 'wave');
      scene += illoFriend(220, 130, p);
      scene += `<path d="M120 110 Q170 90 220 110" stroke="${p.accent}" stroke-width="2" fill="none" stroke-dasharray="4 3"/>`;
    } else if (page.kind === 'end') {
      scene += illoHero(170, 130, p, 'wave');
      // Heart confetti
      scene += `<text x="60" y="50" font-size="14" fill="${p.accent}">♥</text>`;
      scene += `<text x="280" y="60" font-size="12" fill="#fff">♥</text>`;
      scene += `<text x="100" y="80" font-size="10" fill="${p.accent}">★</text>`;
    }

    return `<svg viewBox="0 0 340 200" xmlns="http://www.w3.org/2000/svg">${scene}</svg>`;
  }

  // -------- Render --------
  function renderBook(story, dedication) {
    const pages = [];

    // Cover
    pages.push(`
      <div class="page-spread cover" style="background: linear-gradient(160deg, #fff5d6, #ffe9d0);">
        <div class="page-num">cover</div>
        <div class="page-illustration">${makeCover(story)}</div>
        <div class="page-text" style="font-size: 1.5rem; font-weight: 800; font-family: var(--display);">${escapeHtml(story.title)}</div>
        <div class="page-text" style="font-family: var(--script); font-size: 1.2rem; color: var(--coral); margin-top: 0.3rem;">A story for ${escapeHtml(story.hero)}</div>
      </div>
    `);

    // Dedication
    if (dedication) {
      pages.push(`
        <div class="page-spread dedication">
          <div class="page-num">dedication</div>
          <div class="page-text">${escapeHtml(dedication)}</div>
        </div>
      `);
    }

    // Story pages
    story.pages.forEach((page, i) => {
      pages.push(`
        <div class="page-spread" style="animation-delay: ${(i + 1) * 0.08}s">
          <div class="page-num">page ${i + 1}</div>
          <div class="page-illustration">${makePageIllo(page, story, i)}</div>
          <div class="page-text">${escapeHtml(page.text)}</div>
        </div>
      `);
    });

    return `
      <div class="book">
        <div class="book-header">
          <h3 class="book-title">${escapeHtml(story.title)}</h3>
          <div class="book-actions">
            <button type="button" id="newBookBtn">↻ New</button>
            <button type="button" id="printBtn">🖨 Print</button>
          </div>
        </div>
        ${pages.join('')}
        <div class="cta-row">
          <a href="#pricing" class="btn btn-secondary">Get PDF — $9</a>
          <a href="#pricing" class="btn btn-primary">Order Hardcover — $34</a>
        </div>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // -------- Submit handler --------
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = {
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

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    // Small delay for UX (so it feels like creation)
    setTimeout(() => {
      const story = buildStory(data);
      preview.innerHTML = renderBook(story, data.dedication);
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;

      // Wire up book actions
      const newBtn = document.getElementById('newBookBtn');
      const printBtn = document.getElementById('printBtn');
      if (newBtn) newBtn.addEventListener('click', () => {
        const story2 = buildStory(data);
        preview.innerHTML = renderBook(story2, data.dedication);
        rewireBtns(data);
      });
      if (printBtn) printBtn.addEventListener('click', () => window.print());

      preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 700);
  });

  function rewireBtns(data) {
    const newBtn = document.getElementById('newBookBtn');
    const printBtn = document.getElementById('printBtn');
    if (newBtn) newBtn.addEventListener('click', () => {
      const story2 = buildStory(data);
      preview.innerHTML = renderBook(story2, data.dedication);
      rewireBtns(data);
    });
    if (printBtn) printBtn.addEventListener('click', () => window.print());
  }
})();
