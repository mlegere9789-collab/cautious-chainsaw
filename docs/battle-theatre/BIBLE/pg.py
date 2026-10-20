import re,sys
t=open('plan-clean.txt',encoding='utf-8').read()
parts=re.split(r'\n\n=== PAGE (\d+) ===\n',t)
idx={int(parts[i]):parts[i+1] for i in range(1,len(parts),2)}
a,b=int(sys.argv[1]),int(sys.argv[2])
out=[]
for n in range(a,b+1): out.append(f'[[p{n}]]\n'+idx[n].strip())
s='\n'.join(out); sys.stdout.buffer.write(s.encode('utf-8'))
