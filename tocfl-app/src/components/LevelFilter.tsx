'use client';

import { BookOpen } from 'lucide-react';

interface LevelFilterProps {
  levels: { code: string; name: string; name_en: string; count: number }[];
  selectedLevel: string;
  onSelectLevel: (level: string) => void;
}

export default function LevelFilter({ levels, selectedLevel, onSelectLevel }: LevelFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onSelectLevel('all')}
        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
          selectedLevel === 'all'
            ? 'bg-[#b8845c] text-white shadow-lg shadow-[#b8845c]/20'
            : 'bg-[#faf7f2] text-[#8b7355] hover:bg-[#ede4d3] border border-[#e8e0d5]'
        }`}
      >
        <BookOpen size={16} />
        Tất cả
      </button>
      {levels.map((level) => (
        <button
          key={level.code}
          onClick={() => onSelectLevel(level.code)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            selectedLevel === level.code
              ? 'bg-[#b8845c] text-white shadow-lg shadow-[#b8845c]/20'
              : level.count === 0
              ? 'bg-[#f5efe4] text-[#c4b89a] cursor-not-allowed border border-[#e8e0d5]'
              : 'bg-[#faf7f2] text-[#8b7355] hover:bg-[#ede4d3] border border-[#e8e0d5]'
          }`}
          disabled={level.count === 0}
        >
          <span className="font-semibold">{level.code}</span>
          <span className="mx-1 opacity-50">·</span>
          <span>{level.name}</span>
          <span className={`ml-1.5 text-xs ${selectedLevel === level.code ? 'text-[#f5efe4]' : 'text-[#b8a88c]'}`}>
            ({level.count})
          </span>
        </button>
      ))}
    </div>
  );
}
