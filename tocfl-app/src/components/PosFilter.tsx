'use client';

import { Tag } from 'lucide-react';

const POS_OPTIONS = [
  { value: '', label: 'Tất cả từ loại' },
  { value: 'N', label: 'N - Danh từ' },
  { value: 'V', label: 'V - Động từ' },
  { value: 'Vs', label: 'Vs - Tính từ' },
  { value: 'Adv', label: 'Adv - Trạng từ' },
  { value: 'Conj', label: 'Conj - Liên từ' },
  { value: 'Ptc', label: 'Ptc - Trợ từ' },
  { value: 'M', label: 'M - Lượng từ' },
  { value: 'Det', label: 'Det - Hạn định từ' },
  { value: 'Prep', label: 'Prep - Giới từ' },
  { value: 'Vaux', label: 'Vaux - Trợ động từ' },
  { value: 'Vi', label: 'Vi - Nội động từ' },
  { value: 'Vst', label: 'Vst - Động từ trạng thái' },
  { value: 'Vp', label: 'Vp - Động từ ghép' },
  { value: 'V-sep', label: 'V-sep - Động từ ly hợp' },
];

interface PosFilterProps {
  selectedPos: string;
  onSelectPos: (pos: string) => void;
}

export default function PosFilter({ selectedPos, onSelectPos }: PosFilterProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Tag size={16} className="text-[#b8a88c]" />
      <select
        value={selectedPos}
        onChange={(e) => onSelectPos(e.target.value)}
        className="px-3 py-2 rounded-xl border border-[#e8e0d5] bg-[#faf7f2] text-sm text-[#3d3929] focus:outline-none focus:ring-2 focus:ring-[#b8845c]/20 focus:border-[#b8845c] transition-all cursor-pointer appearance-none pr-8"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b7355' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
        }}
      >
        {POS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
