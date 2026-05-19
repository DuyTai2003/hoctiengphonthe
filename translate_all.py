"""
translate_all.py - Dịch toàn bộ từ vựng TOCFL sang tiếng Việt bằng DeepSeek API
================================================================================
Tác giả: AI Copilot Agent
Ngày: 2026-05-18

Tính năng:
- Gọi DeepSeek API (temperature=0) để dịch chính xác, nhất quán
- Prompt nghiêm ngặt: đúng POS, ngữ cảnh Đài Loan, âm Hán Việt chuẩn
- Cơ chế RESUME: nếu bị gián đoạn, chạy lại sẽ tiếp tục từ chỗ dừng
- Lưu kết quả vào file JSON, tự động merge với dữ liệu đã có

Cách dùng:
1. Copy .env.example thành .env và điền DEEPSEEK_API_KEY
2. Chạy: python translate_all.py
3. Ngồi chơi, uống cà phê, đợi kết quả
"""

import json
import os
import time
import requests
from pathlib import Path
from typing import Optional

# ============================================
# CẤU HÌNH
# ============================================
BASE_DIR = Path(__file__).parent
INPUT_FILE = BASE_DIR / 'data' / 'tocfl_vocabulary.json'
OUTPUT_FILE = BASE_DIR / 'data' / 'all_enriched.json'
PROGRESS_FILE = BASE_DIR / 'data' / 'translate_progress.json'
WEB_DATA_FILE = BASE_DIR / 'tocfl-app' / 'src' / 'data' / 'sample_enriched.json'

# DeepSeek API
DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
DEEPSEEK_MODEL = 'deepseek-chat'  # Model rẻ nhất, đủ tốt cho dịch

# Số từ dịch mỗi lần gọi API (batch)
BATCH_SIZE = 20

# Delay giữa các lần gọi API (giây) - tránh rate limit
DELAY_BETWEEN_CALLS = 1.0

# Số lần thử lại nếu gặp lỗi
MAX_RETRIES = 3

# ============================================
# PROMPT HỆ THỐNG (System Prompt)
# ============================================
SYSTEM_PROMPT = """Bạn là chuyên gia dịch thuật hệ ngôn ngữ Trung - Việt, am hiểu sâu sắc kỳ thi TOCFL Đài Loan.

NHIỆM VỤ: Dịch danh sách từ vựng tiếng Trung Phồn thể sang tiếng Việt.

YÊU CẦU NGHIÊM NGẶT:
1. Dịch nghĩa NGẮN GỌN, PHỔ BIẾN NHẤT, dựa theo TỪ LOẠI (POS) được cung cấp.
2. Tìm âm HÁN VIỆT chuẩn xác cho từng từ.
3. Đặt câu ví dụ bằng CHỮ PHỒN THỂ (Traditional Chinese), dùng văn phong đời sống ĐÀI LOAN.
4. Kèm pinyin và dịch nghĩa câu ví dụ.
5. Nghĩa tiếng Việt phải PHỔ THÔNG, LỊCH SỰ, không dùng từ địa phương, từ lóng.
6. Đây là tiếng Trung ĐÀI LOAN (Phồn thể), KHÔNG phải Đại Lục (Giản thể).
7. CHỈ trả về JSON, không nói gì thêm.

ĐỊNH DẠNG OUTPUT (mảng JSON):
[
  {
    "id": "MÃ_ID",
    "vocabulary": "TỪ",
    "pinyin": "PINYIN",
    "pos": ["TỪ_LOẠI"],
    "sino_vietnamese": "ÂM_HÁN_VIỆT",
    "meaning_vi": "NGHĨA_TIẾNG_VIỆT",
    "example": "CÂU_VÍ_DỤ_PHỒN_THỂ",
    "example_pinyin": "PINYIN_CÂU_VÍ_DỤ",
    "example_meaning_vi": "NGHĨA_CÂU_VÍ_DỤ"
  }
]

LƯU Ý ĐẶC BIỆT:
- Với từ loại N (danh từ): dịch thành danh từ tiếng Việt
- Với từ loại V (động từ): dịch thành động từ tiếng Việt
- Với từ loại Vs (tính từ): dịch thành tính từ tiếng Việt
- Với từ loại Adv (trạng từ): dịch thành trạng từ tiếng Việt
- Nếu từ có nhiều nghĩa, chọn nghĩa PHỔ BIẾN NHẤT theo đúng từ loại
- Âm Hán Việt: tra cứu chính xác, viết thường (trừ tên riêng)"""


