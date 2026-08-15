/* AutoTrade Pro v2.5 strategy override: frozen confidence + historical OTE + reclaim lock */
const ATP25_MARKETS=[
 ['R_75','V-75'],['R_10','V-10'],['R_25','V-25'],['R_50','V-50'],['R_100','V-100'],
 ['BOOM300N','Boom 300'],['BOOM500','Boom 500'],['BOOM1000','Boom 1000'],
 ['CRASH300N','Crash 300'],['CRASH500','Crash 500'],['CRASH1000','Crash 1000'],
 ['1HZ10V','V-10 (1s)'],['1HZ25V','V-25 (1s)'],['1HZ50V','V-50 (1s)'],['1HZ75V','V-75 (1s)'],['1HZ100V','V-100 (1s)'],['1HZ150V','V-150 (1s)'],['1HZ250V','V-250 (1s)'],
 ['frxXAUUSD','Gold'],['frxNAS100','NAS100']
];
if(typeof multiMarkets!=='undefined'){
 multiMarkets=ATP25_MARKETS.map(x=>x[0]);
 saveMultiMarkets();
}
if(typeof defaultSymbols!=='undefined'){
 defaultSymbols.length=0;ATP25_MARKETS.forEach(x=>defaultSymbols.push(x));
 try{initSymbols();}catch(e){}
}
function atpRsi(cs,p=14){if(cs.length<=p)return 50;let g=0,l=0;for(let i=cs.length-p+1;i<cs.length;i++){const d=cs[i].c-cs[i-1].c;if(d>0)g+=d;else l-=d}if(l===0)return 100;const rs=g/l;return 100-100/(1+rs)}
function atpAtr(cs,p=14){if(cs.length<=p)return 0;let s=0;for(let i=cs.length-p+1;i<cs.length;i++)s+=Math.max(cs[i].h-cs[i].l,Math.abs(cs[i].h-cs[i-1].c),Math.abs(cs[i].l-cs[i-1].c));return s/p}
function atpAnalyze(cs,livePrice=null){
 const n=cs.length,live=Number.isFinite(Number(livePrice))?Number(livePrice):cs.at(-1).c,li=Math.max(2,n-2);if(li<50)return {all:false,status:'NO SETUP',reason:'Not enough candles'};
 const highs=[],lows=[];for(let i=2;i<li-1;i++){if(swingHigh(cs,i))highs.push({i,p:cs[i].h});if(swingLow(cs,i))lows.push({i,p:cs[i].l})}
 let dir='NONE',bos=false,bosI=-1,broken=null,impulseLow=null,impulseHigh=null;
 for(let i=li;i>=25;i--){const h=highs.filter(x=>x.i<i).at(-1),l=lows.filter(x=>x.i<i).at(-1);if(h&&cs[i].c>h.p){dir='BUY';bos=true;bosI=i;broken=h;break}if(l&&cs[i].c<l.p){dir='SELL';bos=true;bosI=i;broken=l;break}}
 if(!bos)return {all:false,status:'NO SETUP',reason:'No fresh BOS'};
 if(dir==='BUY'){impulseLow=lows.filter(x=>x.i<broken.i).at(-1);impulseHigh={i:broken.i,p:broken.p}}else{impulseHigh=highs.filter(x=>x.i<broken.i).at(-1);impulseLow={i:broken.i,p:broken.p}}
 if(!impulseLow||!impulseHigh||bosI-impulseLow.i>55||bosI-impulseHigh.i>55)return {all:false,status:'NO SETUP',reason:'BOS too old'};
 let ob=null;for(let i=bosI-1;i>=Math.max(2,bosI-25);i--){if(dir==='BUY'&&candleBear(cs[i])){ob={i,lo:cs[i].l,hi:cs[i].h};break}if(dir==='SELL'&&candleBull(cs[i])){ob={i,lo:cs[i].l,hi:cs[i].h};break}}
 let fvg=null;for(let i=bosI;i<=li;i++){if(i>=2&&dir==='BUY'&&cs[i].l>cs[i-2].h)fvg={i,lo:cs[i-2].h,hi:cs[i].l};if(i>=2&&dir==='SELL'&&cs[i].h<cs[i-2].l)fvg={i,lo:cs[i].h,hi:cs[i-2].l}}
 if(!ob||!fvg)return {all:false,status:'WATCHING',reason:!ob?'Waiting for OB':'Waiting for FVG',dir,bos,ob,fvg};
 const low=impulseLow.p,high=impulseHigh.p,r=high-low;const ote=dir==='BUY'?{lo:high-r*.79,mid:high-r*.705,hi:high-r*.618}:{lo:low+r*.618,mid:low+r*.705,hi:low+r*.79};
 const start=Math.max(2,Math.min(bosI,li)-35);let oteTouched=false,obRetest=false,fvgRetest=false,reclaim=false,conf=false,displacement=false,liquidity=false;
 for(let i=start;i<=li;i++){const c=cs[i],p=cs[i-1];if(c.h>=ote.lo&&c.l<=ote.hi)oteTouched=true;if(c.h>=ob.lo&&c.l<=ob.hi)obRetest=true;if(c.h>=fvg.lo&&c.l<=fvg.hi)fvgRetest=true;if(i>=1){displacement=displacement||(dir==='BUY'&&candleBull(c)&&body(c)>=body(p)*1.15&&c.c>p.h)||(dir==='SELL'&&candleBear(c)&&body(c)>=body(p)*1.15&&c.c<p.l);conf=conf||(dir==='BUY'&&candleBull(c)&&c.c>=c.l+range(c)*.65)||(dir==='SELL'&&candleBear(c)&&c.c<=c.h-range(c)*.65);const pl=lows.filter(x=>x.i<i).slice(-2).map(x=>x.p),ph=highs.filter(x=>x.i<i).slice(-2).map(x=>x.p);if(dir==='BUY'&&pl.length&&c.l<Math.min(...pl)&&c.c>c.o)liquidity=true;if(dir==='SELL'&&ph.length&&c.h>Math.max(...ph)&&c.c<c.o)liquidity=true;if(dir==='BUY'&&c.c>broken.p&&i>bosI)reclaim=true;if(dir==='SELL'&&c.c<broken.p&&i>bosI)reclaim=true}}
 const rs=atpRsi(cs),atr=atpAtr(cs),avg=cs.slice(Math.max(1,li-19),li+1).reduce((s,c)=>s+(c.h-c.l),0)/20;const rsiOk=dir==='BUY'?rs>=50:rs<=50,atrOk=atr>=avg*.8;const confidence=[displacement,liquidity,rsiOk,atrOk].filter(Boolean).length;
 const entry=live;let sl=null,tp=null,rr=0;if(dir==='BUY'){sl=Math.min(ob.lo,low);const risk=Math.max(entry-sl,0);tp=entry+risk*2;rr=risk>0?2:0}else{sl=Math.max(ob.hi,high);const risk=Math.max(sl-entry,0);tp=entry-risk*2;rr=risk>0?2:0}
 const all=bos&&ob&&fvg&&obRetest&&fvgRetest&&reclaim&&conf&&confidence>=3&&rr>=2;const status=all?(oteTouched?'STRONG':'WEAK'):'WAITING';let reason='Waiting';if(!obRetest||!fvgRetest)reason='Waiting for OB/FVG retest';else if(!reclaim)reason='Retest found — waiting reclaim';else if(!conf)reason='Reclaim found — waiting confirmation';else if(confidence<3)reason=`Confidence ${confidence}/4 — waiting for stronger confluence`;else reason=oteTouched?'OTE touched/rejected + reclaim + confirmation':'No OTE, but reclaim + confidence passed';
 return {all,status,dir,bos,ob,fvg,ote,oteOk:oteTouched,oteTouched,obRetest,fvgRetest,reclaim,conf,displacement,liquidity,rsi:rs,rsiOk,atr,atrOk,confidence,entry,sl,tp,rr,reason,broken,bosI,impulseLow,impulseHigh,livePrice:live};
}
analyze=atpAnalyze;
setTimeout(()=>{try{renderMultiRows();}catch(e){}},100);
