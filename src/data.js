import { db } from "./firebase"
import {
  doc, getDoc, setDoc, onSnapshot, collection, getDocs
} from "firebase/firestore"

export const OWNER_PIN = "1234"

// ── ค่าเริ่มต้น ──────────────────────────────────────────
export const DEFAULT_ZONES = [
  { id: "z0", name: "เนื้อสัตว์",        color: "#7C6FFF" },
  { id: "z1", name: "ซีฟู้ด",            color: "#27AE8A" },
  { id: "z2", name: "ผัก/เครื่องเคียง",  color: "#E06B3A" },
  { id: "z3", name: "เครื่องดื่ม",        color: "#B8478A" },
  { id: "z4", name: "อุปกรณ์โต๊ะ",       color: "#2E86DE" },
  { id: "z5", name: "เสริฟ/สุขภัณฑ์",    color: "#D4A017" },
]

export const DEFAULT_SHOPS = [
  "ตลาดสด ก.", "ซัพพลาย B", "แม็คโคร", "โลตัส", "ร้านท้องถิ่น",
]

export const DEFAULT_PRODUCTS = [
  { id:1,  name:"หมูสามชั้น",  zone:"z0", unit:"กก.",     min:5,  cost:180, morning:0, close:0, order:0, shop:"ตลาดสด ก." },
  { id:2,  name:"หมูคอ",       zone:"z0", unit:"กก.",     min:5,  cost:160, morning:0, close:0, order:0, shop:"ตลาดสด ก." },
  { id:3,  name:"ไก่หมัก",     zone:"z0", unit:"กก.",     min:3,  cost:90,  morning:0, close:0, order:0, shop:"ตลาดสด ก." },
  { id:4,  name:"กุ้งขาว",     zone:"z1", unit:"กก.",     min:4,  cost:220, morning:0, close:0, order:0, shop:"ตลาดสด ก." },
  { id:5,  name:"หอยแมลงภู่",  zone:"z1", unit:"กก.",     min:3,  cost:80,  morning:0, close:0, order:0, shop:"ตลาดสด ก." },
  { id:6,  name:"ปลาหมึก",     zone:"z1", unit:"กก.",     min:3,  cost:150, morning:0, close:0, order:0, shop:"ตลาดสด ก." },
  { id:7,  name:"ผักบุ้ง",     zone:"z2", unit:"กก.",     min:2,  cost:25,  morning:0, close:0, order:0, shop:"ตลาดสด ก." },
  { id:8,  name:"เห็ดรวม",     zone:"z2", unit:"กก.",     min:2,  cost:60,  morning:0, close:0, order:0, shop:"ตลาดสด ก." },
  { id:9,  name:"น้ำอัดลม",    zone:"z3", unit:"กระป๋อง", min:24, cost:12,  morning:0, close:0, order:0, shop:"แม็คโคร"   },
  { id:10, name:"น้ำเปล่า",    zone:"z3", unit:"ขวด",     min:24, cost:6,   morning:0, close:0, order:0, shop:"โลตัส"     },
  { id:11, name:"ถ่าน",        zone:"z4", unit:"ถุง",      min:5,  cost:35,  morning:0, close:0, order:0, shop:"ร้านท้องถิ่น" },
  { id:12, name:"กระดาษฟอยล์", zone:"z4", unit:"ม้วน",    min:3,  cost:45,  morning:0, close:0, order:0, shop:"แม็คโคร"   },
  { id:13, name:"ทิชชู่",      zone:"z5", unit:"ม้วน",    min:20, cost:8,   morning:0, close:0, order:0, shop:"โลตัส"     },
  { id:14, name:"ถุงมือ",      zone:"z5", unit:"คู่",      min:50, cost:3,   morning:0, close:0, order:0, shop:"โลตัส"     },
]

// ── Firestore document paths ──────────────────────────────
// ข้อมูลร้านทั้งหมดเก็บใน collection "shop" document "main"
// ประวัติเก็บใน collection "history" แยก document ต่อวัน

const SHOP_REF = () => doc(db, "shop", "main")
const HISTORY_REF = (dateKey) => doc(db, "history", dateKey)
const HISTORY_COL = () => collection(db, "history")

