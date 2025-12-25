
export interface LocalizedString {
  en: string;
  zh: string;
}

export interface HandSign {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  imageUrl: string;
}

export interface Jutsu {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  sequence: string[]; 
  element: 'fire' | 'water' | 'lightning' | 'earth' | 'wind' | 'neutral';
  difficulty: 'E-Rank' | 'D-Rank' | 'C-Rank' | 'B-Rank' | 'A-Rank' | 'S-Rank';
  videoUrl?: string; // URL for the Jutsu animation clip
}

export interface RecognitionResult {
  match: boolean;
  confidence: number;
  tip?: string;
}

export type Language = 'en' | 'zh';
