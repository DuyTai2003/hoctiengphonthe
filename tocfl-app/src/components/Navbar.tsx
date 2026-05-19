'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Headphones, FileText, GraduationCap } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const linkClass = (path: string) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
      isActive(path)
        ? 'text-white bg-[#b8845c] shadow-sm'
        : 'text-[#8b7355] hover:text-[#5c5340] hover:bg-[#ede4d3]'
    }`;

  return (
    <nav className="bg-[#faf7f2] border-b border-[#e8e0d5] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#b8845c] rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#3d3929] leading-tight">
                學繁體中文
              </h1>
              <p className="text-[10px] text-[#b8a88c] leading-tight">Học tiếng Trung Phồn thể</p>
            </div>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <Link href="/" className={linkClass('/')}>
              <BookOpen size={16} />
              <span className="hidden sm:inline">Từ vựng</span>
            </Link>
            <Link href="/reading" className={linkClass('/reading')}>
              <FileText size={16} />
              <span className="hidden sm:inline">Luyện đọc</span>
            </Link>
            <Link href="/listening" className={linkClass('/listening')}>
              <Headphones size={16} />
              <span className="hidden sm:inline">Luyện nghe</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