def load_env():
    """Đọc API key từ file .env"""
    env_file = BASE_DIR / '.env'
    if not env_file.exists():
        print("❌ KHÔNG TÌM THẤY FILE .env!")
        print(f"   Hãy copy .env.example thành .env và điền API key DeepSeek của bạn")
        print(f"   File cần tạo: {env_file}")
        return None

    # Đọc file .env thủ công (không cần thư viện python-dotenv)
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith('DEEPSEEK_API_KEY='):
                key = line.split('=', 1)[1].strip()
                if key and key != 'sk-your-api-key-here':
                    return key

    print("❌ Chưa điền DEEPSEEK_API_KEY trong file .env!")
    return None


def load_progress() -> set:
    """Đọc danh sách ID đã dịch xong (để resume)"""
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return set(data.get('completed_ids', []))
    return set()


def save_progress(completed_ids: set):
    """Lưu tiến độ để resume"""
    PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump({'completed_ids': list(completed_ids)}, f, ensure_ascii=False)


def load_existing_enriched() -> dict:
    """Đọc dữ liệu đã dịch từ file all_enriched.json"""
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            words = json.load(f)
            return {w['id']: w for w in words}
    return {}


def save_enriched(enriched: dict):
    """Lưu toàn bộ dữ liệu đã dịch"""
    words = list(enriched.values())
    # Sắp xếp theo ID
    words.sort(key=lambda w: w['id'])

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

    # Copy sang thư mục web
    WEB_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(WEB_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)


