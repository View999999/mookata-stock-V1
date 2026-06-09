import { useState, useEffect, useCallback } from "react"
import { loadAll, persist, OWNER_PIN } from "./data.js"
import { todayKey, todayStr, fmtDate, prevKey, buildMsg } from "./utils.js"
import { QtyBox, StatusBadge, ZoneDot, Card, Btn, RoundBtn, InpStyle, SelStyle } from "./components.jsx"
import { apiSaveStock, apiSaveOrder, apiSendLine, apiSaveAndSend } from "./api.js"

const ZONE_COLORS = ["#7C6FFF","#27AE8A","#E06B3A","#B8478A","#2E86DE","#D4A017","#E05252","#52B788"]

// ── Light theme colors ────────────────────────────────────────────────────────
const C = {
  bg:        "#F5F5F0",
  bgCard:    "#FFFFFF",
  bgCard2:   "#F9F9F6",
  border:    "#E0DDD5",
  border2:   "#CCCAC2",
  text:      "#1A1A1A",
  textSub:   "#555550",
  textMute:  "#999990",
  primary:   "#2563EB",
  primaryBg: "#EEF3FF",
  green:     "#16A34A",
  greenBg:   "#DCFCE7",
  orange:    "#D97706",
  orangeBg:  "#FEF3C7",
  red:       "#DC2626",
  redBg:     "#FEE2E2",
  line:      "#00B900",
  purple:    "#7C3AED",
}

