// ── Google Apps Script endpoint ──────────────────
const GAS_URL = "https://script.google.com/macros/s/AKfycbx3yPEgwonMB76MIsLVqO8R0k0bHibPy_ViH6L-HNcDz281sqNZtwauWRR6jUWk72Dkpw/exec"

async function gasPost(payload) {
  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors", // GAS ไม่ support CORS ต้องใช้ no-cors
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    // no-cors จะไม่ได้ response body แต่ request ถูกส่งไปแล้ว
    return { ok: true }
  } catch (err) {
    console.error("GAS error:", err)
    return { ok: false, error: err.message }
  }
}

// บันทึกสต็อก
export async function apiSaveStock({ round, products, zones, date, time }) {
  const thaiDate = date || (() => {
    const n = new Date()
    return `${n.getDate()}/${n.getMonth()+1}/${n.getFullYear()+543}`
  })()
  const thaiTime = time || (() => {
    const n = new Date()
    return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`
  })()

  const zoneMap = {}
  zones.forEach(z => { zoneMap[z.id] = z.name })

  return gasPost({
    action: "saveStock",
    date: thaiDate,
    time: thaiTime,
    round,
    items: products.map(p => ({
      id:   p.id,
      name: p.name,
      zone: zoneMap[p.zone] || p.zone,
      val:  p[round] || 0,
      unit: p.unit,
      min:  p.min,
    })),
  })
}

// บันทึกสั่งของ
export async function apiSaveOrder({ products, zones, date, time }) {
  const thaiDate = date || (() => {
    const n = new Date()
    return `${n.getDate()}/${n.getMonth()+1}/${n.getFullYear()+543}`
  })()
  const thaiTime = time || (() => {
    const n = new Date()
    return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`
  })()

  const zoneMap = {}
  zones.forEach(z => { zoneMap[z.id] = z.name })

  return gasPost({
    action: "saveOrder",
    date: thaiDate,
    time: thaiTime,
    items: products
      .filter(p => p.order > 0)
      .map(p => ({
        id:    p.id,
        name:  p.name,
        zone:  zoneMap[p.zone] || p.zone,
        order: p.order,
        unit:  p.unit,
        shop:  p.shop,
        cost:  p.cost || 0,
      })),
  })
}

// ส่ง LINE
export async function apiSendLine(message) {
  return gasPost({
    action: "sendLine",
    message,
  })
}

// บันทึก + ส่ง LINE พร้อมกัน
export async function apiSaveAndSend({ round, products, zones, message }) {
  const thaiDate = (() => {
    const n = new Date()
    return `${n.getDate()}/${n.getMonth()+1}/${n.getFullYear()+543}`
  })()
  const thaiTime = (() => {
    const n = new Date()
    return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`
  })()

  const zoneMap = {}
  zones.forEach(z => { zoneMap[z.id] = z.name })

  return gasPost({
    action: "saveAndSendLine",
    date: thaiDate,
    time: thaiTime,
    round,
    message,
    items: products.map(p => ({
      id:   p.id,
      name: p.name,
      zone: zoneMap[p.zone] || p.zone,
      val:  p[round] || 0,
      unit: p.unit,
      min:  p.min,
    })),
  })
}
