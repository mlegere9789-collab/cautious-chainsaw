import sys,json,numpy as np,os
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
from rapidocr import RapidOCR
src=sys.argv[1]; out=sys.argv[2]
os.environ['OMP_NUM_THREADS']='2'
ocr=RapidOCR(params={"EngineConfig.onnxruntime.intra_op_num_threads":2,"EngineConfig.onnxruntime.inter_op_num_threads":1})
im=Image.open(src).convert('RGB'); W,H=im.size
T=1100; O=150; res=[]
for y0 in range(0,H,T-O):
    for x0 in range(0,W,T-O):
        t=np.array(im.crop((x0,y0,min(W,x0+T),min(H,y0+T))))
        if t.size==0: continue
        r=ocr(t)
        if r is None or r.txts is None: continue
        for b,tx,sc in zip(r.boxes,r.txts,r.scores):
            b=np.array(b)+[x0,y0]
            res.append(dict(t=tx,s=float(sc),box=b.round(1).tolist()))
    print(y0,len(res),flush=True)
json.dump(res,open(out,'w',encoding='utf-8'),ensure_ascii=True)
