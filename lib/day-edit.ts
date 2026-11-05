export type DayEntry = { event_type: 'debut' | 'pause' | 'retour' | 'sortie'; time: string }
export function validateDay(entries: DayEntry[]) {
 let state: string | null=null, previous=''
 for(const e of entries){
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)||e.time<=previous)return 'Les heures doivent être valides et strictement croissantes.'
  const valid=(!state&&e.event_type==='debut')||((state==='debut'||state==='retour')&&['pause','sortie'].includes(e.event_type))||(state==='pause'&&['retour','sortie'].includes(e.event_type))
  if(!valid)return 'Respectez l’ordre : entrée, pause/retour éventuels, puis sortie.'
  state=e.event_type;previous=e.time
 }
 return entries.length&&state!=='sortie'?'Ajoutez une sortie pour terminer la journée.':''
}
