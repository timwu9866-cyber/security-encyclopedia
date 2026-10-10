# 读取 /tmp/sigs.json,对第三批新事件在各分类内的顺序做优化(最大化最小相邻 RMS),输出建议顺序与指标;--apply 同步重排源文件
import json, re, math, random, sys, glob
d = json.load(open('/tmp/sigs.json')); order = d['order']; sg = d['sigs']
import functools
@functools.lru_cache(maxsize=None)
def rms(a, b): return math.sqrt(sum((x - y) ** 2 for x, y in zip(sg[a], sg[b])) / len(sg[a]))
files = sorted(glob.glob('/workspace/security-encyclopedia/data/events-new-*2.js'))
newids = set(); fileids = {}
for f in files:
    ids = re.findall(r"EV\(\{id:'([a-z0-9_-]+)',cat:'([a-z]+)'", open(f, encoding='utf-8').read()); fileids[f] = ids; newids |= {i for i, c in ids}
# 分段:order 中连续的新事件
segs = []; i = 0
while i < len(order):
    if order[i] in newids:
        j = i
        while j < len(order) and order[j] in newids: j += 1
        segs.append((i, j)); i = j
    else: i += 1
def score(seq, pre, post):
    full = ([pre] if pre else []) + list(seq) + ([post] if post else []); ds = [rms(a, b) for a, b in zip(full, full[1:])]
    return min(ds), sum(ds) / len(ds)
neword = list(order); report = []
random.seed(7)
for (a, b) in segs:
    seg = order[a:b]; pre = order[a - 1] if a > 0 else None; post = order[b] if b < len(order) else None
    best = (score(seg, pre, post), seg)
    cur = seg[:]
    for _ in range(1500):
        c = cur[:]; i1, i2 = random.sample(range(len(c)), 2) if len(c) > 1 else (0, 0); c[i1], c[i2] = c[i2], c[i1]
        s = score(c, pre, post)
        if s > score(cur, pre, post): cur = c
        if s > best[0]: best = (s, c)
    report.append((seg, best[1], score(seg, pre, post), best[0], pre, post)); neword[a:b] = best[1]
for seg, bs, s0, s1, pre, post in report:
    print('before min %.1f avg %.1f -> after min %.1f avg %.1f | pre=%s post=%s' % (s0[0], s0[1], s1[0], s1[1], pre, post)); print('   ', ' '.join(bs))
json.dump(neword, open('/tmp/neworder.json', 'w'))
