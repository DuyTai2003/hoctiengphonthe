"""
generate_readings.py - Sinh bài đọc TOCFL bằng DeepSeek API
===========================================================
Dùng AI sinh bài đọc tiếng Trung Phồn thể, văn phong Đài Loan,
theo chủ đề TOCFL, phân theo band A1-C1.
"""

import json
import os
import time
import requests
from pathlib import Path

BASE_DIR = Path(__file__).parent
OUTPUT_FILE = BASE_DIR / 'data' / 'readings.json'

DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
DEEPSEEK_MODEL = 'deepseek-chat'

# Chủ đề TOCFL - mỗi band 20 chủ đề
TOPICS = {
    'A1': ['日常生活', '購物', '飲食', '交通', '學校', '家庭', '天氣', '時間', '顏色', '動物',
           '身體', '衣服', '節日', '運動', '朋友', '音樂', '電影', '旅行', '工作', '興趣'],
    'A2': ['日常生活', '旅行', '健康', '工作', '節日', '科技', '環境', '文化', '教育', '社會',
           '美食', '交通', '天氣', '購物', '運動', '音樂', '電影', '家庭', '朋友', '興趣'],
    'B1': ['科技', '環境', '文化', '教育', '社會', '經濟', '媒體', '藝術', '心理', '國際',
           '美食', '旅遊', '健康', '運動', '音樂', '電影', '歷史', '文學', '哲學', '科學'],
    'B2': ['經濟', '媒體', '藝術', '心理', '國際', '政治', '哲學', '文學', '歷史', '科學',
           '科技', '環境', '文化', '教育', '社會', '法律', '醫學', '建築', '設計', '天文'],
    'C1': ['政治', '哲學', '文學', '歷史', '科學', '經濟', '媒體', '藝術', '心理', '國際',
           '法律', '醫學', '建築', '天文', '社會學', '人類學', '語言學', '宗教', '倫理', '未來'],
}

# Số bài mỗi band
ARTICLES_PER_BAND = 20

# Từ vựng theo band (để nhúng vào prompt)
def load_vocab_sample(band: str, limit: int = 30) -> str:
    """Lấy mẫu từ vựng theo band để đưa vào prompt"""
    with open(BASE_DIR / 'data' / 'all_enriched.json', 'r', encoding='utf-8') as f:
        words = json.load(f)
    
    band_words = [w for w in words if w['level_code'] == band][:limit]
    return '\n'.join([f"- {w['vocabulary']} ({w['pinyin']}): {w['meaning_vi']}" for w in band_words])


def load_env():
    env_file = BASE_DIR / '.env'
    if not env_file.exists():
        print("❌ Không tìm thấy .env")
        return None
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('DEEPSEEK_API_KEY='):
                key = line.split('=', 1)[1].strip()
                if key and key != 'sk-your-api-key-here':
                    return key
    return None


