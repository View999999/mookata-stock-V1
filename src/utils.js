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
export function buildMsg(type, zoneIds, products, zones, history, todayKeyVal, senderName, shopFilter, barFilter) {
  const dateStr = todayStr()
  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`
  const labels = { morning:"เช็คที่สั่ง", close:"ปิดร้าน", used:"ยอดใช้ไปจริง", order:"รายการสั่งของ" }
  const sender = senderName ? `👤 ส่งโดย: ${senderName}` : ""

  // zoneIds = "all" or array of zone ids (โซน = ร้านค้า)
  const zoneFilter = zoneIds === "all" ? zones : zones.filter(z => zoneIds.includes(z.id))

  // กรองสินค้าตาม shopFilter (ร้านค้า/ซัพพลาย) และ barFilter (บาร์/หมวดหมู่)
  const filterProducts = (prods) => {
    let result = prods
    if (shopFilter && shopFilter !== "all" && shopFilter.length > 0)
      result = result.filter(p => shopFilter.includes(p.shop))
    if (barFilter && barFilter !== "all" && barFilter.length > 0)
      result = result.filter(p => barFilter.includes(p.bar))
    return result
  }

  let msg = `📦 รายงานสต็อก (${labels[type]||type})\n📅 ${dateStr} ⏰ ${timeStr}\n`
  if (sender) msg += `${sender}\n`
  if (shopFilter && shopFilter !== "all" && shopFilter.length > 0)
    msg += `🏪 ร้านค้า: ${shopFilter.join(", ")}\n`
  if (barFilter && barFilter !== "all" && barFilter.length > 0)
    msg += `🍽 บาร์: ${barFilter.join(", ")}\n`
  msg += `──────────────\n`

  if (type === "used") {
    const sorted = [...new Set(history.map(h=>h.dateKey))].sort()
    const idx = sorted.indexOf(todayKeyVal)
    const pdk = idx > 0 ? sorted[idx-1] : null
    const todayRecs = history.filter(h=>h.dateKey===todayKeyVal)
    const prevRecs  = pdk ? history.filter(h=>h.dateKey===pdk) : []
    const mRec  = todayRecs.find(h=>h.round==="morning")
    const cRec  = todayRecs.find(h=>h.round==="close")
    const pcRec = prevRecs.find(h=>h.round==="close")
    zoneFilter.forEach(z => {
      const zp = filterProducts(products.filter(p=>p.zone===z.id))
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
    const allOrderProds = filterProducts(products.filter(p=>p.order>0))
    if (!allOrderProds.length) { msg += "\n(ยังไม่มีรายการสั่ง)" }
    else zoneFilter.forEach(z => {
      const zp = allOrderProds.filter(p=>p.zone===z.id)
      if (!zp.length) return
      msg += `\n🏷 ${z.name}\n`
      zp.forEach(p => { msg += `🛒 ${p.name}: สั่ง ${p.order} ${p.unit} (${p.shop})\n` })
    })
  } else {
    zoneFilter.forEach(z => {
      const zp = filterProducts(products.filter(p=>p.zone===z.id))
      if (!zp.length) return
      msg += `\n🏷 ${z.name}\n`
      zp.forEach(p => {
        const val = p[type]||0
        msg += `${val===0?"🔴":val<p.min?"🟡":"🟢"} ${p.name}: ${val} ${p.unit}\n`
      })
    })
    const filteredProds = filterProducts(zoneIds==="all" ? products : products.filter(p=>zoneIds.includes(p.zone)))
    const low = filteredProds.filter(p=>(p[type]||0)<p.min)
    if (low.length) msg += `\n⚠️ ต้องสั่งด่วน: ${low.map(p=>p.name).join(", ")}`
  }
  return msg
}
