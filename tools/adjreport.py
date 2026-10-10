# 读取 /tmp/sigs.json(adjcheck.py 生成),输出新事件的相邻 RMS 指标与"新 vs 旧"指标 → shots/adjacency.log
import json, math, re, glob
d = json.load(open('/tmp/sigs.json')); order = d['order']; sg = d['sigs']
rms = lambda a, b: math.sqrt(sum((x - y) ** 2 for x, y in zip(sg[a], sg[b])) / len(sg[a]))
new = set()
for f in glob.glob('/workspace/security-encyclopedia/data/events-new-*2.js'): new |= set(re.findall(r"EV\(\{id:'([a-z0-9_-]+)'", open(f, encoding='utf-8').read()))
adj = [(rms(a, b), a, b) for a, b in zip(order, order[1:])]
allm = sorted(x[0] for x in adj); med = lambda v: v[len(v) // 2]
nn = sorted([x for x in adj if x[1] in new and x[2] in new]); no = sorted([x for x in adj if (x[1] in new) != (x[2] in new)]); oo = sorted([x for x in adj if x[1] not in new and x[2] not in new])
out = []
P = lambda *a: (out.append(' '.join(str(x) for x in a)), print(*a))
P('events', len(order), 'new', len(new))
P('ALL adjacent: min %.1f median %.1f max %.1f' % (allm[0], med(allm), allm[-1]))
for nm, v in (('新-新相邻', nn), ('新-旧相邻(分类边界)', no), ('旧-旧相邻(对照)', oo)):
    ms = [x[0] for x in v]; P('%s n=%d min %.1f median %.1f max %.1f' % (nm, len(v), ms[0], med(ms), ms[-1]), '最低3:', [(round(x[0], 1), x[1], x[2]) for x in v[:3]])
old = [i for i in order if i not in new]
near = sorted((min((rms(n, o), o) for o in old) + (n,) for n in new))
P('每个新事件与"全部旧事件"的最小 RMS(越大越有区分度): min %.1f median %.1f' % (near[0][0], med([x[0] for x in near])), '最接近的 5 个:', [(round(x[0], 1), x[2], x[1]) for x in near[:5]])
P('新-新相邻 <8 的:', [(round(x[0], 1), x[1], x[2]) for x in nn if x[0] < 8])
open('/workspace/security-encyclopedia/shots/adjacency.log', 'w').write('\n'.join(out) + '\n')
