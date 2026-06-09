// ── LINE Messaging API ────────────────────────────────────────────────────────
// ส่งข้อความเข้ากลุ่ม LINE ผ่าน Messaging API
// ต้องใช้ LINE_CHANNEL_TOKEN และ LINE_GROUP_ID จากตั้งค่า

export async function apiSendLine(message, channelToken, groupIds) {
  // groupIds = [{id, name, groupId}, ...] array
  const ids = (groupIds||[]).map(g => g.groupId).filter(Boolean)
  if (!channelToken || ids.length === 0) {
    return { ok: false, error: "ยังไม่ได้ตั้งค่า Token หรือ Group ID" }
  }
  try {
    const res = await fetch("/api/send-line", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, channelToken, groupIds: ids }),
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error("LINE API error:", err)
    return { ok: false, error: err.message }
  }
}

// ── Google Apps Script (บันทึกข้อมูล) ───────────────────────────────────────
const GAS_URL = "https://script.google.com/macros/s/AKfycbx3yPEgwonMB76MIsLVqO8R0k0bHibPy_ViH6L-HNcDz281sqNZtwauWRR6jUWk72Dkpw/exec"

async function gasPost(payload) {
  try {
    await fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return { ok: true }
  } catch (err) {
    console.error("GAS error:", err)
    return { ok: false, error: err.message }
  }
}

export async function apiSaveStock({ round, products, zones }) {
  const n = new Date()
  const thaiDate = `${n.getDate()}/${n.getMonth()+1}/${n.getFullYear()+543}`
  const thaiTime = `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`
  const zoneMap = {}
  zones.forEach(z => { zoneMap[z.id] = z.name })
  return gasPost({
    action: "saveStock", date: thaiDate, time: thaiTime, round,
    items: products.map(p => ({ id:p.id, name:p.name, zone:zoneMap[p.zone]||p.zone,
      val:p[round]||0, unit:p.unit, min:p.min })),
  })
}

export async function apiSaveOrder({ products, zones }) {
  const n = new Date()
  const thaiDate = `${n.getDate()}/${n.getMonth()+1}/${n.getFullYear()+543}`
  const thaiTime = `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`
  const zoneMap = {}
  zones.forEach(z => { zoneMap[z.id] = z.name })
  return gasPost({
    action: "saveOrder", date: thaiDate, time: thaiTime,
    items: products.filter(p=>p.order>0).map(p => ({
      id:p.id, name:p.name, zone:zoneMap[p.zone]||p.zone,
      order:p.order, unit:p.unit, shop:p.shop, cost:p.cost||0 })),
  })
}

export async function apiSaveAndSend({ round, products, zones, message, channelToken, groupIds }) {
  await apiSaveStock({ round, products, zones })
  return apiSendLine(message, channelToken, groupIds)
}
