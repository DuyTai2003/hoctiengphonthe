'use client';

import { useState } from 'react';
import { VocabularyWord } from '@/lib/types';
import { Volume2, ChevronDown, ChevronUp } from 'lucide-react';

const POS_LABELS: Record<string, string> = {
  N: 'Danh từ',
  V: 'Động từ',
  Vi: 'Nội động từ',
  Vt: 'Ngoại động từ',
  Vs: 'Tính từ',
  Vst: 'Tĩnh từ',
  Vp: 'Động từ ghép',
  Vaux: 'Trợ động từ',
  'V-sep': 'Động từ ly hợp',
  'Vs-pred': 'Tính từ vị ngữ',
  Adv: 'Trạng từ',
  Conj: 'Liên từ',
  Ptc: 'Trợ từ',
  Det: 'Hạn định từ',
  M: 'Lượng từ',
  Prep: 'Giới từ',
  Pron: 'Đại từ',
  Num: 'Số từ',
  Int: 'Thán từ',
  Pref: 'Tiền tố',
  Suff: 'Hậu tố',
};

interface WordCardProps {
  word: VocabularyWord;
}

export default function WordCard({ word }: WordCardProps) {
  const [expanded, setExpanded] = useState(false);

  const playAudio = async () => {
    try {
      const url = `/api/tts?text=${encodeURIComponent(word.vocabulary)}`;
      const audio = new Audio(url);
      await audio.play();
    } catch (err) {
      console.error('TTS failed:', err);
    }
  };

  return (
    <div className="bg-[#faf7f2] rounded-2xl shadow-sm border border-[#e8e0d5] overflow-hidden hover:shadow-md hover:border-[#d4c8b4] transition-all duration-300">
      {/* Main card */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-[#3d3929]">
              {word.vocabulary}
            </span>
            <button
              onClick={playAudio}
              className="p-2 rounded-full hover:bg-[#e8d5c4] text-[#b8845c] transition-colors"
              title="Phát âm"
            >
              <Volume2 size={20} />
            </button>
          </div>
          {word.level_code && (
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-[#ede4d3] text-[#8b7355]">
              {word.level_code}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-lg text-[#b8845c] font-medium">{word.pinyin}</p>
          
          <div className="flex flex-wrap gap-2">
            {word.pos.map((p, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-[#ede4d3] text-[#8b7355]">
                {p} ({POS_LABELS[p] || p})
              </span>
            ))}
            <span className="text-xs px-2 py-0.5 rounded bg-[#e8dcc8] text-[#6b5c3e]">
              Hán Việt: {word.sino_vietnamese}
            </span>
          </div>

          <p className="text-base text-[#5c5340] font-medium">{word.meaning_vi}</p>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-sm text-[#b8a88c] hover:text-[#8b7355] transition-colors"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {expanded ? 'Thu gọn' : 'Xem ví dụ'}
        </button>
      </div>

      {/* Example section */}
      {expanded && (
        <div className="border-t border-[#e8e0d5] bg-[#f5efe4] p-5 space-y-3">
          <div>
            <p className="text-xs font-medium text-[#b8a88c] uppercase mb-1">Câu ví dụ</p>
            <p className="text-lg text-[#3d3929]">{word.example}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#b8a88c] uppercase mb-1">Phiên âm</p>
            <p className="text-sm text-[#b8845c]">{word.example_pinyin}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#b8a88c] uppercase mb-1">Nghĩa</p>
            <p className="text-sm text-[#5c5340]">{word.example_meaning_vi}</p>
          </div>
        </div>
      )}
    </div>
  );
}
