import json

with open('data/tocfl_vocabulary.json', 'r', encoding='utf-8') as f:
    words = json.load(f)

# Lấy 50 từ N1 + N2
sample = [w for w in words if w['level_code'] in ('N1', 'N2')][:50]

with open('data/sample_n1n2_raw.txt', 'w', encoding='utf-8') as f:
    for w in sample:
        f.write(f"{w['id']}|{w['vocabulary']}|{w['pinyin']}|{'/'.join(w['pos'])}|{w.get('context','')}\n")

print(f"Extracted {len(sample)} words to data/sample_n1n2_raw.txt")
