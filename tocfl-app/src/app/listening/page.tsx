'use client';

import { useState, useEffect, useRef } from 'react';
import { Headphones, Play, Pause, SkipBack, SkipForward, Eye, EyeOff, ListMusic, ChevronRight } from 'lucide-react';
import vocabData from '@/data/sample_enriched.json';
import { VocabularyWord } from '@/lib/types';

interface Sub { start: number; end: number; text: string; }
interface PodcastInfo { id:string; title:string; titleVi:string; youtubeUrl:string; youtubeId:string; topic:string; }

export default function ListeningPage() {
  const [podcasts, setPodcasts] = useState<PodcastInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [subsVi, setSubsVi] = useState<string[]>([]);
  const [showVi, setShowVi] = useState(false);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [popup, setPopup] = useState<{w:string;x:number;y:number}|null>(null);
  const [userScrolling, setUserScrolling] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const playerReady = useRef(false);

  const vocab = vocabData as VocabularyWord[];
  const vmap = useRef<Map<string,{meaning_vi:string;pinyin:string;sino_vietnamese:string}>>(new Map());
  useEffect(() => {
    const m = new Map<string,{meaning_vi:string;pinyin:string;sino_vietnamese:string}>();
    vocab.forEach(w => m.set(w.vocabulary,{meaning_vi:w.meaning_vi,pinyin:w.pinyin,sino_vietnamese:w.sino_vietnamese}));
    vmap.current = m;
  }, [vocab]);

  // Load danh sách podcast
  useEffect(() => {
    fetch('/podcasts/list.json').then(r=>r.json()).then((data:PodcastInfo[]) => {
      setPodcasts(data.filter(p => p.youtubeId)); // chỉ hiện podcast có video
    }).catch(e=>console.error('Load podcasts error:', e));
  }, []);

  const selected = podcasts.find(p => p.id === selectedId);

  // Load transcript khi chọn podcast
  useEffect(() => {
    if (!selectedId) return;
    setSubs([]); setSubsVi([]); setTime(0); setPlaying(false);
    fetch(`/podcasts/${selectedId}/transcript.txt`).then(r=>r.text()).then(parseSRT).then(setSubs).catch(()=>{});
    fetch(`/podcasts/${selectedId}/transcript_vi.txt`).then(r=>r.text()).then(t=>setSubsVi(t.split('\n').filter(l=>l.trim()))).catch(()=>{});
  }, [selectedId]);

  // YouTube IFrame API
  useEffect(() => {
    if (!selected?.youtubeId) return;
    playerReady.current = false;

    if (!(window as any).onYouTubeIframeAPIReady) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      // Destroy player cũ nếu có
      if ((window as any).__ytPlayer?.destroy) {
        (window as any).__ytPlayer.destroy();
      }
      (window as any).__ytPlayer = new (window as any).YT.Player('yt-player', {
        videoId: selected.youtubeId,
        events: {
          onReady: () => { playerReady.current = true; },
          onStateChange: (e: any) => setPlaying(e.data === 1),
        },
      });
    };

    if ((window as any).YT?.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    const timer = setInterval(() => {
      const player = (window as any).__ytPlayer;
      if (player?.getCurrentTime) {
        const t = player.getCurrentTime();
        if (typeof t === 'number') setTime(t);
      }
    }, 200);

    return () => clearInterval(timer);
  }, [selected?.youtubeId]);

  const parseSRT = (srt:string):Sub[] => {
    return srt.trim().split('\n\n').map(b=>{
      const l=b.split('\n'); if(l.length<3) return null;
      const m=l[1].match(/(\d+):(\d+):(\d+)[.,](\d+)\s*-->\s*(\d+):(\d+):(\d+)[.,](\d+)/);
      if(!m) return null;
      return {start: +m[1]*3600 + +m[2]*60 + +m[3] + +m[4]/1000, end: +m[5]*3600 + +m[6]*60 + +m[7] + +m[8]/1000, text: l.slice(2).join(' ').replace(/<[^>]+>/g,'').trim()};
    }).filter(Boolean) as Sub[];
  };

  const activeIdx = subs.findIndex(s=>time>=s.start&&time<=s.end);
  
  const [range, setRange] = useState({s:0,e:40});
  useEffect(()=>{
    if(!subs.length) return;
    const c = Math.max(0, activeIdx >= 0 ? activeIdx : 0);
    setRange(prev => {
      const margin = 5;
      if (c < prev.s + margin || c > prev.e - margin) {
        return {s: Math.max(0, c - 20), e: Math.min(subs.length, c + 20)};
      }
      return prev;
    });
  },[activeIdx, subs.length]);

  const scrollRaf = useRef<number>(0);
  useEffect(()=>{
    if (!listRef.current || activeIdx < 0 || userScrolling) return;
    const container = listRef.current;
    const wrapper = container.children[0] as HTMLElement;
    if (!wrapper) return;
    const idx = activeIdx - range.s;
    const el = wrapper.children[idx] as HTMLElement;
    if (!el) return;
    
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      const containerHeight = container.getBoundingClientRect().height;
      const targetScroll = container.scrollTop + el.getBoundingClientRect().top - container.getBoundingClientRect().top - containerHeight * 0.35;
      container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    });
  },[activeIdx, range.s, userScrolling]);

  const post = (cmd:string,args:any[]=[]) => {
    const player = (window as any).__ytPlayer;
    if (player?.[cmd]) (player[cmd] as Function)(...args);
  };
  const seek = (t:number) => { setTime(t); post('seekTo',[t,true]); };

  const hl = (text:string) => {
    const sorted=[...vmap.current.keys()].sort((a,b)=>b.length-a.length);
    const p:{text:string;v:boolean}[]=[]; let i=0;
    while(i<text.length){ let m=false; for(const w of sorted){ if(text.substring(i,i+w.length)===w){ p.push({text:w,v:true}); i+=w.length; m=true; break; } } if(!m){ p.push({text:text[i],v:false}); i++; } }
    return p;
  };

  const fmt = (s:number) => { if(!isFinite(s)||s<0) return '0:00'; const m=Math.floor(s/60); return `${m}:${Math.floor(s%60).toString().padStart(2,'0')}`; };

  // === VIEW: Danh sách podcast (chưa chọn) ===
  if (!selected) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8"><Headphones size={24} className="text-[#b8845c]"/><h2 className="text-2xl font-bold text-[#3d3929]">Luyện nghe</h2></div>
        <div className="grid gap-3">
          {podcasts.length === 0 && (
            <div className="text-center py-16 text-[#b8a88c]">
              <ListMusic size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg">Chưa có podcast nào</p>
              <p className="text-sm mt-1">Thêm file transcript vào thư mục public/podcasts/ep01/...</p>
            </div>
          )}
          {podcasts.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className="flex items-center gap-4 p-4 bg-[#faf7f2] rounded-xl border border-[#e8e0d5] hover:border-[#b8845c] hover:bg-[#f5efe4] transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-lg bg-[#ede4d3] flex items-center justify-center flex-shrink-0 group-hover:bg-[#b8845c] transition-colors">
                <Play size={20} className="text-[#b8845c] group-hover:text-white transition-colors ml-0.5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#3d3929] truncate">{p.title || p.id.toUpperCase()}</h3>
                <p className="text-sm text-[#8b7355] truncate">{p.titleVi || 'Chưa có tiêu đề'}</p>
              </div>
              <ChevronRight size={20} className="text-[#d4c8b4] group-hover:text-[#b8845c] transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // === VIEW: Player + Transcript ===
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setSelectedId(null)} className="text-[#b8845c] hover:text-[#8b7355] transition-colors flex items-center gap-1 text-sm">
          <ChevronRight size={16} className="rotate-180" /> Danh sách
        </button>
        <span className="text-[#d4c8b4]">|</span>
        <Headphones size={20} className="text-[#b8845c]"/>
        <h2 className="text-xl font-bold text-[#3d3929] truncate">{selected.title}</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="relative pt-[56.25%] bg-black rounded-xl overflow-hidden">
            <iframe id="yt-player" ref={iframeRef} src={`https://www.youtube.com/embed/${selected.youtubeId}?enablejsapi=1&controls=1&rel=0&origin=http://localhost:3000`} className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media" allowFullScreen/>
          </div>
          <div className="bg-[#faf7f2] rounded-xl border border-[#e8e0d5] p-4">
            <h3 className="font-semibold text-[#3d3929] mb-1">{selected.title}</h3>
            <p className="text-sm text-[#8b7355] mb-3">{selected.titleVi}</p>
            <div className="flex items-center gap-3">
              <button onClick={()=>seek(Math.max(0,time-10))} className="p-2 text-[#8b7355] hover:text-[#3d3929]"><SkipBack size={20}/></button>
              <button onClick={()=>{ if(playing) post('pauseVideo'); else post('playVideo'); setPlaying(!playing); }} className="p-3 bg-[#b8845c] text-white rounded-full hover:bg-[#a0734d]">{playing?<Pause size={24}/>:<Play size={24}/>}</button>
              <button onClick={()=>seek(time+10)} className="p-2 text-[#8b7355] hover:text-[#3d3929]"><SkipForward size={20}/></button>
              <span className="text-sm text-[#8b7355] ml-auto">{fmt(time)}</span>
            </div>
            <input type="range" min={0} max={subs.length>0?subs[subs.length-1]?.end||100:100} step={0.1} value={time} onChange={e=>seek(parseFloat(e.target.value))}
              className="w-full mt-3 h-1.5 rounded-full appearance-none bg-[#e8e0d5] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#b8845c]"/>
          </div>
          {/* Danh sách podcast khác */}
          <div className="bg-[#faf7f2] rounded-xl border border-[#e8e0d5] p-4">
            <h3 className="text-xs font-semibold text-[#8b7355] uppercase mb-3 flex items-center gap-2"><ListMusic size={14}/> Tập khác</h3>
            <div className="space-y-1 max-h-[30vh] overflow-y-auto">
              {podcasts.filter(p=>p.id!==selectedId).map(p=>(
                <button key={p.id} onClick={()=>setSelectedId(p.id)} className="w-full text-left p-2 rounded-lg hover:bg-[#f5efe4] transition-colors text-sm text-[#5c5340] truncate block">{p.title || p.id.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-[#faf7f2] rounded-xl border border-[#e8e0d5] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#e8e0d5] bg-[#faf7f2] sticky top-0 z-10">
              <h3 className="text-sm font-semibold text-[#8b7355] uppercase">Transcript</h3>
              <button onClick={()=>setShowVi(!showVi)} className={`text-xs px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${showVi?'bg-[#ede4d3] text-[#8b7355]':'bg-[#f5efe4] text-[#b8a88c] hover:bg-[#ede4d3]'}`}>{showVi?<EyeOff size={14}/>:<Eye size={14}/>} Dịch</button>
            </div>
            <div className="p-4 overflow-y-auto" style={{ height: '65vh', scrollBehavior: 'smooth' }} ref={listRef}>
            <div className="space-y-2 font-tc">
              {subs.slice(range.s,range.e).map((s,i)=>{const ri=range.s+i; const act=ri===activeIdx; return (
                <div key={ri} className={`p-2 rounded-lg cursor-pointer transition-colors ${act?'bg-[#ede4d3]':'hover:bg-[#f5efe4]'}`} onClick={()=>seek(s.start)}>
                  <span className="text-xs text-[#b8a88c] mr-2">{fmt(s.start)}</span>
                  <span className={`text-[#b8845c] leading-relaxed ${act?'font-bold':'font-medium'}`}>
                    {hl(s.text).map((p,j)=>p.v?(
                      <span key={j} className="font-bold text-[#b8845c] cursor-pointer hover:bg-[#e8dcc8] rounded px-0.5" onClick={e=>{e.stopPropagation(); const info=vmap.current.get(p.text); if(info){const r=(e.target as HTMLElement).getBoundingClientRect(); setPopup({w:p.text,x:r.left,y:r.bottom+4});}}}>{p.text}</span>
                    ):<span key={j}>{p.text}</span>)}
                  </span>
                  {showVi&&subsVi[ri]&&<p className="text-sm text-[#8b7355] mt-1 pl-8">{subsVi[ri]}</p>}
                </div>
              )})}
            </div>
            </div>
          </div>
        </div>
      </div>
      {popup&&vmap.current.has(popup.w)&&(<><div className="fixed inset-0 z-40" onClick={()=>setPopup(null)}/><div className="fixed z-50 bg-[#faf7f2] rounded-xl shadow-lg border border-[#d4c8b4] p-3 min-w-[180px]" style={{left:Math.min(popup.x,window.innerWidth-200),top:popup.y}}>{(()=>{const i=vmap.current.get(popup.w)!; return <><p className="text-xl font-bold text-[#3d3929]">{popup.w}</p><p className="text-sm text-[#b8845c]">{i.pinyin}</p><p className="text-xs text-[#8b7355]">Hán Việt: {i.sino_vietnamese}</p><p className="text-sm text-[#5c5340] font-medium mt-1">{i.meaning_vi}</p></>})()}</div></>)}
    </div>
  );
}
