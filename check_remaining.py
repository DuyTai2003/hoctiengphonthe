import json

with open('data/tocfl_vocabulary.json', 'r', encoding='utf-8') as f:
    all_words = json.load(f)
with open('data/all_enriched.json', 'r', encoding='utf-8') as f:
    enriched = json.load(f)

done_ids = {w['id'] for w in enriched}
remaining = [w for w in all_words if w['id'] not in done_ids]

for w in remaining:
    print(f"{w['id']}|{w['vocabulary']}|{w['pinyin']}|{'/'.join(w['pos'])}")
print(f'Total remaining: {len(remaining)}')