export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [tab, setTab]           = useState("check")
  const [isOwner, setIsOwner]   = useState(false)
  const [products, setProductsR] = useState([])
  const [zones, setZonesR]       = useState([])
  const [shops, setShopsR]       = useState([])
  const [history, setHistoryR]   = useState([])
  const [lineToken, setLineToken] = useState("")
  const [nextId, setNextIdR]     = useState(100)
  const [loaded, setLoaded]      = useState(false)

  // UI state
  const [round, setRound]           = useState("morning")
  const [zFilter, setZFilter]       = useState("all")
  const [sumDate, setSumDate]        = useState(null)
  const [sumZone, setSumZone]        = useState("all")
  const [lineZone, setLineZone]      = useState("all")
  const [lineType, setLineType]      = useState("morning")
  const [linePreview, setLinePreview] = useState("")
  const [toast, setToast]            = useState(null)
  const [sending, setSending]        = useState(false)
  const [showToken, setShowToken]    = useState(false)
  const [tokenInput, setTokenInput]  = useState("")
  const [showLinePanel, setShowLinePanel] = useState(false)
  // settings form
  const [newZone, setNewZone]  = useState("")
  const [newShop, setNewShop]  = useState("")
  const [npName, setNpName]    = useState("")
  const [npZone, setNpZone]    = useState("z0")
  const [npUnit, setNpUnit]    = useState("")
  const [npMin, setNpMin]      = useState(5)
  const [npCost, setNpCost]    = useState(0)
  const [npShop, setNpShop]    = useState("")

  // ── Persist wrappers ───────────────────────────────────────────────────────
  const setProducts = v => { setProductsR(v); persist.products(v) }
  const setZones    = v => { setZonesR(v);    persist.zones(v) }
  const setShops    = v => { setShopsR(v);    persist.shops(v) }
  const setHistory  = v => { setHistoryR(v);  persist.history(v) }
  const setNextId   = v => { setNextIdR(v);   persist.nextId(v) }

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const d = loadAll()
    setProductsR(d.products); setZonesR(d.zones); setShopsR(d.shops)
    setHistoryR(d.history);   setLineToken(d.token); setTokenInput(d.token)
    setNextIdR(d.nextId);     setLoaded(true)
  }, [])

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (msg, color=C.green) => {
    setToast({ msg, color })
    setTimeout(() => setToast(null), 2600)
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const toggleAuth = () => {
    if (isOwner) { setIsOwner(false); return }
    const pin = window.prompt("รหัสเจ้าของร้าน:")
    if (pin === OWNER_PIN) setIsOwner(true)
    else if (pin !== null) showToast("❌ รหัสไม่ถูกต้อง", C.red)
  }

  // ── Check ──────────────────────────────────────────────────────────────────
  const updProd = (id, field, val) =>
    setProducts(products.map(p => p.id===id ? {...p,[field]:val} : p))

  const saveRound = async () => {
    const dk = todayKey()
    const now = new Date()
    const entry = {
      dateKey: dk, date: todayStr(),
      time: `${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`,
      round,
      snapshot: products.map(p => ({id:p.id,name:p.name,zone:p.zone,unit:p.unit,cost:p.cost,val:p[round]||0})),
    }
    const next = [entry, ...history.filter(h=>!(h.dateKey===dk&&h.round===round))].slice(0,300)
    setHistory(next)
    apiSaveStock({ round, products, zones })
    showToast(`✅ บันทึกรอบ${round==="morning"?"สั่งเช้า":"ปิดร้าน"}เรียบร้อย`)
  }

  // ── Summary helpers ────────────────────────────────────────────────────────
  const sortedDates = [...new Set(history.map(h=>h.dateKey))].sort()
  const displayDates = [...sortedDates].reverse().map(dk=>({key:dk,label:fmtDate(dk)}))
  const activeDK = sumDate || displayDates[0]?.key || null

  const getSummaryRows = useCallback((dk, zf) => {
    if (!dk) return []
    const pdk = prevKey(dk, sortedDates)
    const dayRecs  = history.filter(h=>h.dateKey===dk)
    const prevRecs = pdk ? history.filter(h=>h.dateKey===pdk) : []
    const mRec  = dayRecs.find(h=>h.round==="morning")
    const cRec  = dayRecs.find(h=>h.round==="close")
    const pcRec = prevRecs.find(h=>h.round==="close")
    return products
      .filter(p => zf==="all" || p.zone===zf)
      .map(p => {
        const prevClose = pcRec?.snapshot.find(x=>x.id===p.id)?.val ?? null
        const morning   = mRec?.snapshot.find(x=>x.id===p.id)?.val ?? null
        const todayClose= cRec?.snapshot.find(x=>x.id===p.id)?.val ?? null
        const start     = (prevClose??0)+(morning??0)
        const used      = (prevClose!==null||morning!==null)&&todayClose!==null
          ? Math.max(0,start-todayClose) : null
        return {p,prevClose,morning,todayClose,start,used,mRec,cRec,pcRec}
      })
  }, [history, products, sortedDates])

  const summaryRows = getSummaryRows(activeDK, sumZone)

  // ── LINE ───────────────────────────────────────────────────────────────────
  const getMsg = useCallback((type, zoneId) =>
    buildMsg(type, zoneId, products, zones, history, todayKey()),
    [products, zones, history])

  useEffect(() => { setLinePreview(getMsg(lineType, lineZone)) }, [lineType, lineZone, getMsg])

  const doSend = async (type, zoneId="all") => {
    setSending(true)
    const message = getMsg(type, zoneId)
    const result = await apiSendLine(message)
    showToast("📲 ส่ง LINE แล้ว! (เช็คกลุ่มได้เลย)", C.green)
    setSending(false)
    setShowLinePanel(false)
  }

  const saveToken = () => {
    setLineToken(tokenInput); persist.token(tokenInput)
    showToast(tokenInput?"✅ บันทึก Token แล้ว":"ลบ Token แล้ว")
  }

  // ── Settings ───────────────────────────────────────────────────────────────
  const addZone = () => {
    if (!newZone.trim()) return
    setZones([...zones,{id:"z"+Date.now(),name:newZone.trim(),color:ZONE_COLORS[zones.length%ZONE_COLORS.length]}])
    setNewZone("")
  }
  const addShop = () => {
    if (!newShop.trim()) return; setShops([...shops,newShop.trim()]); setNewShop("")
  }
  const addProduct = () => {
    if (!npName.trim()) return
    setProducts([...products,{id:nextId,name:npName.trim(),zone:npZone,unit:npUnit||"ชิ้น",
      min:npMin,cost:npCost,morning:0,close:0,order:0,shop:npShop||shops[0]}])
    setNextId(nextId+1); setNpName(""); setNpUnit(""); setNpMin(5); setNpCost(0)
  }

  const zoneOf = id => zones.find(z=>z.id===id)||{name:id,color:"#666"}
  const filteredProds = zFilter==="all" ? products : products.filter(p=>p.zone===zFilter)

  // 4 tabs only
  const TABS = [
    {id:"check",    label:"เช็คของ",  icon:"📋"},
    {id:"order",    label:"สั่งของ",  icon:"🛒"},
    {id:"summary",  label:"สรุป",     icon:"📊"},
    {id:"settings", label:"ตั้งค่า",  icon:"⚙️"},
  ]

  if (!loaded) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
      minHeight:"100vh",background:C.bg,color:C.textMute,flexDirection:"column",gap:12}}>
      <div style={{fontSize:40}}>🔥</div>
      <div style={{fontSize:16,fontWeight:600}}>กำลังโหลด...</div>
    </div>
  )

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,maxWidth:720,margin:"0 auto"}}>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",top:16,left:"50%",zIndex:999,
          transform:"translateX(-50%)",
          background:"#fff",border:`2px solid ${toast.color}`,color:toast.color,
          padding:"12px 24px",borderRadius:16,fontSize:15,fontWeight:700,
          boxShadow:`0 4px 20px ${toast.color}33`,whiteSpace:"nowrap"}}>
          {toast.msg}
        </div>
      )}

      {/* LINE Panel Overlay */}
      {showLinePanel && (
        <div style={{position:"fixed",inset:0,zIndex:500,
          background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"flex-end"}}
          onClick={e=>{ if(e.target===e.currentTarget) setShowLinePanel(false) }}>
          <div style={{background:C.bgCard,borderRadius:"20px 20px 0 0",
            padding:"20px 20px 32px",width:"100%",maxWidth:720,margin:"0 auto",
            boxShadow:"0 -4px 30px rgba(0,0,0,0.15)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontSize:18,fontWeight:800,color:C.text}}>📲 ส่ง LINE</div>
              <button onClick={()=>setShowLinePanel(false)}
                style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.textMute}}>✕</button>
            </div>
            {!lineToken && (
              <div style={{background:C.orangeBg,border:`1px solid ${C.orange}`,borderRadius:10,
                padding:"10px 14px",marginBottom:14,fontSize:14,color:C.orange}}>
                ⚠️ ยังไม่มี LINE Token — ให้เจ้าของตั้งค่าใน "ตั้งค่า" ก่อน
              </div>
            )}
            <div style={{marginBottom:12}}>
              <LightLabel>โซน</LightLabel>
              <select value={lineZone} onChange={e=>setLineZone(e.target.value)}
                style={lightSel()}>
                <option value="all">ทุกโซน</option>
                {zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div style={{marginBottom:12}}>
              <LightLabel>ประเภทข้อความ</LightLabel>
              <select value={lineType} onChange={e=>setLineType(e.target.value)}
                style={lightSel()}>
                <option value="morning">สั่งรอบเช้า</option>
                <option value="close">ปิดร้าน</option>
                <option value="used">ยอดใช้ไปจริง</option>
                <option value="order">รายการสั่งของ</option>
              </select>
            </div>
            <LightLabel>ตัวอย่างข้อความ</LightLabel>
            <div style={{background:C.bgCard2,border:`1px solid ${C.border}`,borderRadius:10,
              padding:12,fontSize:13,color:C.textSub,whiteSpace:"pre-wrap",lineHeight:1.8,
              maxHeight:160,overflowY:"auto",marginBottom:16}}>{linePreview}</div>
            <button onClick={()=>doSend(lineType,lineZone)} disabled={!lineToken||sending}
              style={{width:"100%",padding:"14px",borderRadius:14,border:"none",
                fontSize:16,fontWeight:800,cursor:lineToken&&!sending?"pointer":"not-allowed",
                background:lineToken&&!sending?C.line:"#ccc",color:"#fff",
                opacity:!lineToken||sending?0.5:1}}>
              {sending?"⏳ กำลังส่ง...":"📲 ส่ง LINE เลย!"}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{background:C.bgCard,borderBottom:`1px solid ${C.border}`,
        padding:"16px 18px 12px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:C.text}}>🔥 สต็อกหมูกระทะ</div>
            <div style={{fontSize:12,color:C.textMute,marginTop:2}}>{todayStr()}</div>
          </div>
          <button onClick={toggleAuth} style={{
            padding:"8px 18px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
            border:`2px solid ${isOwner?C.purple:C.border2}`,fontSize:13,
            background:isOwner?C.primaryBg:"transparent",color:isOwner?C.purple:C.textSub,
          }}>{isOwner?"🔓 เจ้าของ":"🔒 พนักงาน"}</button>
        </div>
      </div>

      {/* Content */}
      <div style={{padding:"18px 16px 100px"}}>

        {/* ═══ เช็คของ ═══ */}
        {tab==="check" && (
          <div>
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              <RoundLightBtn active={round==="morning"} color={C.primary} onClick={()=>setRound("morning")}>🌅 สั่งรอบเช้า</RoundLightBtn>
              <RoundLightBtn active={round==="close"}   color="#475569" onClick={()=>setRound("close")}>🌙 ปิดร้าน</RoundLightBtn>
            </div>

            {/* Zone filter */}
            <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
              {[{id:"all",name:"ทั้งหมด",color:"#475569"},...zones].map(z=>(
                <button key={z.id} onClick={()=>setZFilter(z.id)} style={{
                  padding:"6px 14px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
                  fontSize:13,border:`2px solid ${zFilter===z.id?z.color:C.border2}`,
                  background:zFilter===z.id?z.color:"transparent",
                  color:zFilter===z.id?"#fff":C.textSub,
                }}>{z.name}</button>
              ))}
            </div>

            <LightCard>
              {filteredProds.length===0
                ? <div style={{textAlign:"center",color:C.textMute,padding:24,fontSize:15}}>ยังไม่มีสินค้า — เพิ่มในตั้งค่า</div>
                : filteredProds.map((p,i)=>{
                  const z=zoneOf(p.zone)
                  return (
                    <div key={p.id} style={{
                      display:"grid",gridTemplateColumns:"1fr auto",alignItems:"center",gap:12,
                      padding:"14px 0",borderBottom:i<filteredProds.length-1?`1px solid ${C.border}`:"none",
                    }}>
                      <div>
                        <div style={{fontSize:16,fontWeight:700,color:C.text}}>{p.name}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:5,flexWrap:"wrap"}}>
                          <span style={{fontSize:12,padding:"2px 10px",borderRadius:10,
                            background:z.color+"20",color:z.color,fontWeight:700}}>{z.name}</span>
                          <LightStatusBadge val={p[round]||0} min={p.min}/>
                          <span style={{fontSize:12,color:C.textMute}}>{p.unit}</span>
                        </div>
                      </div>
                      <LightQtyBox value={p[round]||0} onChange={v=>updProd(p.id,round,v)}/>
                    </div>
                  )
                })
              }
            </LightCard>

            <div style={{display:"flex",gap:10,marginTop:4,flexWrap:"wrap"}}>
              <BigBtn color={C.primary} onClick={saveRound}>💾 บันทึก</BigBtn>
              <BigBtn color={C.line} onClick={()=>setShowLinePanel(true)}>📲 ส่ง LINE</BigBtn>
            </div>
          </div>
        )}

        {/* ═══ สั่งของ ═══ */}
        {tab==="order" && (
          <div>
            {zones.map(z=>{
              const zp=products.filter(p=>p.zone===z.id)
              if (!zp.length) return null
              return (
                <div key={z.id} style={{marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <ZoneDot color={z.color}/>
                    <span style={{fontSize:14,fontWeight:800,color:z.color}}>{z.name}</span>
                  </div>
                  <LightCard>
                    {zp.map((p,i)=>(
                      <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr auto",
                        alignItems:"center",gap:12,padding:"14px 0",
                        borderBottom:i<zp.length-1?`1px solid ${C.border}`:"none"}}>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                            <span style={{fontSize:16,fontWeight:700,color:C.text}}>{p.name}</span>
                            {p.close<p.min&&<span style={{fontSize:11,background:C.orangeBg,color:C.orange,
                              padding:"2px 8px",borderRadius:8,fontWeight:700}}>สั่งด่วน</span>}
                          </div>
                          <div style={{fontSize:13,color:C.textSub,marginTop:4}}>ปิดล่าสุด: {p.close} {p.unit}</div>
                          <select value={p.shop} onChange={e=>updProd(p.id,"shop",e.target.value)}
                            style={{...lightSel(),marginTop:7,width:"auto",padding:"4px 10px",fontSize:12}}>
                            {shops.map(s=><option key={s}>{s}</option>)}
                          </select>
                          {isOwner&&<div style={{fontSize:12,color:C.textMute,marginTop:5}}>฿{p.cost}/{p.unit}</div>}
                        </div>
                        <LightQtyBox value={p.order||0} onChange={v=>updProd(p.id,"order",v)}/>
                      </div>
                    ))}
                  </LightCard>
                </div>
              )
            })}
            <div style={{display:"flex",gap:10,marginTop:4,flexWrap:"wrap"}}>
              <BigBtn color={C.primary} onClick={()=>{ apiSaveOrder({products,zones}); showToast("✅ บันทึกรายการสั่งของเรียบร้อย") }}>💾 บันทึกรายการสั่ง</BigBtn>
              <BigBtn color={C.line} onClick={()=>setShowLinePanel(true)}>📲 ส่ง LINE</BigBtn>
            </div>
          </div>
        )}

        {/* ═══ สรุป ═══ */}
        {tab==="summary" && (
          <div>
            <div style={{background:C.greenBg,border:`1px solid ${C.green}`,borderRadius:10,
              padding:"10px 14px",marginBottom:16,fontSize:14,color:C.green,lineHeight:1.6}}>
              📐 <strong>(ปิดเมื่อวาน + สั่งเช้าวันนี้) − ปิดวันนี้ = ใช้ไปจริง</strong>
            </div>

            {/* Day pills */}
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:14}}>
              {displayDates.length===0
                ? <span style={{fontSize:14,color:C.textMute}}>ยังไม่มีข้อมูล — กด "บันทึก" หลังเช็คของ</span>
                : displayDates.map(d=>(
                  <button key={d.key} onClick={()=>setSumDate(d.key)} style={{
                    padding:"7px 16px",borderRadius:20,whiteSpace:"nowrap",cursor:"pointer",
                    border:`2px solid ${activeDK===d.key?C.primary:C.border2}`,fontFamily:"inherit",
                    background:activeDK===d.key?C.primary:"transparent",
                    color:activeDK===d.key?"#fff":C.textSub,fontSize:13,fontWeight:activeDK===d.key?700:400,
                  }}>{d.label}</button>
                ))
              }
            </div>

            {/* Zone select */}
            <select value={sumZone} onChange={e=>setSumZone(e.target.value)}
              style={{...lightSel(),marginBottom:14,width:"auto",minWidth:140}}>
              <option value="all">ทุกโซน</option>
              {zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}
            </select>

            {/* Status pills */}
            {activeDK && (()=>{
              const pdk=prevKey(activeDK,sortedDates)
              const dr=history.filter(h=>h.dateKey===activeDK)
              const pr=pdk?history.filter(h=>h.dateKey===pdk):[]
              return (
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                  {[
                    {label:"ปิดเมื่อวาน", ok:!!pr.find(h=>h.round==="close")},
                    {label:"สั่งเช้าวันนี้", ok:!!dr.find(h=>h.round==="morning")},
                    {label:"ปิดวันนี้",      ok:!!dr.find(h=>h.round==="close")},
                  ].map(s=>(
                    <span key={s.label} style={{fontSize:13,padding:"4px 13px",borderRadius:20,fontWeight:700,
                      background:s.ok?C.greenBg:C.orangeBg,color:s.ok?C.green:C.orange}}>
                      {s.ok?"✅":"❌"} {s.label}
                    </span>
                  ))}
                </div>
              )
            })()}

            {/* Owner metrics */}
            {isOwner && summaryRows.length>0 && (()=>{
              const usedCost=summaryRows.reduce((s,r)=>s+(r.used??0)*r.p.cost,0)
              const remainCost=summaryRows.reduce((s,r)=>s+(r.todayClose??0)*r.p.cost,0)
              const low=summaryRows.filter(r=>r.todayClose!==null&&r.todayClose<r.p.min).length
              return (
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",
                  gap:10,marginBottom:18}}>
                  {[
                    {label:"ต้นทุนใช้ไป",  val:`฿${usedCost.toLocaleString()}`, color:C.purple},
                    {label:"สต็อกคงเหลือ", val:`฿${remainCost.toLocaleString()}`,color:C.green},
                    {label:"ใกล้หมด/หมด",  val:low,                              color:C.orange},
                  ].map(m=>(
                    <div key={m.label} style={{background:C.bgCard,border:`1px solid ${C.border}`,
                      borderRadius:12,padding:"14px 16px"}}>
                      <div style={{fontSize:12,color:C.textMute,marginBottom:4}}>{m.label}</div>
                      <div style={{fontSize:22,fontWeight:800,color:m.color}}>{m.val}</div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Tables by zone */}
            {zones.filter(z=>sumZone==="all"||z.id===sumZone).map(z=>{
              const zRows=summaryRows.filter(r=>r.p.zone===z.id)
              if (!zRows.length) return null
              const cols=["สินค้า","ปิดเมื่อวาน","สั่งเช้า","รวมต้น","ปิดวันนี้","ใช้ไปจริง","สถานะ",...(isOwner?["ต้นทุน"]:[])]
              const gcols=`1.4fr ${cols.slice(1).map(()=>"1fr").join(" ")}`
              return (
                <div key={z.id} style={{marginBottom:22}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                    <ZoneDot color={z.color}/>
                    <span style={{fontSize:14,fontWeight:800,color:z.color}}>{z.name}</span>
                  </div>
                  <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:14,
                    overflow:"hidden",marginBottom:16}}>
                    <div style={{display:"grid",gridTemplateColumns:gcols}}>
                      {cols.map(h=>(
                        <div key={h} style={{padding:"8px 10px",fontSize:12,color:C.textMute,
                          borderBottom:`1px solid ${C.border}`,fontWeight:700,background:C.bgCard2}}>{h}</div>
                      ))}
                      {zRows.map(({p,prevClose,morning,todayClose,start,used})=>{
                        const uc=used!==null?used*p.cost:null
                        return [
                          <LightCell key={`${p.id}n`} bold>{p.name}</LightCell>,
                          <LightCell key={`${p.id}pc`}>{prevClose!==null?`${prevClose} ${p.unit}`:<Faint2>ไม่มี</Faint2>}</LightCell>,
                          <LightCell key={`${p.id}m`}>{morning!==null?`${morning} ${p.unit}`:<Faint2>ไม่มี</Faint2>}</LightCell>,
                          <LightCell key={`${p.id}s`}>{(prevClose!==null||morning!==null)?`${start} ${p.unit}`:"—"}</LightCell>,
                          <LightCell key={`${p.id}tc`}>{todayClose!==null?`${todayClose} ${p.unit}`:<Faint2>รอปิดร้าน</Faint2>}</LightCell>,
                          <LightCell key={`${p.id}u`}>{used!==null
                            ?<span style={{color:used>0?C.red:C.green,fontWeight:700}}>{used>0?`-${used}`:0} {p.unit}</span>
                            :<Faint2>รอข้อมูล</Faint2>}
                          </LightCell>,
                          <LightCell key={`${p.id}st`}><LightStatusBadge val={todayClose} min={p.min}/></LightCell>,
                          ...(isOwner?[<LightCell key={`${p.id}c`}>{uc!==null?<span style={{color:C.purple}}>฿{uc.toLocaleString()}</span>:"—"}</LightCell>]:[]),
                        ]
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ═══ ตั้งค่า ═══ */}
        {tab==="settings" && (
          <div>
            {/* LINE Token — เฉพาะเจ้าของ */}
            {isOwner && (
              <LightCard>
                <SectionTitle2>🔑 LINE Notify Token</SectionTitle2>
                <div style={{fontSize:13,color:C.textSub,marginBottom:12,lineHeight:1.7}}>
                  รับ Token จาก{" "}
                  <a href="https://notify.line.me" target="_blank" rel="noreferrer"
                    style={{color:C.line,textDecoration:"none",fontWeight:700}}>notify.line.me</a>
                  <br/>Login → My page → Generate token → เลือกกลุ่มไลน์
                </div>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  <input type={showToken?"text":"password"} value={tokenInput}
                    onChange={e=>setTokenInput(e.target.value)}
                    placeholder="วาง LINE Notify Token ที่นี่..."
                    style={{...lightInp(),flex:1}}/>
                  <button onClick={()=>setShowToken(!showToken)}
                    style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${C.border2}`,
                      background:C.bgCard2,cursor:"pointer",fontFamily:"inherit",fontSize:13,color:C.textSub}}>
                    {showToken?"ซ่อน":"แสดง"}
                  </button>
                </div>
                <BigBtn color={C.primary} onClick={saveToken}>✅ บันทึก Token</BigBtn>
                <div style={{marginTop:12,fontSize:14,color:lineToken?C.green:C.orange,fontWeight:700}}>
                  {lineToken?"✅ Token ตั้งค่าแล้ว — พนักงานส่ง LINE ได้เลย":"⚠️ ยังไม่มี Token"}
                </div>
              </LightCard>
            )}

            {/* โซน */}
            <LightCard>
              <SectionTitle2>📍 โซนพนักงาน</SectionTitle2>
              {zones.map(z=>(
                <div key={z.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <ZoneDot color={z.color}/>
                  <span style={{fontSize:15,color:C.text,flex:1,fontWeight:600}}>{z.name}</span>
                  {isOwner&&<DelBtn2 onClick={()=>setZones(zones.filter(x=>x.id!==z.id))}/>}
                </div>
              ))}
              {isOwner
                ?<InlineAdd2 value={newZone} onChange={setNewZone} placeholder="ชื่อโซนใหม่" onAdd={addZone}/>
                :<LockNote2>เพิ่ม/ลบโซน — เฉพาะเจ้าของ</LockNote2>}
            </LightCard>

            {/* ร้านค้า */}
            <LightCard>
              <SectionTitle2>🛒 ร้านค้าซัพพลาย</SectionTitle2>
              {shops.map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:15,color:C.text,flex:1,fontWeight:600}}>{s}</span>
                  {isOwner&&<DelBtn2 onClick={()=>setShops(shops.filter((_,j)=>j!==i))}/>}
                </div>
              ))}
              {isOwner
                ?<InlineAdd2 value={newShop} onChange={setNewShop} placeholder="ชื่อร้านค้า" onAdd={addShop}/>
                :<LockNote2>เพิ่ม/ลบร้านค้า — เฉพาะเจ้าของ</LockNote2>}
            </LightCard>

            {/* สินค้า */}
            <LightCard>
              <SectionTitle2>📦 รายการสินค้า <span style={{fontSize:12,color:C.textMute,fontWeight:400}}>({products.length} รายการ)</span></SectionTitle2>
              {products.map(p=>{
                const z=zoneOf(p.zone)
                return (
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,
                    padding:"10px 0",borderBottom:`1px solid ${C.border}`,flexWrap:"wrap"}}>
                    <ZoneDot color={z.color} size={8}/>
                    <span style={{fontSize:14,color:C.text,flex:1,minWidth:80,fontWeight:600}}>{p.name}</span>
                    <span style={{fontSize:12,color:C.textMute}}>{p.unit} · ต่ำสุด {p.min}</span>
                    {isOwner&&<span style={{fontSize:12,color:C.purple,fontWeight:700}}>฿{p.cost}</span>}
                    <span style={{fontSize:12,color:C.textMute}}>{p.shop}</span>
                    {isOwner&&<DelBtn2 onClick={()=>setProducts(products.filter(x=>x.id!==p.id))}/>}
                  </div>
                )
              })}
              {isOwner?(
                <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.textMute,marginBottom:10,
                    textTransform:"uppercase",letterSpacing:1}}>เพิ่มสินค้าใหม่</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                    <input key="n" value={npName} onChange={e=>setNpName(e.target.value)} placeholder="ชื่อสินค้า" style={lightInp()}/>
                    <select key="z" value={npZone} onChange={e=>setNpZone(e.target.value)} style={lightSel()}>
                      {zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                    <input key="u" value={npUnit} onChange={e=>setNpUnit(e.target.value)} placeholder="หน่วย (กก., ชิ้น...)" style={lightInp()}/>
                    <input key="m" type="number" value={npMin} onChange={e=>setNpMin(parseInt(e.target.value)||0)} placeholder="สต็อกต่ำสุด" style={lightInp()}/>
                    <input key="c" type="number" value={npCost} onChange={e=>setNpCost(parseInt(e.target.value)||0)} placeholder="ต้นทุน/หน่วย (฿)" style={lightInp()}/>
                    <select key="s" value={npShop||shops[0]} onChange={e=>setNpShop(e.target.value)} style={lightSel()}>
                      {shops.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <BigBtn color={C.primary} onClick={addProduct}>+ เพิ่มสินค้า</BigBtn>
                </div>
              ):<LockNote2>เพิ่ม/ลบสินค้า และดูต้นทุน — เฉพาะเจ้าของ</LockNote2>}
            </LightCard>
          </div>
        )}

      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:720,background:C.bgCard,
        borderTop:`1px solid ${C.border}`,display:"flex",zIndex:200}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,padding:"10px 4px 14px",border:"none",background:"transparent",
            cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",
            alignItems:"center",gap:3,
            color:tab===t.id?C.primary:C.textMute,
          }}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span style={{fontSize:12,fontWeight:tab===t.id?800:500}}>{t.label}</span>
            {tab===t.id&&<span style={{width:20,height:3,borderRadius:2,background:C.primary}}/>}
          </button>
        ))}
      </div>

    </div>
  )
}

// ── Light theme helpers ───────────────────────────────────────────────────────
function lightInp() {
  return { padding:"10px 12px", borderRadius:10, border:`1.5px solid ${C.border2}`,
    background:C.bgCard, color:C.text, fontSize:14, fontFamily:"inherit", width:"100%",
    outline:"none" }
}
function lightSel() {
  return { padding:"10px 12px", borderRadius:10, border:`1.5px solid ${C.border2}`,
    background:C.bgCard, color:C.text, fontSize:14, fontFamily:"inherit",
    width:"100%", cursor:"pointer" }
}
function LightCard({ children, style }) {
  return (
    <div style={{ background:C.bgCard, border:`1px solid ${C.border}`,
      borderRadius:14, padding:"14px 16px", marginBottom:16, ...style }}>
      {children}
    </div>
  )
}
function LightLabel({ children }) {
  return <div style={{fontSize:13,color:C.textSub,marginBottom:6,fontWeight:600}}>{children}</div>
}
function LightQtyBox({ value, onChange }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <QBtn onClick={()=>onChange(Math.max(0,value-1))}>−</QBtn>
      <input type="number" value={value} min={0}
        onChange={e=>onChange(Math.max(0,parseInt(e.target.value)||0))}
        style={{width:54,textAlign:"center",background:C.bgCard2,border:`1.5px solid ${C.border2}`,
          color:C.text,borderRadius:8,padding:"5px 0",fontSize:15,fontFamily:"inherit"}}/>
      <QBtn onClick={()=>onChange(value+1)}>+</QBtn>
    </div>
  )
}
function QBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{width:32,height:32,borderRadius:8,
      border:`1.5px solid ${C.border2}`,background:C.bgCard2,color:C.text,
      cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>
      {children}
    </button>
  )
}
function LightStatusBadge({ val, min }) {
  if (val===null) return <span style={lbadge(C.border2,C.textMute)}>รอข้อมูล</span>
  if (val===0)    return <span style={lbadge(C.redBg,C.red)}>หมด</span>
  if (val<min)    return <span style={lbadge(C.orangeBg,C.orange)}>ใกล้หมด</span>
  return <span style={lbadge(C.greenBg,C.green)}>ปกติ</span>
}
function lbadge(bg, color) {
  return { background:bg, color, padding:"2px 9px", borderRadius:10, fontSize:12, fontWeight:700 }
}
function LightCell({ children, bold }) {
  return <div style={{padding:"9px 10px",fontSize:13,color:bold?C.text:C.textSub,
    borderBottom:`1px solid ${C.border}`}}>{children}</div>
}
function Faint2({ children }) {
  return <span style={{color:C.textMute,fontSize:12}}>{children}</span>
}
function SectionTitle2({ children }) {
  return <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:14}}>{children}</div>
}
function DelBtn2({ onClick }) {
  return <button onClick={onClick} style={{background:"none",border:"none",cursor:"pointer",
    color:C.red,fontSize:16,padding:"0 4px",lineHeight:1,opacity:0.6}}>✕</button>
}
function LockNote2({ children }) {
  return <div style={{fontSize:13,color:C.textMute,marginTop:10}}>🔒 {children}</div>
}
function InlineAdd2({ value, onChange, placeholder, onAdd }) {
  return (
    <div style={{display:"flex",gap:8,marginTop:12}}>
      <input value={value} onChange={e=>onChange(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&onAdd()}
        placeholder={placeholder} style={{...lightInp(),flex:1}}/>
      <button onClick={onAdd}
        style={{padding:"10px 16px",borderRadius:10,border:`1.5px solid ${C.primary}`,
          background:C.primaryBg,color:C.primary,cursor:"pointer",fontFamily:"inherit",
          fontWeight:700,fontSize:13,whiteSpace:"nowrap"}}>+ เพิ่ม</button>
    </div>
  )
}
function BigBtn({ color, onClick, children, disabled }) {
  return (
    <button onClick={disabled?undefined:onClick} style={{
      padding:"12px 24px",borderRadius:14,border:"none",fontSize:15,
      cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",fontWeight:800,
      background:disabled?"#ccc":color,color:"#fff",opacity:disabled?0.5:1,
    }}>{children}</button>
  )
}
function RoundLightBtn({ active, color, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:"10px 20px",borderRadius:20,fontFamily:"inherit",fontWeight:700,
      fontSize:14,cursor:"pointer",
      border:`2px solid ${active?color:C.border2}`,
      background:active?color:"transparent",
      color:active?"#fff":C.textSub,
      transition:"all .15s",
    }}>{children}</button>
  )
}
