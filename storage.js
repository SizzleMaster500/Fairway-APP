// Fairway v0.9.8 — extracted from v0.9.7; behaviour preserved.
function validRound(r){return r&&typeof r.course==='string'&&typeof r.date==='string'&&Array.isArray(r.pars)&&Array.isArray(r.scores)&&[9,18].includes(r.pars.length)&&r.pars.length===r.scores.length&&r.pars.every(p=>Number.isInteger(p)&&p>=1&&p<=10)&&r.scores.every(s=>s===null||(Number.isInteger(s)&&s>=1&&s<=30));}

function load(){let d;try{d=JSON.parse(localStorage.getItem(KEY))}catch(e){}if(d&&Array.isArray(d.rounds)&&Array.isArray(d.courses))return d;let old;try{old=JSON.parse(localStorage.getItem(OLD))}catch(e){}return{rounds:Array.isArray(old?.rounds)?old.rounds.filter(validRound):[],draft:validRound(old?.draft)?old.draft:null,courses:[]};}

function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){alert('Unable to save on this device. Export a backup.')}render();}

function exportBackup(){let blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='fairway-backup-'+new Date().toLocaleDateString('en-CA')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}

async function importBackup(ev){let f=ev.target.files?.[0];if(!f)return;try{let d=JSON.parse(await f.text());if(!Array.isArray(d.rounds)||d.rounds.some(r=>!validRound(r))||d.rounds.some(r=>r.scores.includes(null))||(d.courses!==undefined&&(!Array.isArray(d.courses)||d.courses.some(c=>!c||typeof c.name!=='string'||!Array.isArray(c.pars)||![9,18].includes(c.pars.length)||c.pars.some(p=>!Number.isInteger(p)||p<1||p>10)))))throw Error('Invalid backup');if(confirm('Replace all local rounds and courses with this backup?')){db={...d,rounds:d.rounds,courses:d.courses||[],draft:validRound(d.draft)?d.draft:null};save();note('Backup restored.');}}catch(e){alert('Invalid backup file.');}ev.target.value='';}
