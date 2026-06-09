export const OWNER_PIN = "1234"

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

// localStorage helpers
const K = {
  products: "mk_products",
  zones:    "mk_zones",
  shops:    "mk_shops",
  history:  "mk_history",
  token:    "mk_token",
  nextId:   "mk_nextid",
}

export function loadAll() {
  const get = (key, def) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
  }
  return {
    products: get(K.products, DEFAULT_PRODUCTS),
    zones:    get(K.zones,    DEFAULT_ZONES),
    shops:    get(K.shops,    DEFAULT_SHOPS),
    history:  get(K.history,  []),
    token:    get(K.token,    ""),
    nextId:   get(K.nextId,   100),
  }
}

export const persist = {
  products: (v) => localStorage.setItem(K.products, JSON.stringify(v)),
  zones:    (v) => localStorage.setItem(K.zones,    JSON.stringify(v)),
  shops:    (v) => localStorage.setItem(K.shops,    JSON.stringify(v)),
  history:  (v) => localStorage.setItem(K.history,  JSON.stringify(v)),
  token:    (v) => localStorage.setItem(K.token,    JSON.stringify(v)),
  nextId:   (v) => localStorage.setItem(K.nextId,   JSON.stringify(v)),
}
