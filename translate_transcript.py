"""
Dịch transcript SRT sang tiếng Việt bằng DeepSeek API
Dùng chung key từ .env
"""
import json
import os
import time
import requests
from pathlib import Path

BASE_DIR = Path(__file__).parent

def load_api_key():
    env_file = BASE_DIR / '.env'
    if not env_file.exists():
        return None
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('DEEPSEEK_API_KEY='):
                key = line.split('=', 1)[1].strip()
                if key and key != 'sk-your-api-key-here':
                    return key
    return None

def parse_srt(text: str) -> list[str]:
    """Trích xuất text từ file SRT hoặc plain text có timestamp"""
    import re
    
    # Thử parse SRT format trước
    blocks = text.strip().split('\n\n')
    if len(blocks) >= 2:
        sample = blocks[0]
        parts = sample.split('\n')
        if len(parts) >= 3 and '-->' in parts[1]:
            # SRT format
            lines = []
            for block in blocks:
                parts = block.split('\n')
                if len(parts) >= 3:
                    content = ' '.join(parts[2:]).strip()
                    content = re.sub(r'<[^>]+>', '', content)
                    if content.strip():
                        lines.append(content.strip())
            return lines
    
    # Plain text format: mỗi dòng "timestamp text" hoặc chỉ "text"
    lines = []
    for line in text.strip().split('\n'):
        line = line.strip()
        if not line:
            continue
        # Bỏ timestamp nếu có (dạng 0:00, 00:00, 0:00:00)
        line = re.sub(r'^[\d:,.]+\s+', '', line)
        line = re.sub(r'<[^>]+>', '', line)
        if line.strip():
            lines.append(line.strip())
    return lines

def translate_lines(api_key: str, lines: list[str], batch_size: int = 20) -> list[str]:
    """Dịch danh sách dòng sang tiếng Việt"""
    translated = []
    total = len(lines)
    
    for i in range(0, total, batch_size):
        batch = lines[i:i+batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total + batch_size - 1) // batch_size
        
        # Tạo text để dịch
        text_to_translate = '\n---\n'.join(batch)
        
        system_prompt = """Bạn là chuyên gia dịch thuật Trung-Việt, chuyên dịch nội dung Đài Loan.
Dịch các dòng sau sang tiếng Việt TỰ NHIÊN, CHUẨN NGỮ CẢNH, đúng chính tả.
Giữ nguyên định dạng: mỗi dòng dịch tương ứng 1 dòng gốc, phân cách bằng ---.
CHỈ trả về bản dịch, không thêm gì khác."""

        print(f"  Dịch batch {batch_num}/{total_batches} ({len(batch)} dòng)...", end=' ', flush=True)
        
        try:
            resp = requests.post(
                'https://api.deepseek.com/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': 'deepseek-chat',
                    'temperature': 0,
                    'max_tokens': 4096,
                    'messages': [
                        {'role': 'system', 'content': system_prompt},
                        {'role': 'user', 'content': text_to_translate},
                    ],
                },
                timeout=60,
            )
            resp.raise_for_status()
            result = resp.json()
            content = result['choices'][0]['message']['content'].strip()
            
            # Tách lại thành từng dòng
            vi_lines = [l.strip() for l in content.split('---') if l.strip()]
            
            # Đảm bảo số lượng khớp
            while len(vi_lines) < len(batch):
                vi_lines.append('')
            vi_lines = vi_lines[:len(batch)]
            
            translated.extend(vi_lines)
            print(f"✅")
            
        except Exception as e:
            print(f"❌ {e}")
            translated.extend([''] * len(batch))
        
        if i + batch_size < total:
            time.sleep(0.5)
    
    return translated

def main():
    api_key = load_api_key()
    if not api_key:
        print("❌ Không tìm thấy API key")
        return
    
    # Tìm tất cả thư mục podcast
    podcasts_dir = BASE_DIR / 'tocfl-app' / 'public' / 'podcasts'
    for ep_dir in sorted(podcasts_dir.iterdir()):
        if not ep_dir.is_dir() or not ep_dir.name.startswith('ep'):
            continue
        
        transcript_file = ep_dir / 'transcript.txt'
        vi_file = ep_dir / 'transcript_vi.txt'
        
        if not transcript_file.exists():
            continue
        
        if vi_file.exists():
            print(f"  {ep_dir.name}: Đã có bản dịch, bỏ qua")
            continue
        
        print(f"\n📝 {ep_dir.name}: Đang dịch...")
        
        with open(transcript_file, 'r', encoding='utf-8') as f:
            srt_text = f.read()
        
        lines = parse_srt(srt_text)
        print(f"  Tổng: {len(lines)} dòng")
        
        vi_lines = translate_lines(api_key, lines)
        
        with open(vi_file, 'w', encoding='utf-8') as f:
            for line in vi_lines:
                f.write(line + '\n')
        
        print(f"  ✅ Đã lưu {len(vi_lines)} dòng dịch vào {vi_file.name}")

if __name__ == '__main__':
    main()
