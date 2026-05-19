'use client';

import { VocabularyWord } from '@/lib/types';
import WordCard from './WordCard';

interface WordGridProps {
  words: VocabularyWord[];
}

export default function WordGrid({ words }: WordGridProps) {
  if (words.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">Chưa có từ vựng nào</p>
        <p className="text-sm mt-1">Chọn một cấp độ để bắt đầu học</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {words.map((word) => (
        <WordCard key={word.id} word={word} />
      ))}
    </div>
  );
}
