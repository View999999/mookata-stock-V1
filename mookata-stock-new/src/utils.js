export function todayKey() {
  const n = new Date()
  return `${n.getFullYear()}-${n.getMonth()+1}-${n.getDate()}`
}
export function todayStr() {
  const n = new Date()
  return `${n.getDate()}/${n.getMonth()+1}/${n.getFullYear()+543}`
}
export function fmtDate(dk) {
  const [y,m,d] = dk.split("-")
  return `${d}/${m}/${parseInt(y)+543}`
}
export function prevKey(dateKey, sortedAsc) {
  const idx = sortedAsc.indexOf(dateKey)
  return idx > 0 ? sortedAsc[idx-1] : null
}
export function buildMsg(type, zoneId, products, zones, history, todayKeyVal) {
  const dateStr = todayStr()
  const labels = { morning:"สั่งรอบเช้า", close:"ปิดร้าน", used:"ยอดใช้ไปจริง", order:"รายการสั่งของ" }
  let msg = `📦 รายงานสต็อก (${labels[type]||type})\n📅 ${dateStr}\n`
  const zlist = zoneId==="all" ? zones : zones.filter(z=>z.id===zoneId)

  if (type === "used") {
    const pdk = (() => {
      const sorted = [...new Set(history.map(h=>h.dateKey))].sort()
      const idx = sorted.indexOf(todayKeyVal)
      return idx > 0 ? sorted[idx-1] : null
    })()
    const todayRecs = history.filter(h=>h.dateKey===todayKeyVal)
    const prevRecs  = pdk ? history.filter(h=>h.dateKey===pdk) : []
    const mRec  = todayRecs.find(h=>h.round==="morning")
    const cRec  = todayRecs.find(h=>h.round==="close")
    const pcRec = prevRecs.find(h=>h.round==="close")
    zlist.forEach(z => {
      const zp = products.filter(p=>p.zone===z.id)
      if (!zp.length) return
      msg += `\n🏷 ${z.name}\n`
      zp.forEach(p => {
        const prevClose = pcRec?.snapshot.find(x=>x.id===p.id)?.val ?? 0
        const morning   = mRec?.snapshot.find(x=>x.id===p.id)?.val ?? 0
        const tc        = cRec?.snapshot.find(x=>x.id===p.id)?.val ?? null
        const used      = tc !== null ? Math.max(0, prevClose+morning-tc) : null
        if (used !== null)
          msg += `${tc===0?"🔴":tc<p.min?"🟡":"🟢"} ${p.name}: ใช้ ${used} ${p.unit} เหลือ ${tc}\n`
        else
          msg += `⚪ ${p.name}: รอปิดร้าน\n`
      })
    })
  } else if (type === "order") {
    const hasOrder = products.some(p=>p.order>0)
    if (!hasOrder) { msg += "\n(ยังไม่มีรายการสั่ง)" }
    else zlist.forEach(z => {
      const zp = products.filter(p=>p.zone===z.id&&p.order>0)
      if (!zp.length) return
      msg += `\n🏷 ${z.name}\n`
      zp.forEach(p => { msg += `🛒 ${p.name}: สั่ง ${p.order} ${p.unit} (${p.shop})\n` })
    })
  } else {
    zlist.forEach(z => {
      const zp = products.filter(p=>p.zone===z.id)
      if (!zp.length) return
      msg += `\n🏷 ${z.name}\n`
      zp.forEach(p => {
        const val = p[type]||0
        msg += `${val===0?"🔴":val<p.min?"🟡":"🟢"} ${p.name}: ${val} ${p.unit}\n`
      })
    })
    const low = products.filter(p=>(zoneId==="all"||p.zone===zoneId)&&(p[type]||0)<p.min)
    if (low.length) msg += `\n⚠️ ต้องสั่งด่วน: ${low.map(p=>p.name).join(", ")}`
  }
  return msg
}
