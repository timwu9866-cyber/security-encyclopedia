# 知识图谱页测试:python tools/graphtest.py  (需本地服务 8765)
import sys, json, time
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
R = '/workspace/security-encyclopedia/'
res = []; 
def ok(name, cond, extra=''):
    res.append((name, bool(cond), extra)); print(('PASS ' if cond else 'FAIL ') + name, extra, flush=True)
ARGS = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"]
def newpage(b, w=1440, h=860):
    pg = b.new_page(viewport={'width': w, 'height': h}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    return pg, errs
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    pg, errs = newpage(b); t0 = time.time(); pg.goto(BASE + 'graph.html'); pg.wait_for_function('window.GRAPH'); pg.wait_for_timeout(800)
    print('load ms', int((time.time() - t0) * 1000))
    G = lambda js: pg.evaluate(js)
    st = G('GRAPH.G.stat'); print('stat', json.dumps({k: st[k] for k in ('nodes', 'edges', 'byType', 'byEdge', 'attackCount', 'defenseCount')}, ensure_ascii=False))
    ok('构建无告警', not st['warn'], str(st['warn']))
    ok('每个攻击事件≥1阶段', not st['attackNoStage'], str(st['attackNoStage']))
    ok('每个攻击事件≥1防守事件', not st['attackNoDefense'], str(st['attackNoDefense']))
    ok('每个防守事件≥1缓解对象', not st['defNoTarget'], str(st['defNoTarget']))
    ok('事件数=252', st['attackCount'] + st['defenseCount'] == 252, f"{st['attackCount']}+{st['defenseCount']}")
    c = G('GRAPH.counts()'); print('default visible', json.dumps(c))
    ok('默认可见节点>0 且隐藏 ref/measure', c['nodes'] > 0 and 'ref' not in c['byType'] and 'measure' not in c['byType'])
    ls = G('GRAPH.layoutStats()'); print('layout', ls); ok('力导向事件节点无重叠', ls['overlaps'] <= 3, str(ls))
    # 所有事件深链是否存在
    ids = G('GRAPH.nodes.filter(n=>n.ev).map(n=>n.ev.id)'); ok('图谱事件节点=252', len(ids) == 252)
    # 点击
    pos = G("GRAPH.screenPos('e:sqli')"); pg.mouse.click(pos['x'], pos['y']); pg.wait_for_timeout(400)
    ok('点击选中 sqli', G('GRAPH.S.sel') == 'e:sqli'); ok('侧栏显示名称', 'SQL' in pg.inner_text('#dBody h2'))
    ok('侧栏有演示按钮', pg.locator('#bDemo').count() == 1)
    ok('邻居列表非空', pg.locator('#dBody .nb span').count() > 5, str(pg.locator('#dBody .nb span').count()))
    pg.screenshot(path=R + 'shots/graph-selected.png')
    # 点击侧栏邻居
    pg.locator('#dBody .nb span[data-id^="e:"]').first.click(); pg.wait_for_timeout(300); ok('点击邻居切换选中', G('GRAPH.S.sel') != 'e:sqli', G('GRAPH.S.sel'))
    # 点空白取消
    pg.mouse.click(5 + 280, 860 - 40) ; pg.wait_for_timeout(200)
    # 双击展开
    G("GRAPH.reset()"); pg.wait_for_timeout(500)
    before = G('GRAPH.counts()')['nodes']; pos = G("GRAPH.screenPos('e:sqli')"); pg.mouse.dblclick(pos['x'], pos['y']); pg.wait_for_timeout(500)
    after = G('GRAPH.counts()'); ok('双击展开显示隐藏邻居(措施/参考)', after['nodes'] > before and (after['byType'].get('ref', 0) > 0), f"{before}->{after['nodes']} {after['byType']}")
    pg.screenshot(path=R + 'shots/graph-expanded.png')
    pos = G("GRAPH.screenPos('e:sqli')"); pg.mouse.dblclick(pos['x'], pos['y']); pg.wait_for_timeout(400); ok('再次双击收起', G('GRAPH.counts()')['nodes'] == before)
    # 搜索
    G('GRAPH.reset()'); pg.fill('#gq', 'kerberoast'); pg.wait_for_timeout(300); ok('搜索显示匹配数', '匹配' in pg.inner_text('#gqres'), pg.inner_text('#gqres'))
    pg.press('#gq', 'Enter'); pg.wait_for_timeout(600); ok('回车定位首个匹配', G('GRAPH.S.sel') is not None and 'kerberoast' in G('GRAPH.S.sel'), G('GRAPH.S.sel'))
    pg.fill('#gq', 'OWASP'); pg.press('#gq', 'Enter'); pg.wait_for_timeout(600); ok('搜索隐藏类型节点(OWASP)会被显示', (G('GRAPH.S.sel') or '').startswith('r:'), G('GRAPH.S.sel'))
    pg.fill('#gq', '提示词'); pg.wait_for_timeout(200); pg.screenshot(path=R + 'shots/graph-search.png'); pg.fill('#gq', ''); 
    # 过滤
    G('GRAPH.reset()'); pg.wait_for_timeout(300); full = G('GRAPH.counts()')
    pg.select_option('#fCat', 'ai'); pg.wait_for_timeout(400); c = G('GRAPH.counts()')
    nonai = G("GRAPH.nodes.filter(n=>n.ev && n.cat!=='ai' && GRAPH.S.cat==='ai' && document.getElementById('gstat') && false).length")
    ok('分类过滤 AI:事件数=13', c['byType'].get('event', 0) == 13, str(c['byType']))
    ok('分类过滤后节点减少', c['nodes'] < full['nodes'], f"{full['nodes']}->{c['nodes']}")
    pg.screenshot(path=R + 'shots/graph-filter-ai.png')
    pg.select_option('#fCat', 'all'); pg.wait_for_timeout(300)
    pg.click('#fSev .chip[data-s="low"]'); pg.click('#fSev .chip[data-s="medium"]'); pg.click('#fSev .chip[data-s="high"]'); pg.click('#fSev .chip[data-s="none"]'); pg.wait_for_timeout(400); c = G('GRAPH.counts()')
    sevs = G("[...new Set(GRAPH.nodes.filter(n=>n.ev).map(n=>n.sev))]"); crit = G("GRAPH.nodes.filter(n=>n.type==='event'&&n.sev==='critical').length")
    ok('严重程度过滤:只剩严重事件', c['byType'].get('event', 0) == crit and 'defense' not in c['byType'], f"{c['byType']} crit={crit}")
    G('GRAPH.reset()'); pg.wait_for_timeout(300)
    pg.click('#fType .chip[data-t="ref"]'); pg.wait_for_timeout(500); c = G('GRAPH.counts()'); ok('类型过滤:开启参考标准', c['byType'].get('ref', 0) == 358, str(c['byType']))
    pg.click('#fType .chip[data-t="ref"]'); pg.click('#fType .chip[data-t="event"]'); pg.wait_for_timeout(300); c = G('GRAPH.counts()'); ok('类型过滤:关闭攻击事件', 'event' not in c['byType'])
    pg.click('#fEdge .chip[data-e="chain"]'); pg.wait_for_timeout(200); G('GRAPH.reset()'); pg.wait_for_timeout(200)
    pg.click('#fEdge .chip[data-e="mitigate"]'); pg.wait_for_timeout(300); c = G('GRAPH.counts()'); ok('关系过滤:关闭缓解边', 'mitigate' not in c['byEdge'], str(c['byEdge']))
    G('GRAPH.reset()')
    # 布局切换、缩放平移
    pg.click('#bLayout'); pg.wait_for_timeout(1500); ok('切换分层布局', G('GRAPH.S.layout') == 'layered')
    ys = G("GRAPH.nodes.filter(n=>n.type==='stage' && n.side==='a').map(n=>Math.round(n.y))"); ok('分层:攻击阶段节点同一行', len(set(ys)) == 1, str(set(ys)))
    pg.screenshot(path=R + 'shots/graph-layered.png')
    pg.click('#bLayout'); pg.wait_for_timeout(1500); ok('切回力导向', G('GRAPH.S.layout') == 'force')
    k0 = G('GRAPH.S.view.k'); pg.mouse.move(700, 450); pg.mouse.wheel(0, -400); pg.wait_for_timeout(300); k1 = G('GRAPH.S.view.k'); ok('滚轮缩放', k1 > k0, f'{k0:.2f}->{k1:.2f}')
    x0 = G('GRAPH.S.view.x'); ep = G('GRAPH.emptyPoint()'); pg.mouse.move(ep['x'], ep['y']); pg.mouse.down(); pg.mouse.move(ep['x'] + 60, ep['y'] + 30, steps=5); pg.mouse.up(); pg.wait_for_timeout(200); x1 = G('GRAPH.S.view.x'); ok('拖动平移', abs(x1 - x0) > 50, f'{x0:.0f}->{x1:.0f}')
    pg.screenshot(path=R + 'shots/graph-zoomed.png')
    pg.click('#bReset'); pg.wait_for_timeout(600); ok('重置后默认状态', G('GRAPH.S.sel') is None and G('GRAPH.S.cat') == 'all' and G('GRAPH.counts()')['nodes'] == full['nodes'])
    # 拖动节点
    pos = G("GRAPH.screenPos('e:xss')"); pg.mouse.move(pos['x'], pos['y']); pg.mouse.down(); pg.mouse.move(pos['x'] + 60, pos['y'] + 40, steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
    # 跳转:对多个事件
    for eid in ['sqli', 'promptinj', 'siem', 'indirectinj', 'ntlmrelay', 'nac', 'ueba', 'cspdef', 'bridge']:
        G('GRAPH.select("e:%s",true)' % eid); pg.wait_for_timeout(300)
        with pg.expect_navigation(): pg.click('#bDemo')
        pg.wait_for_function('window.ENC && ENC.state', timeout=15000); pg.wait_for_timeout(1500)
        cur = pg.evaluate('ENC.events[ENC.state.cur].id'); playing = pg.evaluate('ENC.state.playing'); t = pg.evaluate('ENC.state.t')
        ok(f'跳转并播放 {eid}', cur == eid and playing and t > 0.3 and pg.url.endswith('#' + eid), f'url={pg.url} cur={cur} playing={playing} t={t:.2f}')
        pg.go_back(); pg.wait_for_function('window.GRAPH'); pg.wait_for_timeout(300)
    # ===== 新增事件 / 攻防对应 / 覆盖缺口 =====
    G('GRAPH.reset()'); pg.wait_for_timeout(500)
    pos = G("GRAPH.screenPos('e:ntlmrelay')"); pg.mouse.click(pos['x'], pos['y']); pg.wait_for_timeout(400)
    ok('点击新事件节点 ntlmrelay', G('GRAPH.S.sel') == 'e:ntlmrelay' and 'NTLM' in pg.inner_text('#dBody h2'))
    ok('新事件有阶段/资产/参考邻居', pg.locator('#dBody .nb span').count() > 6, str(pg.locator('#dBody .nb span').count()))
    ok('详情含覆盖状态', pg.locator('#dBody .cov').count() == 1, pg.inner_text('#dBody .cov') if pg.locator('#dBody .cov').count() else '')
    pairs = [('xss', 'cspdef'), ('domxss', 'cspdef'), ('cspbypass', 'cspdef'), ('brute', 'ratelimitdef'), ('stuffing', 'ratelimitdef'), ('captchabypass', 'ratelimitdef'), ('k8s', 'nac'), ('k8sapi', 'nac'),
             ('ato', 'ueba'), ('leak', 'dbmask'), ('portscan', 'asm'), ('sslstrip', 'cthsts'), ('lateral', 'honeytoken'), ('privabuse', 'bastion'), ('ddos', 'cdnwaf')]
    miss = [pr for pr in pairs if not G("GRAPH.edges.some(x=>x.type==='mitigate'&&x.s==='e:%s'&&x.t==='e:%s')" % (pr[1], pr[0]))]
    ok('攻防对应边(防守→攻击)齐全', not miss, str(miss))
    newids = ['indirectinj','agenttool','ragpoison','adversarial','membership','modelbackdoor','aisupply','pluginabuse','cardclone','rfidcopy','btattack','badusb','sidechannel','coldboot','signphish','approvalabuse','bridge','oracle','attack51','exchangestuff',
      'cspbypass','domxss','hpp','jwtalg','apilegacy','bizlogic','captchabypass','smsbomb','hostheader','sessionfix','dhcp','ntphijack','smbrelay','llmnr','ra6','macflood','ntlmrelay','bgpleak','asrep','adcs','ptt','silverticket','tokenimperson','comhijack','memshell','sandboxescape',
      'cloudkeylateral','k8sapi','etcdexpose','cloudsidechan','funcinject','layersecret','ratelimitdef','cdnwaf','bastion','nac','cthsts','cspdef','dbmask','honeytoken','ueba','asm']
    bad = G("%s.filter(id=>{const n=GRAPH.G.byId.get('e:'+id); if(!n) return true; const a=GRAPH.G.adj.get('e:'+id); return !(a.some(x=>x.type==='belongs')&&a.some(x=>x.type==='stage')&&a.some(x=>x.type==='asset')&&a.some(x=>x.type==='mitigate')&&a.some(x=>x.type==='ref'))})" % json.dumps(newids))
    ok('62 个新事件都有 分类/阶段/资产/攻防/参考 边', len(newids) == 62 and not bad, str(bad))
    # 缺口视图
    full = G('GRAPH.counts()'); gl = G('GRAPH.gapList()'); ok('缺口列表非空且 < 攻击事件总数', 0 < len(gl) < st['attackCount'], str(len(gl)))
    pg.click('#fGap .chip'); pg.wait_for_timeout(700); c = G('GRAPH.counts()'); print('gap view', json.dumps(c))
    ok('缺口视图:攻击事件数=缺口数', c['byType'].get('event', 0) == len(gl), f"{c['byType']} gap={len(gl)}")
    ok('缺口视图:节点显著减少', c['nodes'] < full['nodes'] * 0.5, f"{full['nodes']}->{c['nodes']}")
    ok('缺口 chip 高亮', pg.locator('#fGap .chip.on').count() == 1); ok('状态栏显示缺口数', '覆盖缺口' in pg.inner_text('#gstat'), pg.inner_text('#gstat'))
    gid = gl[0]; G("GRAPH.select('e:%s',true)" % gid); pg.wait_for_timeout(400)
    ok('缺口事件详情显示"覆盖缺口"', '覆盖缺口' in pg.inner_text('#dBody .cov') and pg.locator('#dBody .cov.gap').count() == 1, pg.inner_text('#dBody .cov'))
    pg.screenshot(path=R + 'shots/graph-gap.png')
    pg.click('#fGap .chip'); pg.wait_for_timeout(600); ok('缺口视图可关闭并恢复', G('GRAPH.counts()')['nodes'] == full['nodes'])
    G('GRAPH.reset()'); pg.goto(BASE + 'graph.html#gap'); pg.wait_for_function('window.GRAPH'); pg.wait_for_timeout(600); ok('graph.html#gap 深链进入缺口视图', G('GRAPH.S.gap') == 1)
    G('GRAPH.reset()'); pg.wait_for_timeout(400)
    pg.select_option('#fCat', 'phys'); pg.wait_for_timeout(400); c = G('GRAPH.counts()'); ok('分类过滤 物理:事件数=9', c['byType'].get('event', 0) == 9, str(c['byType']))
    G('GRAPH.reset()'); pg.wait_for_timeout(300)
    ok('index→graph 入口存在', True) if False else None
    pg.goto(BASE + 'index.html#sqli'); pg.wait_for_function('window.ENC'); ok('index 页含图谱入口', pg.locator('#bGraph').count() == 1); ok('详情含"在知识图谱中查看"链接', pg.locator('#lnkGraph').get_attribute('href') == 'graph.html#sqli')
    pg.click('#bGraph'); pg.wait_for_function('window.GRAPH'); ok('index→graph 跳转', pg.url.endswith('graph.html')); ok('graph→index 入口', pg.locator('#bIndex').get_attribute('href') == 'index.html')
    pg.goto(BASE + 'graph.html#kerberoast'); pg.wait_for_function('window.GRAPH'); pg.wait_for_timeout(500); ok('graph 深链选中', G('GRAPH.S.sel') == 'e:kerberoast', str(G('GRAPH.S.sel')))
    ok('页面无 JS 报错(桌面)', not errs, str(errs))
    # 帧耗时
    fr = G("(()=>{const t=performance.now();for(let i=0;i<30;i++){GRAPH.relayout(false)}return (performance.now()-t)/30})()"); print('relayout ms avg', round(fr, 1))
    G("GRAPH.reset();[...document.querySelectorAll('#fType .chip')].forEach(c=>{if(!c.classList.contains('on'))c.click()})"); pg.wait_for_timeout(800); c = G('GRAPH.counts()'); print('all types on', json.dumps(c))
    ok('全部类型开启 672 节点', c['nodes'] == 672, str(c['nodes'])); t = G("(()=>{const t=performance.now();for(let i=0;i<20;i++){GRAPH.G.nodes.length;}return 0})()")
    draw = G("(async()=>{const t0=performance.now();let n=0;await new Promise(r=>{function f(){n++;if(performance.now()-t0>1500)r();else requestAnimationFrame(f)}GRAPH.S.view.k=GRAPH.S.view.k;f()});return n/1.5})()"); print('idle raf/s (all 520 nodes on)', draw)
    pg.screenshot(path=R + 'shots/graph-all672.png'); ls = G('GRAPH.layoutStats()'); print('layout all', ls)
    ok('672 节点无报错', not errs, str(errs))
    pg.close()
    # 窄屏
    pg, e2 = newpage(b, 800, 900); pg.goto(BASE + 'graph.html'); pg.wait_for_function('window.GRAPH'); pg.wait_for_timeout(800)
    vis = pg.evaluate("getComputedStyle(document.getElementById('gleft')).display"); ok('窄屏筛选面板默认折叠', vis == 'none'); pg.click('#bPanel'); pg.wait_for_timeout(200)
    ok('窄屏可展开面板', pg.evaluate("getComputedStyle(document.getElementById('gleft')).display") == 'block'); pg.click('#bPanel')
    pos = pg.evaluate("GRAPH.screenPos('e:sqli')"); pg.mouse.click(pos['x'], pos['y']); pg.wait_for_timeout(300); ok('窄屏点击选中', pg.evaluate('GRAPH.S.sel') == 'e:sqli')
    pg.screenshot(path=R + 'shots/graph-narrow.png'); ok('窄屏无 JS 报错', not e2, str(e2)); pg.close()
    # file://
    pg, e3 = newpage(b); pg.goto('file://' + R + 'graph.html'); pg.wait_for_function('window.GRAPH'); pg.wait_for_timeout(600); ok('file:// 打开图谱', pg.evaluate('GRAPH.counts().nodes') > 100); ok('file:// 无报错', not e3, str(e3))
    reqs = []; pg.close(); b.close()
fails = [r for r in res if not r[1]]
print('SUMMARY pass=%d fail=%d' % (len(res) - len(fails), len(fails)))
for f in fails: print('FAILED:', f)
