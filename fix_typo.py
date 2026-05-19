import json

with open('data/readings.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Sửa chính tả
typos = {
    'Ran giới': 'Ranh giới',
    'ran giới': 'ranh giới',
}

fixed = 0
for r in data:
    for field in ['title_vi', 'content_vi']:
        if field in r:
            for old, new in typos.items():
                if old in r[field]:
                    r[field] = r[field].replace(old, new)
                    fixed += 1
                    print(f"Fixed '{old}' → '{new}' in {r['id']}: {r[field][:60]}...")

print(f"\nTotal fixes: {fixed}")

with open('data/readings.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# Copy to web
with open('tocfl-app/src/data/readings.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Saved!')
