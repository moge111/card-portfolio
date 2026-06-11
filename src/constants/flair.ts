const base = import.meta.env.BASE_URL + 'flair/';

export const FLAIR: Record<string, string[]> = {
  'Pokemon': ['charizard', 'pikachu', 'gengar', 'eevee', 'snorlax', 'mewtwo', 'gyarados', 'dragonite'].map((n) => base + n + '.png'),
  'One Piece': ['luffy', 'zoro', 'chopper'].map((n) => base + n + '.png'),
  'Naruto': ['naruto', 'kakashi'].map((n) => base + n + '.png'),
};

export const FLAIR_HERO = {
  pikachu: base + 'pikachu.png',
  charizard: base + 'charizard.png',
  snorlax: base + 'snorlax.png',
  chopper: base + 'chopper.png',
  eevee: base + 'eevee.png',
  naruto: base + 'naruto.png',
  luffy: base + 'luffy.png',
  gengar: base + 'gengar.png',
  dragonite: base + 'dragonite.png',
  mewtwo: base + 'mewtwo.png',
  kakashi: base + 'kakashi.png',
  zoro: base + 'zoro.png',
};
