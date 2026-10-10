# 给 html 中引用的本地 js/css 加内容哈希版本号(?v=xxxx),避免浏览器使用旧缓存。修改任何 js/css/data 后重新运行。
import re, hashlib, os
R = '/workspace/security-encyclopedia/'
def h(path):
    return hashlib.md5(open(R + path, 'rb').read()).hexdigest()[:8]
changed = []
for page in ('index.html', 'graph.html', 'nodes.html'):
    s = open(R + page).read()
    def rep(m):
        path = m.group(2)
        if not os.path.exists(R + path): return m.group(0)
        new = h(path); old = re.search(r'\?v=([0-9a-f]+)', m.group(0)); old = old.group(1) if old else '-'
        if old != new: changed.append(f'{page}: {path} {old} -> {new}')
        return f'{m.group(1)}{path}?v={new}"'
    s = re.sub(r'((?:src|href)=")((?:js|css|data|lib)/[^"?]+\.(?:js|css))(?:\?v=[0-9a-f]+)?"', rep, s)
    open(R + page, 'w').write(s)
print('stamped'); print('\n'.join(changed) or '(no version changes)')