// ── โหลดข้อมูลทั้งหมดครั้งแรก ────────────────────────────
export async function loadAll() {
  try {
    const [shopSnap, histSnap] = await Promise.all([
      getDoc(SHOP_REF()),
      getDocs(HISTORY_COL()),
    ])

    let shopData = {}
    if (shopSnap.exists()) {
      shopData = shopSnap.data()
    } else {
      // ครั้งแรก — เขียนค่า default ลง Firestore
      const defaults = {
        products:    DEFAULT_PRODUCTS,
        zones:       DEFAULT_ZONES,
        shops:       DEFAULT_SHOPS,
        token:       "",
        groupIds:    [],
        staff:       [],
        activeStaff: "",
        nextId:      100,
      }
      await setDoc(SHOP_REF(), defaults)
      shopData = defaults
    }

    const history = []
    histSnap.forEach(d => {
      const data = d.data()
      if (data.entries) history.push(...data.entries)
    })

    return {
      products:    shopData.products    ?? DEFAULT_PRODUCTS,
      zones:       shopData.zones       ?? DEFAULT_ZONES,
      shops:       shopData.shops       ?? DEFAULT_SHOPS,
      token:       shopData.token       ?? "",
      groupIds:    shopData.groupIds    ?? [],
      staff:       shopData.staff       ?? [],
      activeStaff: shopData.activeStaff ?? "",
      nextId:      shopData.nextId      ?? 100,
      ownerPin:    shopData.ownerPin    ?? OWNER_PIN,
      history,
    }
  } catch (err) {
    console.error("loadAll error:", err)
    // fallback localStorage ถ้า offline
    return loadFromLocalStorage()
  }
}

// ── realtime listener (เรียกครั้งเดียว ได้ update ตลอด) ──
export function subscribeShop(callback) {
  return onSnapshot(SHOP_REF(), (snap) => {
    if (snap.exists()) callback(snap.data())
  })
}

export function subscribeHistory(callback) {
  return onSnapshot(HISTORY_COL(), (snap) => {
    const history = []
    snap.forEach(d => {
      const data = d.data()
      if (data.entries) history.push(...data.entries)
    })
    callback(history)
  })
}

// ── persist แต่ละ field ──────────────────────────────────
// เขียนแบบ merge เพื่อไม่ overwrite field อื่น
async function saveField(field, value) {
  try {
    await setDoc(SHOP_REF(), { [field]: value }, { merge: true })
    // backup localStorage ด้วย
    localStorage.setItem("mk_" + field, JSON.stringify(value))
  } catch (err) {
    console.error("saveField error:", err)
    localStorage.setItem("mk_" + field, JSON.stringify(value))
  }
}

export const persist = {
  products:    (v) => saveField("products",    v),
  zones:       (v) => saveField("zones",       v),
  shops:       (v) => saveField("shops",       v),
  token:       (v) => saveField("token",       v),
  groupIds:    (v) => saveField("groupIds",    v),
  staff:       (v) => saveField("staff",       v),
  activeStaff: (v) => saveField("activeStaff", v),
  nextId:      (v) => saveField("nextId",      v),
  ownerPin:    (v) => saveField("ownerPin",    v),
  history: async (entries) => {
    // แยก document ต่อวัน เพื่อไม่ให้ document ใหญ่เกิน 1MB
    const byDay = {}
    entries.forEach(e => {
      if (!byDay[e.dateKey]) byDay[e.dateKey] = []
      byDay[e.dateKey].push(e)
    })
    try {
      await Promise.all(
        Object.entries(byDay).map(([dk, ents]) =>
          setDoc(HISTORY_REF(dk), { entries: ents }, { merge: false })
        )
      )
      localStorage.setItem("mk_history", JSON.stringify(entries))
    } catch (err) {
      console.error("persist.history error:", err)
      localStorage.setItem("mk_history", JSON.stringify(entries))
    }
  },
}

// ── fallback localStorage (offline) ──────────────────────
function loadFromLocalStorage() {
  const get = (key, def) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
  }
  return {
    products:    get("mk_products",    DEFAULT_PRODUCTS),
    zones:       get("mk_zones",       DEFAULT_ZONES),
    shops:       get("mk_shops",       DEFAULT_SHOPS),
    history:     get("mk_history",     []),
    token:       get("mk_token",       ""),
    groupIds:    get("mk_groupIds",    []),
    staff:       get("mk_staff",       []),
    activeStaff: get("mk_activeStaff", ""),
    nextId:      get("mk_nextId",      100),
  }
}
