import json

with open('data/all_enriched.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for w in data:
    if w['id'] == 'A1_0001':
        w['meaning_vi'] = 'Số không, số 0'
        print(f"Fixed: {w['vocabulary']} -> {w['meaning_vi']}")
        break

with open('data/all_enriched.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open('tocfl-app/src/data/sample_enriched.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Saved!')
