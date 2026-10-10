import glob,os,re
R='/workspace/security-encyclopedia/'
files=sorted(os.path.basename(f) for f in glob.glob(R+'data/events-new-*.js'))
tags=''.join(f'<script src="data/{f}"></script>\n' for f in files)
for page in ('index.html','graph.html'):
    p=R+page
    if not os.path.exists(p): continue
    s=open(p).read()
    if 'schemes2.js' not in s: s=s.replace('<script src="data/schemes.js','<script src="data/schemes2.js"></script>\n<script src="data/schemes.js',1) if False else re.sub(r'(<script src="data/schemes\.js[^"]*"></script>\n)',r'\1<script src="data/schemes2.js"></script>\n',s,count=1)
    s=re.sub(r'<!--NEWEVENTS-->\n(<script src="data/events-new-[^\n]*\n)*','<!--NEWEVENTS-->\n'+tags,s)
    open(p,'w').write(s)
print(files)
