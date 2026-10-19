"""Fetch the modern reference rasters for the AOI from USGS public-domain services:
   USGS NAIP imagery (TNM ImageServer) and 3DEP bare-earth DEM (1 m where lidar-derived), in UTM 18N, 1 m grid, in blocks.
   python fetch_ref.py naip|dem"""
import os, sys
from common import *
kind = sys.argv[1]
NAIP = 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage'
DEM = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage'
BW, BH = 2250, 2150
d = os.path.join(TMP, 'ref', kind); os.makedirs(d, exist_ok=True)
for j, n0 in enumerate(range(AOI['n0'], AOI['n1'], BH)):
    for i, e0 in enumerate(range(AOI['e0'], AOI['e1'], BW)):
        bb = f"{e0},{n0},{e0+BW},{n0+BH}"
        if kind == 'naip':
            url = f"{NAIP}?bbox={bb}&bboxSR=32618&imageSR=32618&size={BW},{BH}&format=png&interpolation=RSP_BilinearInterpolation&f=image"
            out = os.path.join(d, f"b_{e0}_{n0}.png")
        else:
            url = f"{DEM}?bbox={bb}&bboxSR=32618&imageSR=32618&size={BW},{BH}&format=tiff&pixelType=F32&interpolation=RSP_BilinearInterpolation&f=image"
            out = os.path.join(d, f"b_{e0}_{n0}.tif")
        ok = polite_get(url, out, wait=1.5)
        print(kind, i, j, bb, 'ok' if ok else 'FAIL', flush=True)
