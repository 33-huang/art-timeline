#!/usr/bin/env python3
"""艺术时间轴：检查简介格式、把 data-wiki 标记换成图片链接。规则见 ../加内容规范.md 第 5、6 节。

用法（需要 gh 已登录、能用 curl）：
  python3 scripts/links.py check     # 检查格式，列出 needsLink 条目和没换掉的 data-wiki 标记（只读）
  python3 scripts/links.py resolve   # 把 data-wiki 标记换成图片链接，写回 data 分支并读回确认
"""
import base64, html, json, re, subprocess, sys, time, urllib.parse

REPO = '33-huang/art-timeline'
FILES = ['movements.json', 'artists.json']
UA = 'timeline-notes/1.0 (personal study tool)'
WIKI = re.compile(r'<a data-wiki="([^"]+)">(.*?)</a>')
ALLOWED = {'p', 'b', 'ul', 'li', 'a'}


def get(f):
    r = json.loads(subprocess.check_output(['gh', 'api', f'repos/{REPO}/contents/{f}?ref=data']))
    return json.loads(base64.b64decode(r['content'])), r['sha']


def put(f, data, sha, msg):
    body = {'message': msg, 'branch': 'data', 'sha': sha,
            'content': base64.b64encode((json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode()).decode()}
    subprocess.run(['gh', 'api', '-X', 'PUT', f'repos/{REPO}/contents/{f}', '--input', '-'],
                   input=json.dumps(body).encode(), check=True, stdout=subprocess.DEVNULL)


def wiki_api(params):
    q = urllib.parse.urlencode(params)
    for i in range(8):
        out = subprocess.check_output(['curl', '-s', '-A', UA, 'https://en.wikipedia.org/w/api.php?' + q])
        try:
            return json.loads(out)['query']
        except Exception:
            time.sleep(5 * (i + 1))  # 被限流（429）时等一会儿再试
    raise RuntimeError('维基接口一直失败')


def images(titles, size=1600):
    """英文维基条目标题 -> (主图 URL, 来源页)；查不到主图的不在结果里"""
    out, titles = {}, sorted(set(titles))
    for i in range(0, len(titles), 50):
        chunk = titles[i:i + 50]
        d = wiki_api({'action': 'query', 'format': 'json', 'redirects': 1, 'prop': 'pageimages',
                      'piprop': 'thumbnail|name', 'pithumbsize': size,
                      'titles': '|'.join(html.unescape(t) for t in chunk)})
        alias = {x['from']: x['to'] for k in ('normalized', 'redirects') for x in d.get(k, [])}
        pages = {p['title']: p for p in d['pages'].values()}
        for t in chunk:
            u, seen = html.unescape(t), set()
            while u in alias and u not in seen:
                seen.add(u); u = alias[u]
            p = pages.get(u)
            if p and 'thumbnail' in p and 'pageimage' in p:
                out[t] = (p['thumbnail']['source'].split('?')[0],
                          'https://en.wikipedia.org/wiki/File:' + urllib.parse.quote(p['pageimage']))
        time.sleep(1)
    return out


def check():
    bad = 0
    for f in FILES:
        data, _ = get(f)
        for x in data:
            d = x.get('description', '')
            probs = []
            if '\n' in d: probs.append('有换行')
            extra = set(re.findall(r'</?([a-z0-9]+)', d)) - ALLOWED
            if extra: probs.append(f'不允许的标签 {extra}')
            for t in ALLOWED:
                if d.count(f'<{t}') != d.count(f'</{t}>'): probs.append(f'<{t}> 没配对')
            if 'editst.com' in json.dumps(x): probs.append('有 editst.com（盗链）')
            marks = WIKI.findall(d)
            if marks: probs.append(f'{len(marks)} 个 data-wiki 标记待换')
            if x.get('needsLink'): probs.append('needsLink')
            if probs:
                bad += 1
                print(f"{f} {x['id']} {x['zh']}: {'；'.join(probs)}")
    print('全部正常' if not bad else f'共 {bad} 条要处理')


def resolve():
    for f in FILES:
        data, sha = get(f)
        titles = [t for x in data for t, _ in WIKI.findall(x.get('description', ''))]
        if not titles:
            print(f'{f}: 没有 data-wiki 标记'); continue
        found, miss = images(titles), []

        def sub(m):
            t, txt = m.group(1), m.group(2)
            if t in found:
                img, page = found[t]
                return (f'<a href="{html.escape(img)}" data-img="{html.escape(img)}" data-src="{html.escape(page)}" '
                        f'target="_blank" rel="noreferrer">{txt}</a>')
            miss.append(t); return txt

        for x in data:
            if 'description' in x:
                x['description'] = WIKI.sub(sub, x['description'])
        put(f, data, sha, '简介里的 data-wiki 标记换成图片链接')
        assert get(f)[0] == data, '读回不一致'
        print(f'{f}: 换了 {len(titles) - len(miss)} 个；查不到图、改成普通文字的：{miss or "无"}')


if __name__ == '__main__':
    {'check': check, 'resolve': resolve}.get(sys.argv[1] if len(sys.argv) > 1 else '', lambda: print(__doc__))()