def call_deepseek_api(api_key: str, words_batch: list) -> Optional[list]:
    """Gọi DeepSeek API để dịch một batch từ"""
    # Tạo prompt với danh sách từ cần dịch
    words_text = ""
    for w in words_batch:
        pos_str = '/'.join(w['pos']) if w['pos'] else '?'
        words_text += f"ID: {w['id']} | Từ: {w['vocabulary']} | Pinyin: {w['pinyin']} | POS: {pos_str}\n"

    user_prompt = f"""Hãy dịch {len(words_batch)} từ vựng sau sang tiếng Việt. Trả về MẢNG JSON với đầy đủ các trường.

Danh sách từ:
{words_text}"""

    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }

    payload = {
        'model': DEEPSEEK_MODEL,
        'temperature': 0,  # QUAN TRỌNG: temperature=0 để kết quả nhất quán
        'max_tokens': 4096,
        'messages': [
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': user_prompt},
        ],
    }

    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(
                DEEPSEEK_API_URL,
                headers=headers,
                json=payload,
                timeout=60,
            )
            response.raise_for_status()

            result = response.json()
            content = result['choices'][0]['message']['content']

            # Parse JSON từ response
            # DeepSeek có thể trả về JSON trong ```json ... ``` hoặc trực tiếp
            content = content.strip()
            if content.startswith('```'):
                # Bỏ markdown code block
                lines = content.split('\n')
                content = '\n'.join(lines[1:-1])

            translated = json.loads(content)
            return translated

        except requests.exceptions.RequestException as e:
            print(f"  ⚠️ Lỗi mạng (lần {attempt + 1}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
        except json.JSONDecodeError as e:
            print(f"  ⚠️ Lỗi parse JSON (lần {attempt + 1}/{MAX_RETRIES}): {e}")
            print(f"  Response: {content[:200]}...")
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt)
        except Exception as e:
            print(f"  ⚠️ Lỗi không xác định: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt)

    return None


def main():
    print("=" * 60)
    print("🚀 DỊCH TỪ VỰNG TOCFL BẰNG DEEPSEEK API")
    print("=" * 60)

    # 1. Load API key
    api_key = load_env()
    if not api_key:
        return
    print(f"✅ Đã tìm thấy API key: {api_key[:10]}...{api_key[-4:]}")

    # 2. Load danh sách từ cần dịch
    if not INPUT_FILE.exists():
        print(f"❌ Không tìm thấy file: {INPUT_FILE}")
        return

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        all_words = json.load(f)
    print(f"📚 Tổng số từ trong TOCFL: {len(all_words)}")

    # 3. Load dữ liệu đã dịch
    enriched = load_existing_enriched()
    completed_ids = load_progress()

    # Merge: enriched và progress có thể khác nhau nếu lần trước bị crash
    all_completed = set(enriched.keys()) | completed_ids
    print(f"✅ Đã dịch xong: {len(all_completed)} từ")

    # 4. Lọc từ chưa dịch
    remaining = [w for w in all_words if w['id'] not in all_completed]
    print(f"⏳ Còn lại: {len(remaining)} từ cần dịch")

    if not remaining:
        print("\n🎉 TẤT CẢ ĐÃ DỊCH XONG! Không còn từ nào cần dịch.")
        return

    # 5. Dịch theo batch
    total_batches = (len(remaining) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"\n📦 Chia thành {total_batches} batch, mỗi batch {BATCH_SIZE} từ")
    print(f"⏱️  Dự kiến: ~{total_batches * DELAY_BETWEEN_CALLS / 60:.1f} phút (chưa tính thời gian API)")
    print("-" * 60)

    success_count = 0
    fail_count = 0

    for batch_idx in range(0, len(remaining), BATCH_SIZE):
        batch = remaining[batch_idx:batch_idx + BATCH_SIZE]
        batch_num = batch_idx // BATCH_SIZE + 1

        # In tiến độ
        first_id = batch[0]['id']
        last_id = batch[-1]['id']
        first_word = batch[0]['vocabulary']
        last_word = batch[-1]['vocabulary']
        print(f"\n📝 Batch {batch_num}/{total_batches}: {first_id} ({first_word}) → {last_id} ({last_word}) [{len(batch)} từ]")

        # Gọi API
        result = call_deepseek_api(api_key, batch)

        if result:
            # Merge kết quả vào enriched
            for word_data in result:
                wid = word_data.get('id')
                if wid:
                    # Thêm level info từ dữ liệu gốc
                    original = next((w for w in all_words if w['id'] == wid), None)
                    if original:
                        word_data['level_code'] = original['level_code']
                        word_data['level_name'] = original['level_name']
                        word_data['level_name_en'] = original['level_name_en']
                        word_data['level_order'] = original['level_order']
                        word_data['context'] = original.get('context', '')
                        word_data['variants'] = original.get('variants', [])

                    enriched[wid] = word_data
                    all_completed.add(wid)

            # Lưu ngay sau mỗi batch (an toàn)
            save_enriched(enriched)
            save_progress(all_completed)

            success_count += len(batch)
            print(f"  ✅ Thành công! Tổng: {len(all_completed)}/{len(all_words)} từ ({len(all_completed)/len(all_words)*100:.1f}%)")
        else:
            fail_count += len(batch)
            print(f"  ❌ Thất bại! Batch này sẽ được thử lại khi chạy lại script.")
            # Lưu tiến độ hiện tại để resume
            save_progress(all_completed)
            print(f"  💾 Đã lưu tiến độ. Chạy lại script để thử tiếp.")

        # Delay để tránh rate limit
        if batch_idx + BATCH_SIZE < len(remaining):
            time.sleep(DELAY_BETWEEN_CALLS)

    # 6. Tổng kết
    print("\n" + "=" * 60)
    print("📊 TỔNG KẾT")
    print("=" * 60)
    print(f"  ✅ Thành công: {success_count} từ")
    print(f"  ❌ Thất bại:   {fail_count} từ")
    print(f"  📚 Tổng đã dịch: {len(all_completed)}/{len(all_words)} từ ({len(all_completed)/len(all_words)*100:.1f}%)")

    # Thống kê theo cấp độ
    from collections import Counter
    level_counts = Counter(w['level_code'] for w in enriched.values())
    print("\n  Theo cấp độ:")
    for code in ['N1', 'N2', 'A1', 'A2', 'B1', 'B2', 'C1']:
        done = level_counts.get(code, 0)
        total = sum(1 for w in all_words if w['level_code'] == code)
        bar = '█' * (done * 20 // total) if total > 0 else ''
        print(f"    {code}: {done:4d}/{total:4d} [{bar:{'20'}}] {done/total*100:.0f}%" if total > 0 else f"    {code}: {done:4d}")

    print(f"\n📁 File output: {OUTPUT_FILE}")
    print(f"📁 File web:    {WEB_DATA_FILE}")

    if fail_count > 0:
        print(f"\n⚠️  Còn {fail_count} từ bị lỗi. Chạy lại script để thử lại.")
    else:
        print(f"\n🎉 HOÀN THÀNH! Tất cả từ đã được dịch xong.")


if __name__ == '__main__':
    main()
