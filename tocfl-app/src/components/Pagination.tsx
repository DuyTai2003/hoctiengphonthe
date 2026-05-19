'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const [jumpInput, setJumpInput] = useState('');

  if (totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJump = () => {
    const page = parseInt(jumpInput);
    if (page >= 1 && page <= totalPages) {
      handlePageChange(page);
      setJumpInput('');
    }
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    const delta = 2; // pages to show around current

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > delta + 2) pages.push('...');
      
      const start = Math.max(2, currentPage - delta);
      const end = Math.min(totalPages - 1, currentPage + delta);
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - delta - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
      {/* Info */}
      <p className="text-sm text-[#8b7355]">
        Trang {currentPage} / {totalPages}
      </p>

      {/* Page buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg text-[#8b7355] hover:bg-[#ede4d3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        {getPageNumbers().map((page, i) =>
          page === '...' ? (
            <span key={`dots-${i}`} className="px-2 text-[#b8a88c] text-sm">...</span>
          ) : (
            <button
              key={page}
              onClick={() => handlePageChange(page as number)}
              className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentPage === page
                  ? 'bg-[#b8845c] text-white shadow-sm'
                  : 'text-[#8b7355] hover:bg-[#ede4d3]'
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg text-[#8b7355] hover:bg-[#ede4d3] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Jump to page */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={totalPages}
          value={jumpInput}
          onChange={(e) => setJumpInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJump()}
          placeholder="#"
          className="w-14 h-9 text-center text-sm rounded-lg border border-[#e8e0d5] bg-[#faf7f2] text-[#3d3929] focus:outline-none focus:ring-2 focus:ring-[#b8845c]/20 focus:border-[#b8845c] transition-all"
        />
        <button
          onClick={handleJump}
          className="px-3 h-9 text-sm font-medium rounded-lg bg-[#ede4d3] text-[#8b7355] hover:bg-[#e8dcc8] transition-colors"
        >
          Đến
        </button>
      </div>
    </div>
  );
}
