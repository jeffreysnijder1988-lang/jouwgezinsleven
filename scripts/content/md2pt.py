# Markdown-artikelen (YAML-frontmatter, formaat: docs/content/schrijfbrief.md) -> Sanity article-JSON.
# Gebruik: python3 scripts/content/md2pt.py <werkmap> <submap>  (leest <werkmap>/<submap>/<pijler>/<slug>.md)
# Output: <werkmap>/<submap>/sanity-docs.json + images.json (imagePrompt/imageAlt per artikel).
# - [[TOOL:uitgerekende-datum]] op een eigen regel -> toolEmbed-blok
# - interne links /pijler/slug/ -> weak reference (alleen als het md-bestand in articles/ of articles2/ staat); /baby/ etc. -> platte tekst
# - Lomamo-URLs gecontroleerd tegen <werkmap>/articles/BRIEF.md
# - Live artikelen buiten de md-bestanden: <werkmap>/existing.json ({"/pijler/slug/": "article-slug"}), bv. uit GROQ.
# Nieuwe drafts krijgen reviewStatus needs_review, origin ai-assisted.
# publishedAt: PUBLISHED_BASE=2026-10-13T14:00 (UTC, moet in het verleden liggen); per artikel +3 min.
import re,json,sys,glob,hashlib,yaml,os,datetime
S=sys.argv[1]; D=sys.argv[2] if len(sys.argv)>2 else 'articles'
PIL={'zwanger':'pillar-zwanger','baby-peuter':'pillar-baby-peuter','kinderopvang':'pillar-kinderopvang','eropuit':'pillar-eropuit','feestjes':'pillar-feestjes','gezinsvakantie':'pillar-vakantie'}
LOMAMO=set(re.findall(r'https://lomamo\.nl/collections/[a-z0-9-]+',open(f'{S}/articles/BRIEF.md').read()))|{f'https://lomamo.nl/collections/speelgoed-{i}-jaar' for i in range(1,7)}
files=sorted(glob.glob(f'{S}/{D}/*/*.md'))
prev=[f for f in sorted(glob.glob(f'{S}/articles/*/*.md')+glob.glob(f'{S}/articles2/*/*.md')) if not f.startswith(f'{S}/{D}/')]
arts={};paths={}
if os.path.exists(f'{S}/existing.json'): paths.update(json.load(open(f'{S}/existing.json')))
BASE=datetime.datetime.fromisoformat(os.environ.get('PUBLISHED_BASE','2026-10-13T06:00'))
TODAY=BASE.date().isoformat()
for f in prev:
    _,fm,_b=open(f).read().split('---',2); m=yaml.safe_load(fm); paths[f"/{m['pillar']}/{m['slug']}/"]='article-'+m['slug']
STAGES={'/baby/':'lifestage-baby','/peuter/':'lifestage-peuter','/kleuter/':'lifestage-kleuter','/basisschool/':'lifestage-basisschool'}
for f in files:
    raw=open(f).read(); _,fm,body=raw.split('---',2); m=yaml.safe_load(fm)
    aid='article-'+m['slug']; arts[f]=(m,body.strip()); paths[f"/{m['pillar']}/{m['slug']}/"]=aid
def key(*a): return hashlib.md5('|'.join(map(str,a)).encode()).hexdigest()[:8]
probs=[]
def spans(text,bk,src):
    ch=[];md=[];pos=0
    for mm in re.finditer(r'\*\*(.+?)\*\*|\[([^\]]+?)\]\(([^)\s]+)\)|(?<![\w*])\*([^*\n]+?)\*(?![\w*])',text):
        if mm.start()>pos: ch.append((text[pos:mm.start()],[]))
        if mm.group(1) is not None: ch.append((mm.group(1),['strong']))
        elif mm.group(4) is not None: ch.append((mm.group(4),['em']))
        else:
            href=mm.group(3);k=key(bk,href,len(md))
            if href.startswith('/'):
                p=href if href.endswith('/') else href+'/'
                seg=p.strip('/').split('/')
                if p in paths: ref={'_type':'reference','_ref':paths[p],'_weak':True,'_strengthenOnPublish':{'type':'article'}}
                elif len(seg)==1 and seg[0] in PIL: ref={'_type':'reference','_ref':PIL[seg[0]]}
                elif p in STAGES: probs.append((src,'stage link (no target type)',href)); ch.append((mm.group(2),[])); pos=mm.end(); continue
                else: probs.append((src,'bad internal',href)); ch.append((mm.group(2),[])); pos=mm.end(); continue
                md.append({'_key':k,'_type':'internalLink','reference':ref})
            else:
                if 'lomamo.nl' in href and href.rstrip('/') not in LOMAMO: probs.append((src,'lomamo url',href))
                if 'welkespeeltuin' in href: probs.append((src,'welkespeeltuin',href))
                if not href.startswith('https://') and not href.startswith('http'): probs.append((src,'bad url',href))
                md.append({'_key':k,'_type':'link','href':href})
            ch.append((mm.group(2),[k]))
        pos=mm.end()
    if pos<len(text): ch.append((text[pos:],[]))
    for t,_ in ch:
        if re.search(r'\*\*|\]\(|^#',t): probs.append((src,'leftover md',t[:60]))
    return [{'_type':'span','_key':key(bk,i),'text':t,'marks':mk} for i,(t,mk) in enumerate(ch)],md
