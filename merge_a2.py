import json

files = [
    'data/all_enriched.json',
    'data/batch_a2_1.json',
    'data/batch_a2_2.json',
    'data/batch_a2_3.json',
    'data/batch_a2_4.json',
    'data/batch_a2_5.json',
    'data/batch_a2_6.json',
    'data/batch_a2_7.json',
    'data/batch_a2_8.json',
]

all_words = []
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        batch = json.load(fh)
        all_words.extend(batch)
        print(f'  {f}: {len(batch)} words')

seen = set()
unique = []
for w in all_words:
    if w['id'] not in seen:
        seen.add(w['id'])
        unique.append(w)

from collections import Counter
level_counts = Counter(w['level_code'] for w in unique)
print(f'\nTotal unique: {len(unique)}')
for code in ['N1','N2','A1','A2','B1','B2','C1']:
    print(f'  {code}: {level_counts.get(code, 0)}')

with open('data/all_enriched.json', 'w', encoding='utf-8') as f:
    json.dump(unique, f, ensure_ascii=False, indent=2)

with open('tocfl-app/src/data/sample_enriched.json', 'w', encoding='utf-8') as f:
    json.dump(unique, f, ensure_ascii=False, indent=2)

print('\nSaved!')
