import re,json,sys,urllib.request,concurrent.futures,datetime
from pathlib import Path
out=Path(__file__).parent/'live'
def fetch(code):
 import time
 time.sleep(2)
 s=urllib.request.urlopen('https://jlcpcb.com/partdetail/'+code,timeout=40).read().decode()
 stream=''.join(json.loads(m)[1] for m in re.findall(r'self\.__next_f\.push\((\[1,.*?\])\)</script>',s))
 records=[]
 for match in re.finditer(r'\{"component(?:ModelEn|Code)":',stream):
  try:
   obj,end=json.JSONDecoder().raw_decode(stream[match.start():]);
   if obj.get('componentCode')==code: records.append(obj)
  except ValueError: pass
 keys=['componentCode','componentModelEn','componentBrandEn','componentSpecificationEn','describe','assemblyMode','componentLibraryType','overseasStockCount','canPresaleNumber','isBuyComponent','preMinPurchaseNum','noBuyReason','dataManualUrl','dataManualOfficialLink','attributes']
 data={k:o[k] for o in records for k in keys if k in o and o[k]!='$undefined'}
 data.update(url='https://jlcpcb.com/partdetail/'+code,checked_at=datetime.datetime.now(datetime.timezone.utc).isoformat())
 if 'overseasStockCount' not in data: raise ValueError('stock missing '+code)
 (out/(code+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 return {k:v for k,v in data.items() if k not in ['dataManualUrl','dataManualOfficialLink','attributes']}
with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
 for code,result in zip(sys.argv[1:],ex.map(fetch,sys.argv[1:])): print(json.dumps(result,ensure_ascii=False))
