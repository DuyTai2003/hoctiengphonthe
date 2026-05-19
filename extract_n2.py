import json

with open('data/tocfl_vocabulary.json', 'r', encoding='utf-8') as f:
    words = json.load(f)

n2 = [w for w in words if w['level_code'] == 'N2']
print(f'Total N2: {len(n2)}')

with open('data/n2_raw.txt', 'w', encoding='utf-8') as f:
    for w in n2:
        pos_str = '/'.join(w['pos'])
        ctx = w.get('context', '')
        f.write(f"{w['id']}|{w['vocabulary']}|{w['pinyin']}|{pos_str}|{ctx}\n")

print('Saved to data/n2_raw.txt')
