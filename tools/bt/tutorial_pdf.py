"""Makes deliver/Battle-Theatre-Tutorial.pdf from docs/battle-theatre/app/docs/TUTORIAL.md (reportlab).
   python tools/bt/tutorial_pdf.py [out.pdf]
Handles the Markdown the tutorial uses: headings, paragraphs, bullets (and check boxes), numbered lists, tables, **bold**, *italic*, `code`."""
import os, re, sys, hashlib
from xml.sax.saxutils import escape
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle, ListFlowable, ListItem, KeepTogether

HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = os.path.join(REPO, 'docs/battle-theatre/app/docs/TUTORIAL.md'); OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, 'deliver/Battle-Theatre-Tutorial.pdf')
FD = '/usr/share/fonts/truetype/'
for name, f in [('Body', 'liberation/LiberationSans-Regular.ttf'), ('Body-Bold', 'liberation/LiberationSans-Bold.ttf'), ('Body-Italic', 'liberation/LiberationSans-Italic.ttf'), ('Body-BoldItalic', 'liberation/LiberationSans-BoldItalic.ttf'), ('Mono', 'dejavu/DejaVuSansMono.ttf')]:
    pdfmetrics.registerFont(TTFont(name, FD + f))
pdfmetrics.registerFontFamily('Body', normal='Body', bold='Body-Bold', italic='Body-Italic', boldItalic='Body-BoldItalic')
ST = {'body': ParagraphStyle('body', fontName='Body', fontSize=9.6, leading=13.4, spaceAfter=4.5),
      'h1': ParagraphStyle('h1', fontName='Body-Bold', fontSize=20, leading=24, spaceAfter=6, textColor=colors.HexColor('#1d2740')),
      'h2': ParagraphStyle('h2', fontName='Body-Bold', fontSize=14, leading=18, spaceBefore=12, spaceAfter=5, textColor=colors.HexColor('#1d2740')),
      'h3': ParagraphStyle('h3', fontName='Body-Bold', fontSize=11, leading=14, spaceBefore=8, spaceAfter=3),
      'cell': ParagraphStyle('cell', fontName='Body', fontSize=8.6, leading=11.2), 'cellh': ParagraphStyle('cellh', fontName='Body-Bold', fontSize=8.6, leading=11.2)}
def inline(t):
    t = escape(t); t = re.sub(r'`([^`]+)`', lambda m: '<font name="Mono" size="8.4">' + m.group(1) + '</font>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', t); t = re.sub(r'(?<![\w*])\*([^*\n]+)\*(?![\w*])', r'<i>\1</i>', t); return t
def table(rows):
    data = [[Paragraph(inline(c.strip()), ST['cellh' if i == 0 else 'cell']) for c in r] for i, r in enumerate(rows)]; n = max(len(r) for r in data)
    for r in data: r += [Paragraph('', ST['cell'])] * (n - len(r))
    w = (A4[0] - 36 * mm); cw = [w * 0.28, w * 0.72] if n == 2 else [w / n] * n
    t = Table(data, colWidths=cw, repeatRows=1); t.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#b9bfcc')), ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e8ecf4')), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4), ('TOPPADDING', (0, 0), (-1, -1), 2.5), ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5)])); return t
def build(md):
    L = md.split('\n'); out = []; i = 0; para = []
    def flush():
        nonlocal para
        if para: out.append(Paragraph(inline(' '.join(para)), ST['body'])); para = []
    while i < len(L):
        l = L[i]
        if not l.strip(): flush(); i += 1; continue
        m = re.match(r'^(#{1,3}) (.*)', l)
        if m: flush(); out.append(Paragraph(inline(m.group(2)), ST['h' + str(len(m.group(1)))])); i += 1; continue
        if l.startswith('|'):
            flush(); rows = []
            while i < len(L) and L[i].startswith('|'):
                if not re.match(r'^\|[\s:|-]+\|$', L[i]): rows.append(L[i].strip().strip('|').split(' | ') if ' | ' in L[i] else L[i].strip().strip('|').split('|'))
                i += 1
            out.append(table(rows)); out.append(Spacer(1, 5)); continue
        m = re.match(r'^(\s*)(-|\d+\.) (.*)', l)
        if m:
            flush(); items = []; kind = 'bullet' if m.group(2) == '-' else '1'
            while i < len(L):
                mm_ = re.match(r'^(\s*)(-|\d+\.) (.*)', L[i])
                if not mm_ and L[i].startswith('  ') and L[i].strip() and items: items[-1] += ' ' + L[i].strip(); i += 1; continue
                if not mm_ or (mm_.group(2) == '-') != (kind == 'bullet'): break
                items.append(mm_.group(3)); i += 1
            lf = ListFlowable([ListItem(Paragraph(inline(re.sub(r'^\[ \] ', '☐ ', x)), ST['body']), leftIndent=14) for x in items], bulletType=kind, start=None if kind == 'bullet' else '1', leftIndent=14, bulletFontName='Body', bulletFontSize=9)
            out.append(lf); out.append(Spacer(1, 3)); continue
        para.append(l.strip()); i += 1
    flush(); return out
def footer(c, d):
    c._doc.info.producer = 'Gettysburg Interactive Map'
    c.saveState(); c.setFont('Body', 8); c.setFillColor(colors.HexColor('#666a78')); c.drawString(18 * mm, 10 * mm, 'Battle Theatre: owner tutorial'); c.drawRightString(A4[0] - 18 * mm, 10 * mm, 'Page %d' % d.page); c.restoreState()
if __name__ == '__main__':
    md = open(SRC, encoding='utf8').read(); os.makedirs(os.path.dirname(OUT), exist_ok=True)
    doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=18 * mm, title='Battle Theatre: owner tutorial', author='Gettysburg Interactive Map', subject='How to open, use, test and deploy the Battle Theatre staging build', creator='Gettysburg Interactive Map', invariant=1)
    doc.addPageTemplates([PageTemplate(id='p', frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')], onPage=footer)])
    doc.build(build(md)); b = open(OUT, 'rb').read()
    for pat in (rb'ReportLab Generated PDF document \(opensource\)', rb'ReportLab generated PDF document -- digest \(opensource\)'):      # comment lines of the file; same length, so the offsets stay valid
        b = re.sub(pat, lambda m: b'Battle Theatre tutorial'.ljust(len(m.group(0))), b)
    open(OUT, 'wb').write(b)
    open(OUT + '.sha256', 'w').write(hashlib.sha256(b).hexdigest() + '  ' + os.path.basename(OUT) + '\n'); print(OUT, len(b), 'bytes')