def generate_reading(api_key: str, band: str, topic: str, article_num: int) -> dict:
    """Sinh 1 bài đọc bằng DeepSeek API"""
    
    vocab_sample = load_vocab_sample(band, 30)
    
    # Độ dài theo band
    length_map = {'A1': '100-150', 'A2': '150-250', 'B1': '250-400', 'B2': '400-600', 'C1': '600-800'}
    word_count = length_map.get(band, '200-300')
    
    system_prompt = f"""Bạn là giáo viên tiếng Trung tại Đài Loan, chuyên viết bài đọc cho kỳ thi TOCFL. Bạn cũng là chuyên gia dịch thuật Trung-Việt am hiểu sâu sắc văn hóa Đài Loan.

NHIỆM VỤ: Viết MỘT bài đọc tiếng Trung Phồn thể cho trình độ {band}, chủ đề "{topic}".

═══════════════════════════════════════
YÊU CẦU VIẾT BÀI (NỘI DUNG CHỮ PHỒN THỂ):
═══════════════════════════════════════
1. VIẾT BẰNG CHỮ PHỒN THỂ (Traditional Chinese), tuyệt đối không dùng Giản thể.
2. Dùng văn phong và từ vựng ĐÀI LOAN. Ví dụ: 捷運 (không dùng 地鐵), 腳踏車, 計程車, 便當, 垃圾(lèsè).
3. Độ dài: {word_count} chữ.
4. Nội dung tự nhiên, gần gũi đời sống Đài Loan, có tình huống thực tế.
5. Ưu tiên sử dụng các từ vựng trong danh sách TOCFL {band} dưới đây.
6. Bài đọc phải có mở đầu, thân bài, kết thúc rõ ràng.

═══════════════════════════════════════
YÊU CẦU DỊCH THUẬT (TIẾNG VIỆT):
═══════════════════════════════════════
7. Dịch title_vi và content_vi sang tiếng Việt CHUẨN, TỰ NHIÊN, đúng ngữ cảnh.
8. CHÍNH TẢ TIẾNG VIỆT TUYỆT ĐỐI CHÍNH XÁC. Kiểm tra kỹ: "ranh giới" (không phải "ran giới"), "khuôn viên", "xử lý", v.v.
9. Dịch nghĩa câu phải MƯỢT MÀ, không word-by-word, giữ đúng ý và văn phong.
10. content_pinyin phải chính xác, đúng thanh điệu.

═══════════════════════════════════════
YÊU CẦU CÂU HỎI:
═══════════════════════════════════════
11. 5 câu hỏi trắc nghiệm đọc hiểu (bắt buộc đủ 5 câu).
12. Câu hỏi phải kiểm tra HIỂU Ý CHÍNH, không hỏi chi tiết vụn vặt.
13. explanation_vi giải thích ngắn gọn tại sao đáp án đúng.

═══════════════════════════════════════
DANH SÁCH TỪ VỰNG GỢI Ý (TOCFL {band}):
═══════════════════════════════════════
{vocab_sample}

═══════════════════════════════════════
ĐỊNH DẠNG OUTPUT (JSON):
═══════════════════════════════════════
{{
  "title": "Tiêu đề bài đọc (chữ Phồn thể)",
  "title_vi": "Tiêu đề tiếng Việt (dịch chuẩn, tự nhiên)",
  "band": "{band}",
  "topic": "{topic}",
  "content": "Nội dung bài đọc (chữ Phồn thể)",
  "content_pinyin": "Phiên âm pinyin toàn bài (chính xác thanh điệu)",
  "content_vi": "Dịch tiếng Việt toàn bài (mượt mà, đúng chính tả)",
  "questions": [
    {{
      "question": "Câu hỏi 1 (chữ Phồn thể)",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "A",
      "explanation_vi": "Giải thích tiếng Việt ngắn gọn"
    }},
    {{
      "question": "Câu hỏi 2 (chữ Phồn thể)",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "B",
      "explanation_vi": "Giải thích tiếng Việt ngắn gọn"
    }},
    {{
      "question": "Câu hỏi 3 (chữ Phồn thể)",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "C",
      "explanation_vi": "Giải thích tiếng Việt ngắn gọn"
    }},
    {{
      "question": "Câu hỏi 4 (chữ Phồn thể)",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "D",
      "explanation_vi": "Giải thích tiếng Việt ngắn gọn"
    }},
    {{
      "question": "Câu hỏi 5 (chữ Phồn thể)",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "A",
      "explanation_vi": "Giải thích tiếng Việt ngắn gọn"
    }}
  ]
}}

CHỈ TRẢ VỀ JSON, không thêm gì khác."""

    user_prompt = f"Hãy viết bài đọc TOCFL band {band}, chủ đề {topic}, bài số {article_num}."

    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }

    payload = {
        'model': DEEPSEEK_MODEL,
        'temperature': 0.3,  # Một chút sáng tạo nhưng vẫn kiểm soát
        'max_tokens': 4096,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
    }

    for attempt in range(3):
        try:
            response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=90)
            response.raise_for_status()
            result = response.json()
            content = result['choices'][0]['message']['content'].strip()
            
            # Parse JSON
            if content.startswith('```'):
                lines = content.split('\n')
                content = '\n'.join(lines[1:-1])
            
            data = json.loads(content)
            data['id'] = f"{band}_{article_num:02d}"
            return data
            
        except Exception as e:
            print(f"  ⚠️ Lần {attempt + 1}: {e}")
            if attempt < 2:
                time.sleep(3)
    
    return None


def main():
    print("=" * 60)
    print("📝 SINH BÀI ĐỌC TOCFL BẰNG DEEPSEEK API")
    print("=" * 60)
    
    api_key = load_env()
    if not api_key:
        return
    
    # Load existing
    existing = []
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            existing = json.load(f)
    
    existing_ids = {r['id'] for r in existing}
    
    total = sum(ARTICLES_PER_BAND for _ in TOPICS)
    done = 0
    
    for band, topics in TOPICS.items():
        for i, topic in enumerate(topics):
            article_id = f"{band}_{i+1:02d}"
            
            if article_id in existing_ids:
                print(f"  ✅ {article_id}: {topic} (đã có)")
                done += 1
                continue
            
            print(f"  📝 {article_id}: Band {band} | {topic}...", end=' ', flush=True)
            result = generate_reading(api_key, band, topic, i+1)
            
            if result:
                existing.append(result)
                existing_ids.add(article_id)
                # Lưu ngay
                with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                    json.dump(existing, f, ensure_ascii=False, indent=2)
                print(f"✅ {len(result.get('content',''))} chữ")
                done += 1
            else:
                print("❌ Thất bại")
            
            time.sleep(1)  # Rate limit
    
    print(f"\n{'='*60}")
    print(f"✅ Hoàn thành: {done}/{total} bài đọc")
    print(f"📁 File: {OUTPUT_FILE}")


if __name__ == '__main__':
    main()
