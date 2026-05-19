'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Reading } from '@/lib/reading-types';
import { Volume2, Eye, EyeOff, ChevronDown, ChevronUp, FileText } from 'lucide-react';

// Global audio tracker - chỉ 1 audio được phát cùng lúc
let globalAudio: HTMLAudioElement | null = null;
let globalOnEnd: (() => void) | null = null;

interface ReadingCardProps {
  reading: Reading;
  vocabularyMap: Map<string, { meaning_vi: string; pinyin: string; sino_vietnamese: string }>;
}

export default function ReadingCard({ reading, vocabularyMap }: ReadingCardProps) {
  const [showPinyin, setShowPinyin] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [popupWord, setPopupWord] = useState<{ word: string; x: number; y: number } | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Tìm các từ TOCFL trong bài và bôi đậm
  const highlightedContent = useMemo(() => {
    const PUNCTUATION = /[，。？！、；：「」『』（）—…《》\s]/;
    
    const result: { char: string; isVocab: boolean; word?: string; isPunct: boolean }[] = [];
    
    // Tạo map các từ TOCFL xuất hiện trong bài
    const foundWords = new Map<string, boolean>();
    vocabularyMap.forEach((_, word) => {
      if (reading.content.includes(word)) {
        foundWords.set(word, true);
      }
    });

    // Sắp xếp từ dài trước để ưu tiên match
    const sortedWords = [...foundWords.keys()].sort((a, b) => b.length - a.length);

    let i = 0;
    while (i < reading.content.length) {
      // Kiểm tra dấu câu
      if (PUNCTUATION.test(reading.content[i])) {
        result.push({ char: reading.content[i], isVocab: false, isPunct: true });
        i++;
        continue;
      }

      let matched = false;
      for (const word of sortedWords) {
        if (reading.content.substring(i, i + word.length) === word) {
          result.push({ char: word, isVocab: true, word, isPunct: false });
          i += word.length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        result.push({ char: reading.content[i], isVocab: false, isPunct: false });
        i++;
      }
    }
    return result;
  }, [reading.content, vocabularyMap]);

  // Audio - dùng fetch Blob để bypass CORS/chặn trình duyệt
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (audioRef.current && globalAudio === audioRef.current) {
        globalAudio?.pause();
        globalAudio = null;
        globalOnEnd?.();
        globalOnEnd = null;
      }
    };
  }, []);

  const playAudio = async () => {
    // Nếu đã có audio đang phát → pause/resume
    if (audioRef.current && globalAudio === audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    // Dừng audio cũ nếu có
    if (globalAudio && globalAudio !== audioRef.current) {
      globalAudio.pause();
      globalAudio.currentTime = 0;
      globalOnEnd?.();
      globalOnEnd = null;
      globalAudio = null;
    }

    // Tạo audio mới
    try {
      setIsPlaying(true);
      const url = `/api/tts?text=${encodeURIComponent(reading.content)}`;
      const audio = new Audio(url);
      audioRef.current = audio;
      globalAudio = audio;

      const onEnd = () => {
        setIsPlaying(false);
        setAudioProgress(0);
        audioRef.current = null;
        globalAudio = null;
        globalOnEnd = null;
      };
      globalOnEnd = onEnd;

      audio.ontimeupdate = () => setAudioProgress(audio.currentTime);
      audio.onloadedmetadata = () => setAudioDuration(audio.duration);
      audio.onended = onEnd;
      audio.onerror = () => {
        setIsPlaying(false);
        audioRef.current = null;
        globalAudio = null;
        globalOnEnd = null;
      };
      await audio.play();
    } catch (err) {
      console.error('TTS failed:', err);
      setIsPlaying(false);
      audioRef.current = null;
      globalAudio = null;
      globalOnEnd = null;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioProgress(time);
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Popup
  const handleWordClick = (word: string, e: React.MouseEvent) => {
    const info = vocabularyMap.get(word);
    if (info) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setPopupWord({ word, x: rect.left, y: rect.bottom + 4 });
    }
  };

  // Quiz
  const handleAnswerSelect = (qIndex: number, option: string) => {
    if (!quizSubmitted) {
      setSelectedAnswers(prev => ({ ...prev, [qIndex]: option }));
    }
  };

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);
  };

  const correctCount = reading.questions.filter(
    (q, i) => selectedAnswers[i] === q.answer
  ).length;

  return (
    <div className="bg-[#faf7f2] rounded-2xl shadow-sm border border-[#e8e0d5] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#e8e0d5]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#ede4d3] text-[#8b7355]">
                {reading.band}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#e8dcc8] text-[#6b5c3e]">
                {reading.topic}
              </span>
            </div>
            <h3 className="text-xl font-bold text-[#3d3929]">{reading.title}</h3>
            <p className="text-sm text-[#8b7355] mt-1">{reading.title_vi}</p>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={playAudio}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isPlaying 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-[#b8845c] text-white hover:bg-[#a0734d]'
            }`}
          >
            <Volume2 size={16} />
            {isPlaying ? 'Dừng' : 'Đọc'}
          </button>
          <button
            onClick={() => setShowPinyin(!showPinyin)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showPinyin ? 'bg-[#ede4d3] text-[#8b7355]' : 'bg-[#f5efe4] text-[#b8a88c] hover:bg-[#ede4d3]'
            }`}
          >
            {showPinyin ? <EyeOff size={16} /> : <Eye size={16} />}
            Pinyin
          </button>
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showTranslation ? 'bg-[#ede4d3] text-[#8b7355]' : 'bg-[#f5efe4] text-[#b8a88c] hover:bg-[#ede4d3]'
            }`}
          >
            {showTranslation ? <EyeOff size={16} /> : <Eye size={16} />}
            Dịch
          </button>
        </div>

        {/* Audio timeline - chỉ hiện khi có duration hợp lệ */}
        {audioRef.current && audioDuration > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-[#8b7355] w-8">{formatTime(audioProgress)}</span>
            <input
              type="range"
              min={0}
              max={audioDuration || 1}
              step={0.1}
              value={audioProgress}
              onChange={handleSeek}
              className="flex-1 h-1.5 rounded-full appearance-none bg-[#e8e0d5] cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#b8845c] [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-sm"
            />
            <span className="text-xs text-[#8b7355] w-8">{formatTime(audioDuration)}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Bài đọc với từ TOCFL được bôi đậm */}
        <div className="text-lg leading-relaxed text-[#b8845c] font-medium font-tc">
          {highlightedContent.map((item, idx) => {
            if (item.isPunct) {
              return <span key={idx} className="text-[#b8845c] font-bold">{item.char}</span>;
            }
            if (item.isVocab) {
              return (
                <span
                  key={idx}
                  className="font-bold text-[#b8845c] cursor-pointer hover:bg-[#ede4d3] rounded px-0.5 transition-colors"
                  onClick={(e) => handleWordClick(item.word!, e)}
                  title={vocabularyMap.get(item.word!)?.meaning_vi}
                >
                  {item.char}
                </span>
              );
            }
            return <span key={idx}>{item.char}</span>;
          })}
        </div>

        {/* Pinyin toggle */}
        {showPinyin && (
          <div className="p-4 bg-[#f5efe4] rounded-xl text-sm text-[#8b7355] leading-relaxed">
            {reading.content_pinyin}
          </div>
        )}

        {/* Translation toggle */}
        {showTranslation && (
          <div className="p-4 bg-[#f5efe4] rounded-xl text-sm text-[#5c5340] leading-relaxed">
            {reading.content_vi}
          </div>
        )}
      </div>

      {/* Quiz section */}
      <div className="border-t border-[#e8e0d5]">
        <button
          onClick={() => setQuizOpen(!quizOpen)}
          className="w-full p-4 flex items-center justify-between text-[#8b7355] hover:bg-[#f5efe4] transition-colors"
        >
          <span className="flex items-center gap-2 font-medium">
            <FileText size={16} />
            Câu hỏi đọc hiểu ({reading.questions.length} câu)
            {quizSubmitted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#b8845c] text-white">
                {correctCount}/{reading.questions.length}
              </span>
            )}
          </span>
          {quizOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {quizOpen && (
          <div className="p-6 space-y-6">
            {reading.questions.map((q, qIdx) => (
              <div key={qIdx} className="space-y-3">
                <p className="font-medium text-[#3d3929]">
                  {qIdx + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const isSelected = selectedAnswers[qIdx] === opt[0];
                    const isCorrect = q.answer === opt[0];
                    let optClass = 'border-[#e8e0d5] hover:bg-[#f5efe4] text-[#5c5340]';
                    if (quizSubmitted) {
                      if (isCorrect) optClass = 'border-green-500 bg-green-50 text-green-700 font-medium';
                      else if (isSelected && !isCorrect) optClass = 'border-red-400 bg-red-50 text-red-700';
                      else optClass = 'border-[#e8e0d5] text-[#b8a88c]';
                    } else if (isSelected) {
                      optClass = 'border-[#b8845c] bg-[#ede4d3] text-[#5c5340] font-semibold shadow-sm';
                    }
                    return (
                      <button
                        key={opt}
                        onClick={() => handleAnswerSelect(qIdx, opt[0])}
                        disabled={quizSubmitted}
                        className={`w-full text-left p-3 rounded-xl border text-sm transition-colors ${optClass}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {quizSubmitted && (
                  <p className="text-xs text-[#8b7355] italic">{q.explanation_vi}</p>
                )}
              </div>
            ))}

            {!quizSubmitted && (
              <button
                onClick={handleQuizSubmit}
                disabled={Object.keys(selectedAnswers).length < reading.questions.length}
                className="w-full py-2.5 rounded-xl bg-[#b8845c] text-white font-medium hover:bg-[#a0734d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Nộp bài
              </button>
            )}

            {quizSubmitted && (
              <button
                onClick={() => { setQuizSubmitted(false); setSelectedAnswers({}); }}
                className="w-full py-2.5 rounded-xl border border-[#e8e0d5] text-[#8b7355] font-medium hover:bg-[#f5efe4] transition-colors"
              >
                Làm lại
              </button>
            )}
          </div>
        )}
      </div>

      {/* Word Popup */}
      {popupWord && vocabularyMap.has(popupWord.word) && (
        <div
          className="fixed z-50 bg-[#faf7f2] rounded-xl shadow-lg border border-[#d4c8b4] p-3 min-w-[180px]"
          style={{ left: Math.min(popupWord.x, window.innerWidth - 200), top: popupWord.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const info = vocabularyMap.get(popupWord.word)!;
            return (
              <>
                <p className="text-xl font-bold text-[#3d3929]">{popupWord.word}</p>
                <p className="text-sm text-[#b8845c]">{info.pinyin}</p>
                <p className="text-xs text-[#8b7355]">Hán Việt: {info.sino_vietnamese}</p>
                <p className="text-sm text-[#5c5340] font-medium mt-1">{info.meaning_vi}</p>
              </>
            );
          })()}
        </div>
      )}

      {/* Overlay to close popup */}
      {popupWord && (
        <div className="fixed inset-0 z-40" onClick={() => setPopupWord(null)} />
      )}
    </div>
  );
}
