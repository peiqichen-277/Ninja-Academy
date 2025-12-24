
import { HandSign, Jutsu } from './types';

// Using accurate hand seal illustrations for training
export const HAND_SIGNS: Record<string, HandSign> = {
  'snake': {
    id: 'snake',
    name: { en: 'Snake (Mi)', zh: '巳 (蛇)' },
    description: { en: 'Interlace all fingers of both hands.', zh: '双手手指交叉叠放。' },
    imageUrl: 'https://raw.githubusercontent.com/the-muda-organization/naruto-hand-signs/master/public/images/snake.png'
  },
  'ram': {
    id: 'ram',
    name: { en: 'Ram (Hitsuji)', zh: '未 (羊)' },
    description: { en: 'Extend index and middle fingers of both hands, with left covering right.', zh: '竖起中指和食指，左手放在右手上面。' },
    imageUrl: 'https://raw.githubusercontent.com/the-muda-organization/naruto-hand-signs/master/public/images/ram.png'
  },
  'monkey': {
    id: 'monkey',
    name: { en: 'Monkey (Saru)', zh: '申 (猴)' },
    description: { en: 'Right hand flat on top of left hand palm.', zh: '右手平放在左手掌心上。' },
    imageUrl: 'https://raw.githubusercontent.com/the-muda-organization/naruto-hand-signs/master/public/images/monkey.png'
  },
  'boar': {
    id: 'boar',
    name: { en: 'Boar (I)', zh: '亥 (猪)' },
    description: { en: 'Form fists and press the knuckles together.', zh: '握紧双拳，手心向下，指关节相对。' },
    imageUrl: 'https://raw.githubusercontent.com/the-muda-organization/naruto-hand-signs/master/public/images/boar.png'
  },
  'horse': {
    id: 'horse',
    name: { en: 'Horse (Uma)', zh: '午 (马)' },
    description: { en: 'Extend index fingers and press them together.', zh: '双手食指相对，其余手指交叉。' },
    imageUrl: 'https://raw.githubusercontent.com/the-muda-organization/naruto-hand-signs/master/public/images/horse.png'
  },
  'tiger': {
    id: 'tiger',
    name: { en: 'Tiger (Tora)', zh: '寅 (虎)' },
    description: { en: 'Clasp hands together and extend index and thumb.', zh: '双手合十，拇指和食指并拢竖起。' },
    imageUrl: 'https://raw.githubusercontent.com/the-muda-organization/naruto-hand-signs/master/public/images/tiger.png'
  },
  'ox': {
    id: 'ox',
    name: { en: 'Ox (Ushi)', zh: '丑 (牛)' },
    description: { en: 'Right hand fingers on top of left hand flat fingers.', zh: '右手横放，左手手指伸直按在右手背。' },
    imageUrl: 'https://raw.githubusercontent.com/the-muda-organization/naruto-hand-signs/master/public/images/ox.png'
  },
  'dog': {
    id: 'dog',
    name: { en: 'Dog (Inu)', zh: '戌 (狗)' },
    description: { en: 'Place left hand flat on top of right fist.', zh: '左手平放在右拳上方。' },
    imageUrl: 'https://raw.githubusercontent.com/the-muda-organization/naruto-hand-signs/master/public/images/dog.png'
  },
  'bird': {
    id: 'bird',
    name: { en: 'Bird (Tori)', zh: '酉 (鸟)' },
    description: { en: 'Touch the tips of your fingers together in an angular shape.', zh: '双手手指交叉，食指和拇指形成三角形尖角。' },
    imageUrl: 'https://raw.githubusercontent.com/the-muda-organization/naruto-hand-signs/master/public/images/bird.png'
  }
};

export const JUTSU_LIST: Jutsu[] = [
  {
    id: 'chidori',
    name: { en: 'Chidori', zh: '雷遁·千鸟' },
    description: { en: 'Concentrates lightning chakra into the palm.', zh: '将大量查克拉集中在手上形成高强度电流。' },
    sequence: ['ox', 'ram', 'monkey'],
    element: 'lightning',
    difficulty: 'A-Rank'
  },
  {
    id: 'summoning',
    name: { en: 'Summoning Jutsu', zh: '通灵之术' },
    description: { en: 'A space-time ninjutsu that allows the user to summon animals.', zh: '时空间忍术，允许忍者召唤与其签订契约的生物。' },
    sequence: ['boar', 'dog', 'bird', 'monkey', 'ram'],
    element: 'neutral',
    difficulty: 'B-Rank'
  },
  {
    id: 'fireball',
    name: { en: 'Great Fireball Technique', zh: '火遁·豪火球之术' },
    description: { en: 'A powerful technique that kneads chakra into fire.', zh: '将查克拉转化为火焰，从口中吐出巨大的火球。' },
    sequence: ['snake', 'ram', 'monkey', 'boar', 'horse', 'tiger'],
    element: 'fire',
    difficulty: 'C-Rank'
  }
];
