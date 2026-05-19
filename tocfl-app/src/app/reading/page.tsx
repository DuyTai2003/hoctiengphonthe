'use client';

import { useState, useMemo } from 'react';
import ReadingCard from '@/components/ReadingCard';
import Pagination from '@/components/Pagination';
import { Reading } from '@/lib/reading-types';
import { BookOpen } from 'lucide-react';

// Import data
import readingsData from '@/data/readings.json';
import vocabData from '@/data/sample_enriched.json';
import { VocabularyWord } from '@/lib/types';

const BANDS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const PER_PAGE = 5;

export default function ReadingPage() {
  const [selectedBand, setSelectedBand] = useState('A1');
  const [currentPage, setCurrentPage] = useState(1);

  const readings = readingsData as Reading[];
  const vocabulary = vocabData as VocabularyWord[];

  // Build vocabulary lookup map
  const vocabularyMap = useMemo(() => {
    const map = new Map<string, { meaning_vi: string; pinyin: string; sino_vietnamese: string }>();
    vocabulary.forEach(w => {
      map.set(w.vocabulary, {
        meaning_vi: w.meaning_vi,
        pinyin: w.pinyin,
        sino_vietnamese: w.sino_vietnamese,
      });
    });
    return map;
  }, [vocabulary]);

  const filteredReadings = useMemo(() => {
    return readings.filter(r => r.band === selectedBand);
  }, [readings, selectedBand]);

  const totalPages = Math.max(1, Math.ceil(filteredReadings.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedReadings = filteredReadings.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const bandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    BANDS.forEach(b => {
      counts[b] = readings.filter(r => r.band === b).length;
    });
    return counts;
  }, [readings]);

  const handleBandChange = (band: string) => {
    setSelectedBand(band);
    setCurrentPage(1);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={24} className="text-[#b8845c]" />
          <h2 className="text-2xl font-bold text-[#3d3929]">Luyện đọc</h2>
        </div>
        <p className="text-[#8b7355]">
          Đọc hiểu tiếng Trung Phồn thể theo chuẩn TOCFL — bấm vào từ để xem nghĩa
        </p>
      </div>

      {/* Band filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {BANDS.map(band => (
          <button
            key={band}
            onClick={() => handleBandChange(band)}
            disabled={bandCounts[band] === 0}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              selectedBand === band
                ? 'bg-[#b8845c] text-white shadow-lg shadow-[#b8845c]/20'
                : bandCounts[band] === 0
                ? 'bg-[#f5efe4] text-[#c4b89a] cursor-not-allowed border border-[#e8e0d5]'
                : 'bg-[#faf7f2] text-[#8b7355] hover:bg-[#ede4d3] border border-[#e8e0d5]'
            }`}
          >
            {band}
            <span className={`ml-1.5 text-xs ${selectedBand === band ? 'text-[#f5efe4]' : 'text-[#b8a88c]'}`}>
              ({bandCounts[band] || 0})
            </span>
          </button>
        ))}
      </div>

      {/* Reading list */}
      {filteredReadings.length === 0 ? (
        <div className="text-center py-20 text-[#b8a88c]">
          <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Chưa có bài đọc cho band {selectedBand}</p>
          <p className="text-sm mt-1">Đang sinh bài đọc bằng AI, vui lòng chờ...</p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {paginatedReadings.map(reading => (
              <ReadingCard
                key={reading.id}
                reading={reading}
                vocabularyMap={vocabularyMap}
              />
            ))}
          </div>
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
