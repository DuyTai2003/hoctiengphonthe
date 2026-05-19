import { VocabularyWord } from './types';

// Dữ liệu mẫu 50 từ N1-N2 đã được dịch sang tiếng Việt
import sampleData from '@/data/sample_enriched.json';

export function getAllWords(): VocabularyWord[] {
  return sampleData as VocabularyWord[];
}

export function getWordsByLevel(level: string): VocabularyWord[] {
  return (sampleData as VocabularyWord[]).filter(w => w.id.startsWith(level));
}

export function getWordById(id: string): VocabularyWord | undefined {
  return (sampleData as VocabularyWord[]).find(w => w.id === id);
}

export function getLevels(): { code: string; name: string; name_en: string; count: number }[] {
  const levels = [
    { code: 'N1', name: '準備級一級', name_en: 'Novice 1', count: 0 },
    { code: 'N2', name: '準備級二級', name_en: 'Novice 2', count: 0 },
    { code: 'A1', name: '入門級', name_en: 'Level 1', count: 0 },
    { code: 'A2', name: '基礎級', name_en: 'Level 2', count: 0 },
    { code: 'B1', name: '進階級', name_en: 'Level 3', count: 0 },
    { code: 'B2', name: '高階級', name_en: 'Level 4', count: 0 },
    { code: 'C1', name: '流利級', name_en: 'Level 5', count: 0 },
  ];
  
  const words = sampleData as VocabularyWord[];
  levels.forEach(l => {
    l.count = words.filter(w => w.id.startsWith(l.code)).length;
  });
  
  return levels;
}
