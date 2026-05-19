'use client';

import { useState, useMemo } from 'react';
import WordGrid from '@/components/WordGrid';
import LevelFilter from '@/components/LevelFilter';
import PosFilter from '@/components/PosFilter';
import Pagination from '@/components/Pagination';
import { getAllWords, getWordsByLevel, getLevels } from '@/lib/vocabulary';
import { Search, Sparkles } from 'lucide-react';

const WORDS_PER_PAGE = 20;

export default function HomePage() {
  const [selectedLevel, setSelectedLevel] = useState('N1');
  const [selectedPos, setSelectedPos] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const levels = getLevels();

  const filteredWords = useMemo(() => {
    let words = selectedLevel === 'all' ? getAllWords() : getWordsByLevel(selectedLevel);
    
    // Filter by POS
    if (selectedPos) {
      words = words.filter(w => w.pos.includes(selectedPos));
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      words = words.filter(
        w =>
          w.vocabulary.includes(q) ||
          w.pinyin.toLowerCase().includes(q) ||
          w.meaning_vi.toLowerCase().includes(q) ||
          w.sino_vietnamese.toLowerCase().includes(q)
      );
    }
    
    return words;
  }, [selectedLevel, selectedPos, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / WORDS_PER_PAGE));
  
  // Reset to page 1 when filter/search changes
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedWords = useMemo(() => {
    const start = (safeCurrentPage - 1) * WORDS_PER_PAGE;
    return filteredWords.slice(start, start + WORDS_PER_PAGE);
  }, [filteredWords, safeCurrentPage]);

  const handleLevelChange = (level: string) => {
    setSelectedLevel(level);
    setCurrentPage(1);
  };

  const handlePosChange = (pos: string) => {
    setSelectedPos(pos);
    setCurrentPage(1);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles size={24} className="text-[#b8845c]" />
          <h2 className="text-2xl font-bold text-[#3d3929]">Từ vựng TOCFL</h2>
        </div>
        <p className="text-[#8b7355]">
          Học {filteredWords.length} từ vựng tiếng Trung Phồn thể theo chuẩn TOCFL
          {selectedLevel !== 'all' && ` - Cấp độ ${selectedLevel}`}
        </p>
      </div>

      {/* Search + POS filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b8a88c]" />
          <input
            type="text"
            placeholder="Tìm từ vựng, pinyin, nghĩa..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#e8e0d5] bg-[#faf7f2] text-sm text-[#3d3929] placeholder-[#b8a88c] focus:outline-none focus:ring-2 focus:ring-[#b8845c]/20 focus:border-[#b8845c] transition-all"
          />
        </div>
        <PosFilter selectedPos={selectedPos} onSelectPos={handlePosChange} />
      </div>

      {/* Level filter */}
      <LevelFilter
        levels={levels}
        selectedLevel={selectedLevel}
        onSelectLevel={handleLevelChange}
      />

      {/* Word grid */}
      <WordGrid words={paginatedWords} />

      {/* Pagination */}
      <Pagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Footer */}
      <div className="mt-12 text-center text-xs text-[#b8a88c] pb-4">
        <p>🇹🇼 Học Tiếng Trung Phồn Thể — TOCFL Vocabulary & Reading & Listening</p>
        <p className="mt-1">Built with Next.js 16 · Tailwind CSS v4 · DeepSeek AI</p>
      </div>
    </div>
  );
}
