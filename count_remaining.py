import json

with open('data/tocfl_vocabulary.json', 'r', encoding='utf-8') as f:
    words = json.load(f)

n1n2 = [w for w in words if w['level_code'] in ('N1', 'N2')]
print(f'Total N1+N2: {len(n1n2)}')

with open('data/sample_enriched.json', 'r', encoding='utf-8') as f:
    done = json.load(f)

done_ids = {d['id'] for d in done}
remaining = [w for w in n1n2 if w['id'] not in done_ids]
print(f'Already done: {len(done_ids)}, Remaining: {len(remaining)}')

with open('data/n1n2_remaining.txt', 'w', encoding='utf-8') as f:
    for w in remaining:
        pos_str = '/'.join(w['pos'])
        ctx = w.get('context', '')
        f.write(f"{w['id']}|{w['vocabulary']}|{w['pinyin']}|{pos_str}|{ctx}\n")

print('Saved remaining to data/n1n2_remaining.txt')
