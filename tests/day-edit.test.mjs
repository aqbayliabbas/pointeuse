import test from 'node:test'
import assert from 'node:assert/strict'
import {validateDay} from '../lib/day-edit.ts'
const row=(event_type,time)=>({event_type,time})
test('day correction accepts complete day with several pauses',()=>assert.equal(validateDay([row('debut','08:00'),row('pause','10:00'),row('retour','10:15'),row('pause','12:00'),row('retour','13:00'),row('sortie','17:00')]),''))
test('day correction allows empty absence',()=>assert.equal(validateDay([]),''))
test('day correction rejects duplicates, missing exit, bad time and sequence',()=>{
 for(const rows of [[row('debut','09:00')],[row('debut','09:00'),row('sortie','09:00')],[row('sortie','17:00')],[row('debut','25:00'),row('sortie','26:00')],[row('debut','09:00'),row('retour','10:00'),row('sortie','17:00')]])assert.notEqual(validateDay(rows),'')
})
