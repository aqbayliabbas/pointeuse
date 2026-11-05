import type { Employee, Punch } from './payroll'
const zone='Africa/Algiers'
const dateOf=(d:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(d)
const clock=(d:Date)=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d)
const mins=(s:string)=>{const [h,m]=s.split(':').map(Number);return h*60+m}
const duration=(m:number)=>`${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`
const labels={debut:'Entrée',pause:'Pause',retour:'Retour',sortie:'Sortie'}
export const headers=['Date','Jour','Planning','Pointages','Heures travaillées','Heures retenues pour la paie','Cumul travaillé','Cumul paie','Statut']
export function monthlyReport(employee:Employee,events:Punch[],month:string,today=dateOf(new Date())) {
 const [year,m]=month.split('-').map(Number)
 const count=new Date(Date.UTC(year,m,0)).getUTCDate()
 let cumulative=0, paidCumulative=0
 const rows=[]
 for(let day=1;day<=count;day++){
  const date=`${month}-${String(day).padStart(2,'0')}`, d=new Date(date+'T12:00:00Z')
  const shift=employee.schedule[d.getUTCDay()]
  const active=date>=employee.start_date&&(!employee.end_date||date<=employee.end_date)
  const punches=events.filter(p=>p.employee_id===employee.id&&dateOf(new Date(p.event_at))===date).sort((a,b)=>Date.parse(a.event_at)-Date.parse(b.event_at))
  let opened:number|null=null,worked=0,paid=0,invalid=false,state:Punch['event_type']|null=null
  for(const p of punches){
   const time=mins(clock(new Date(p.event_at)))
   const valid=(!state&&p.event_type==='debut')||((state==='debut'||state==='retour')&&['pause','sortie'].includes(p.event_type))||(state==='pause'&&['retour','sortie'].includes(p.event_type))
   if(!valid){invalid=true;continue}
   if(p.event_type==='debut'||p.event_type==='retour')opened=time
   else if(opened!==null){worked+=Math.max(0,time-opened);if(shift?.enabled)paid+=Math.max(0,Math.min(time,mins(shift.end))-Math.max(opened,mins(shift.start)));opened=null}
   state=p.event_type
  }
  if(!active||date>today)paid=0
  if(shift?.enabled)paid=Math.min(paid,Math.max(0,mins(shift.end)-mins(shift.start)))
  cumulative+=worked;paidCumulative+=paid
  const status=invalid?'À vérifier':punches.length&&state!=='sortie'?(date>=today?'En cours':'Pointage incomplet'):!active?'Hors contrat':date>today?'À venir':!shift?.enabled?'Repos':!punches.length?(date===today?'En attente':'Absence'):'Terminé'
  rows.push({date,day:new Intl.DateTimeFormat('fr-FR',{weekday:'long',timeZone:zone}).format(d),planning:shift?.enabled?`${shift.start} – ${shift.end}`:'Repos',punches:punches.map(p=>`${labels[p.event_type]} ${clock(new Date(p.event_at))}`).join(' | '),worked,paid,cumulative,paidCumulative,status})
 }
 return {employee,rows,total:cumulative,paidTotal:paidCumulative}
}
export type Report=ReturnType<typeof monthlyReport>
function safeCsv(value:unknown){let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
export function csvContent(reports:Report[]){
 const rows:unknown[][]=[['Employée','Identifiant',...headers]]
 for(const r of reports){for(const d of r.rows)rows.push([r.employee.full_name,r.employee.id,d.date,d.day,d.planning,d.punches,duration(d.worked),duration(d.paid),duration(d.cumulative),duration(d.paidCumulative),d.status]);rows.push([r.employee.full_name,r.employee.id,'TOTAL','','','',duration(r.total),duration(r.paidTotal),duration(r.total),duration(r.paidTotal),''])}
 return '\uFEFF'+rows.map(row=>row.map(safeCsv).join(';')).join('\r\n')
}
export async function excelBuffer(reports:Report[],month:string){
 const ExcelJS=await import('exceljs')
 const book=new ExcelJS.default.Workbook();book.creator='Atelier';book.created=new Date()
 const used=new Set<string>()
 for(const r of reports){
  const base=(r.employee.full_name.replace(/[\\/*?:\[\]\x00-\x1f]/g,' ').replace(/^'+|'+$/g,'').trim()||'Employée').slice(0,31)
  let name=base,index=2
  while(used.has(name.toLowerCase())||name.toLowerCase()==='history'){const suffix=` (${index++})`;name=base.slice(0,31-suffix.length)+suffix}
  used.add(name.toLowerCase())
  const sheet=book.addWorksheet(name,{views:[{state:'frozen',ySplit:4}],pageSetup:{orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}})
  sheet.addRow([r.employee.full_name+' — '+month]);sheet.mergeCells('A1:I1')
  sheet.addRow(['Fuseau : Africa/Algiers · Durées : heures:minutes · Pauses exclues']);sheet.mergeCells('A2:I2')
  sheet.addRow(['Heures retenues : limitées au planning. Pointages incomplets à vérifier avant paiement.']);sheet.mergeCells('A3:I3')
  sheet.addRow(headers)
  for(const d of r.rows)sheet.addRow([d.date,d.day,d.planning,d.punches,d.worked/1440,d.paid/1440,d.cumulative/1440,d.paidCumulative/1440,d.status])
  const total=sheet.addRow(['TOTAL','','','',r.total/1440,r.paidTotal/1440,r.total/1440,r.paidTotal/1440,''])
  for(const i of [5,6,7,8])sheet.getColumn(i).numFmt='[h]:mm'
  ;[14,14,20,65,21,25,20,20,24].forEach((width,i)=>sheet.getColumn(i+1).width=width)
  sheet.getRow(1).font={bold:true,size:16};sheet.getRow(1).height=28
  sheet.getRow(4).height=32;sheet.getRow(4).font={bold:true,color:{argb:'FFFFFFFF'}}
  sheet.getRow(4).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF191919'}}
  sheet.eachRow((row,n)=>{row.alignment={vertical:'middle',wrapText:true};if(n>4&&n<total.number){row.height=36;if(n%2===1)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF3F4F6'}}}})
  total.font={bold:true};total.height=28;sheet.autoFilter={from:'A4',to:`I${total.number-1}`}
 }
 return book.xlsx.writeBuffer()
}
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
export async function downloadMonth(employees:Employee[],events:Punch[],month:string,format:'xlsx'|'csv'){
 const reports=employees.filter(e=>e.start_date<=month+'-31'&&(!e.end_date||e.end_date>=month+'-01')).map(e=>monthlyReport(e,events,month))
 if(!reports.length)throw new Error('Aucune employée pour le mois sélectionné.')
 if(format==='csv')download(new Blob([csvContent(reports)],{type:'text/csv;charset=utf-8'}),`pointages-${month}.csv`)
 else {const buffer=await excelBuffer(reports,month);download(new Blob([new Uint8Array(buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`pointages-${month}.xlsx`)}
}
