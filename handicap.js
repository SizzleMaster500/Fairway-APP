// Fairway v0.9.8 — extracted from v0.9.7; behaviour preserved.
function handicapRoundDifferential(r){
 const cr=Number(r.cr),slope=Number(r.slope),n=r.scores.length;
 if(![9,18].includes(n)||r.cr===null||r.cr===undefined||r.cr===''||r.slope===null||r.slope===undefined||r.slope===''||!Number.isFinite(cr)||cr<=0||!Number.isFinite(slope)||slope<55||slope>155)return null;
 const gross=r.scores.reduce((a,b)=>a+b,0),par=r.pars.reduce((a,b)=>a+b,0);
 const referenceHI=Number.isFinite(Number(db.officialHcp))&&db.officialHcp!==null&&db.officialHcp!==undefined?Number(db.officialHcp):null;
 let adjusted=gross,adjustedHoles=0,courseHcp=null;
 if(n===18&&referenceHI!==null&&validStrokeIndices(r.strokeIndices,n)&&r.strokeIndices.every(Number.isInteger)){
   courseHcp=Math.round(referenceHI*slope/113+cr-par);
   adjusted=r.scores.reduce((total,strokes,i)=>{
     const allocated=Math.floor(courseHcp/18)+(r.strokeIndices[i]<=((courseHcp%18)+18)%18?1:0);
     const cap=r.pars[i]+2+allocated;
     if(strokes>cap)adjustedHoles++;
     return total+Math.min(strokes,cap);
   },0);
 }
 const pcc=Number.isFinite(Number(r.pcc))&&r.pcc!==null&&r.pcc!==undefined?Number(r.pcc):0;
 const played=(adjusted-cr-pcc)*113/slope;
 return {value:n===9?played*2:played,played,gross,adjusted,adjustedHoles,courseHcp,referenceHI,holes:n,approx:n===9,pcc,adjustmentAvailable:n===18&&adjustedHoles>=0&&courseHcp!==null};
}

function hcpFromDiffs(items){
 const recent=items.slice(-20),n=recent.length;
 if(!n)return null;
 const counts=[0,1,1,1,1,1,2,2,2,3,3,3,4,4,4,5,5,6,6,7,8];
 const count=counts[n],values=recent.map(x=>x.diff.value).sort((a,b)=>a-b);
 let estimate=values.slice(0,count).reduce((a,b)=>a+b,0)/count;
 if(n<=3)estimate-=2;else if(n===4||n===6)estimate-=1;
 return Math.min(54,Math.max(0,Math.round(estimate*10)/10));
}

function hcpRecords(rounds){
 const ordered=rounds.map((r,i)=>({r,i,diff:handicapRoundDifferential(r)})).filter(x=>x.diff!==null).sort((a,b)=>String(a.r.date).localeCompare(String(b.r.date))||a.i-b.i);
 return ordered.map((x,i)=>({...x,hcp:hcpFromDiffs(ordered.slice(0,i+1))}));
}

function renderHandicap(rounds){
 const records=hcpRecords(rounds.filter(r=>!r.test)),last=records[records.length-1],current=last?last.hcp:null;
 const display=current===null?'—':current.toFixed(1);
 document.getElementById('hcpValue').textContent=display;
 document.getElementById('hcpDetailValue').textContent=display;
 document.getElementById('hcpRoundCount').textContent=String(records.length);
 document.getElementById('hcpHoleCount').textContent=records.reduce((sum,x)=>sum+x.diff.holes,0)+' rated holes recorded';
 const unrated=rounds.length-records.length;
 document.getElementById('hcpDescription').textContent=records.length?'Personal estimate from '+records.length+' rated rounds (9 and 18 holes). '+(unrated?unrated+' unrated rounds not included. ':'')+'Not an official WHS index.':'No rated rounds yet. Add Course Rating and Slope to new rounds to calculate a personal estimate.';
 const first=records[0];
 document.getElementById('hcpTrend').textContent=first&&last?'Change since first rated round: '+((last.hcp-first.hcp)>0?'+':'')+(last.hcp-first.hcp).toFixed(1):'Your playing-level estimate';
 const list=document.getElementById('hcpRoundList');list.replaceChildren();
 if(!records.length)list.append(node('p','No rated rounds yet. Your saved rounds are still counted in History and Awards.','muted'));
 records.slice().reverse().forEach(x=>{const wrap=node('div',undefined,'hcp-entry'),a=node('div'),b=node('div',undefined,'hcp-entry-right');a.append(node('strong',x.r.course),node('small',displayDate(x.r.date)+' · '+x.diff.holes+' holes · '+x.r.tees));b.append(node('strong',x.diff.value.toFixed(1)),node('small',x.diff.approx?'9-hole approximation':(x.diff.adjustmentAvailable?'Adjusted '+x.diff.adjusted+' / gross '+x.diff.gross:'Gross '+x.diff.gross+' · SI/HI needed for adjustment')));wrap.append(a,b);list.append(wrap);});
 const chart=document.getElementById('hcpChart');chart.replaceChildren();
 if(!records.length){chart.append(node('p','Your handicap chart will appear after your first rated round.','muted'));document.getElementById('hcpChartCaption').textContent='Save a rated round to start your chart.';return;}
 const vals=records.map(x=>x.hcp),min=Math.min(...vals),max=Math.max(...vals),low=Math.max(0,Math.floor(min-3)),high=Math.min(54,Math.max(low+1,Math.ceil(max+3))),W=640,H=220,left=42,right=14,top=20,bottom=35;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('role','img');svg.setAttribute('aria-label','Fairway handicap progression chart, '+records.length+' rated rounds');
 const make=(tag,attrs)=>{let e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));svg.append(e);return e;};
 const x=i=>left+(W-left-right)*(records.length===1?0.5:i/(records.length-1));const y=v=>top+(H-top-bottom)*(high-v)/(high-low);
 [0,1,2,3,4].forEach(i=>{let value=low+(high-low)*i/4;make('line',{x1:left,y1:y(value),x2:W-right,y2:y(value),stroke:'#3b614a','stroke-width':1});let t=make('text',{x:34,y:y(value)+4,fill:'#b6cbb9','font-size':12,'text-anchor':'end'});t.textContent=value.toFixed(0);});
 make('polyline',{points:records.map((r,i)=>x(i)+','+y(r.hcp)).join(' '),fill:'none',stroke:'#e6c779','stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'});
 records.forEach((r,i)=>{let dot=make('circle',{cx:x(i),cy:y(r.hcp),r:records.length>30?2.5:4,fill:'#f5da91'});let title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=displayDate(r.r.date)+' · '+r.r.course+' · '+r.hcp.toFixed(1);dot.append(title);});
 const t=make('text',{x:left,y:H-8,fill:'#b6cbb9','font-size':12});t.textContent='First round';const t2=make('text',{x:W-right,y:H-8,fill:'#b6cbb9','font-size':12,'text-anchor':'end'});t2.textContent='Latest round';chart.append(svg);
 document.getElementById('hcpChartCaption').textContent='Lower is better · '+records.length+' rated rounds · 9-hole scores use a non-WHS approximation.';
}
