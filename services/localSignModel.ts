
interface Point {
  x: number;
  y: number;
  z: number;
}

const FINGER_NAMES = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
const FINGER_TIPS = [4, 8, 12, 16, 20];
const FINGER_MCP = [2, 5, 9, 13, 17];

const getDist = (p1: Point, p2: Point) => Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

const isExtended = (landmarks: Point[], fIdx: number) => {
  const palm = landmarks[0];
  const tip = landmarks[FINGER_TIPS[fIdx]];
  const mcp = landmarks[FINGER_MCP[fIdx]];
  return getDist(tip, palm) > getDist(mcp, palm) * 1.15;
};

export const getPoseDescription = (multiHandLandmarks: any[]): string => {
  if (!multiHandLandmarks || multiHandLandmarks.length === 0) return "No hands visible.";

  return multiHandLandmarks.map((hand, index) => {
    const ext = FINGER_TIPS.map((_, i) => isExtended(hand, i));
    const count = ext.filter(v => v).length;
    const upright = hand[8].y < hand[0].y;
    return `Hand ${index + 1}: ${count} fingers up (${upright ? 'Upright' : 'Flat'})`;
  }).join(' | ');
};

export const getStandardSealDefinition = (signId: string): string => {
  const definitions: Record<string, string> = {
    'tiger': "Hands joined, both index fingers and thumbs extended upward, others folded.",
    'snake': "Hands joined, all fingers interlaced and folded.",
    'ram': "Left hand fingers extended upward, covering the right hand.",
    'monkey': "Hands pressed together, palms flat, fingers horizontal.",
    'boar': "Fists pressed together, knuckles touching.",
    'horse': "Index fingers touching at tips, others interlaced.",
    'ox': "Right hand flat across the left hand back.",
    'dog': "Left hand flat on top of right fist.",
    'bird': "Tips of fingers touching in a peak.",
    'dragon': "Fingers interlaced, pinkies extended.",
    'hare': "Left hand C-shape, right index through.",
    'rat': "Right hand gripping left index/middle."
  };
  return definitions[signId] || "A standard ninja seal.";
};

export const classifySignLocally = (multiHandLandmarks: any[]): string | null => {
  if (!multiHandLandmarks || multiHandLandmarks.length === 0) return null;

  const h1 = multiHandLandmarks[0];
  const h1Ext = FINGER_TIPS.map((_, i) => isExtended(h1, i));
  const h1Count = h1Ext.filter(v => v).length;

  // Single hand signs (or fallback detection)
  if (multiHandLandmarks.length === 1) {
    if (h1Count >= 4 && !h1Ext[0]) return 'dog'; // Dog simplified
    if (h1Count <= 1) return 'boar'; // Boar simplified
    return null;
  }

  const h2 = multiHandLandmarks[1];
  const h2Ext = FINGER_TIPS.map((_, i) => isExtended(h2, i));
  const h2Count = h2Ext.filter(v => v).length;
  const dist = getDist(h1[0], h2[0]);

  // Two hand logic
  if (dist < 0.35) {
    // TIGER: 2 fingers up on each hand (index/thumb)
    if (h1Count >= 2 && h1Count <= 3 && h2Count >= 2 && h2Count <= 3 && h1Ext[1] && h2Ext[1]) return 'tiger';
    
    // RAM: Index/Middle up on primary
    if (h1Ext[1] && h1Ext[2] && h1Count <= 3) return 'ram';

    // SNAKE: Fists together/all down
    if (h1Count <= 1 && h2Count <= 1) return 'snake';

    // MONKEY: Palms flat together
    if (h1Count >= 4 && h2Count >= 4 && dist < 0.15) return 'monkey';

    // DOG: One flat (h1), one fist (h2)
    if (h1Count >= 4 && h2Count <= 1 && h1[0].y < h2[0].y) return 'dog';
    
    // OX: Both flat, one over other
    if (h1Count >= 4 && h2Count >= 4 && h1[0].y < h2[0].y) return 'ox';
  }

  return null;
};