out=[];report=[]
for i,(f,(m,body)) in enumerate(arts.items()):
    if not m.get('imagePrompt') or not m.get('imageAlt'): probs.append((m['slug'],'no image prompt/alt',''))
    src=m['slug'];blocks=[];para=[]
    def flush():
        if para: add(' '.join(para),'normal');para.clear()
    def add(text,style,li=None):
        bk=key(src,len(blocks),text[:20]);c,md=spans(text.strip(),bk,src)
        b={'_type':'block','_key':bk,'style':style,'markDefs':md,'children':c}
        if li: b['listItem']=li;b['level']=1
        blocks.append(b)
    for ln in body.split('\n'):
        s=ln.rstrip()
        if not s.strip() or s.strip()=='>': flush();continue
        if re.match(r'^\[\[TOOL:([a-z0-9-]+)\]\]$',s.strip()):
            flush();t=s.strip()[7:-2];blocks.append({'_type':'toolEmbed','_key':key(src,'tool',t),'tool':t});continue
        if s.startswith('### '): flush();add(s[4:],'h3')
        elif s.startswith('## '): flush();add(s[3:],'h2')
        elif s.startswith('# '): probs.append((src,'h1',s))
        elif re.match(r'^\s*[-*] ',s): flush();add(re.sub(r'^\s*[-*] ','',s),'normal','bullet')
        elif re.match(r'^\s*\d+[.)] ',s): flush();add(re.sub(r'^\s*\d+[.)] ','',s),'normal','number')
        elif s.startswith('> '): flush();add(s[2:],'blockquote')
        elif '|' in s and s.strip().startswith('|'): probs.append((src,'table',s[:40]))
        else: para.append(s.strip())
    flush()
    words=sum(len(c['text'].split()) for b in blocks for c in b.get('children',[]))
    for fld,lim in (('title',110),('excerpt',300),('seoTitle',60),('seoDescription',160)):
        if len(m.get(fld) or '')>lim or not m.get(fld): probs.append((src,'len '+fld,len(m.get(fld) or '')))
    doc={'_id':'article-'+m['slug'],'_type':'article','title':m['title'],'slug':{'_type':'slug','current':m['slug']},
     'excerpt':m['excerpt'],'body':blocks,
     'faq':[{'_key':key(src,'faq',j),'_type':'faqItem','question':q['q'],'answer':q['a']} for j,q in enumerate(m.get('faq') or [])],
     'pillar':{'_type':'reference','_ref':PIL[m['pillar']]},
     'lifeStages':[{'_key':key(src,'ls',x),'_type':'reference','_ref':'lifestage-'+x} for x in m.get('lifeStages') or []],
     'searchIntent':m.get('searchIntent'),
     'networkDestinations':[{'_key':key(src,'nw',j),'_type':'networkDestination','platform':n['platform'],'externalUrl':n['url'],'relationType':n.get('relationType','platform'),'title':n.get('title'),'description':n.get('description'),'priority':n.get('priority',0)} for j,n in enumerate(m.get('network') or [])],
     'publishedAt':(BASE+datetime.timedelta(minutes=3*i)).strftime('%Y-%m-%dT%H:%M:00Z'),
     'sources':[{'_key':key(src,'src',j),'_type':'sourceRef','sourceName':x['name'],'sourceUrl':x['url'],'lastCheckedAt':TODAY} for j,x in enumerate(m.get('sources') or [])],
     'sourceNotes':m.get('notes'),'reviewStatus':'needs_review','origin':'ai-assisted',
     'seo':{'_type':'seo','title':m['seoTitle'],'description':m['seoDescription']}}
    for k in ('minimumAgeMonths','maximumAgeMonths'):
        if m.get(k) is not None: doc[k]=m[k]
    if m.get('volatile'): doc['lastReviewedAt']=TODAY
    doc={k:v for k,v in doc.items() if v not in (None,[])}
    for n in doc.get('networkDestinations',[]):
        for k in [k for k,v in n.items() if v is None]: del n[k]
        if n['platform']=='lomamo' and n['externalUrl'].rstrip('/') not in LOMAMO: probs.append((src,'nw lomamo',n['externalUrl']))
    out.append(doc);report.append((m['pillar'],m['slug'],words,len(doc.get('faq',[])),len(doc.get('sources',[])),[n['platform'] for n in doc.get('networkDestinations',[])],len(json.dumps(doc))))
json.dump(out,open(f'{S}/{D}/sanity-docs.json','w'),ensure_ascii=False)
json.dump({ 'article-'+m['slug']:{'prompt':m.get('imagePrompt'),'alt':m.get('imageAlt')} for m,_ in arts.values()},open(f'{S}/{D}/images.json','w'),ensure_ascii=False,indent=1)
for r in report: print(*r)
print('PROBLEMS',probs)
