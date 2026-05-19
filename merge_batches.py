import json

# Load all batches
files = [
    'data/sample_enriched.json',
    'data/batch_n1_rest.json',
    'data/batch_n1_rest2.json',
]

all_words = []
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        batch = json.load(fh)
        all_words.extend(batch)
        print(f'  {f}: {len(batch)} words')

# Remove duplicates by id
seen = set()
unique = []
for w in all_words:
    if w['id'] not in seen:
        seen.add(w['id'])
        unique.append(w)

print(f'\nTotal unique words: {len(unique)}')

# Save
with open('data/all_enriched.json', 'w', encoding='utf-8') as f:
    json.dump(unique, f, ensure_ascii=False, indent=2)

# Copy to tocfl-app
with open('tocfl-app/src/data/sample_enriched.json', 'w', encoding='utf-8') as f:
    json.dump(unique, f, ensure_ascii=False, indent=2)

print('Saved to data/all_enriched.json and tocfl-app/src/data/sample_enriched.json')
