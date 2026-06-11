import { useState, useEffect, useCallback } from "react"
import { loadAll, persist, OWNER_PIN, subscribeShop, subscribeHistory } from "./data.js"
import { todayKey, todayStr, fmtDate, prevKey, buildMsg } from "./utils.js"
import { ZoneDot } from "./components.jsx"
import { apiSaveStock, apiSaveOrder, apiSendLine } from "./api.js"

const ZONE_COLORS = ["#7C6FFF","#27AE8A","#E06B3A","#B8478A","#2E86DE","#D4A017","#E05252","#52B788"]

const C = {
  bg:"#F5F5F0", bgCard:"#FFFFFF", bgCard2:"#F9F9F6",
  border:"#E0DDD5", border2:"#CCCAC2",
  text:"#1A1A1A", textSub:"#555550", textMute:"#999990",
  primary:"#2563EB", primaryBg:"#EEF3FF",
  green:"#16A34A", greenBg:"#DCFCE7",
  orange:"#D97706", orangeBg:"#FEF3C7",
  red:"#DC2626", redBg:"#FEE2E2",
  line:"#00B900", purple:"#7C3AED",
}

export default function App() {
  const [tab, setTab]             = useState("check")
  const [isOwner, setIsOwner]     = useState(false)
  const [products, setProductsR]  = useState([])
  const [zones, setZonesR]        = useState([])
  const [shops, setShopsR]        = useState([])
  const [history, setHistoryR]    = useState([])
  const [lineToken, setLineToken]  = useState("")
  const [groupIds, setGroupIdsR]   = useState([])
  const [staff, setStaffR]         = useState([])
  const [activeStaff, setActiveStaffR] = useState("")
  const [nextId, setNextIdR]       = useState(100)
  const [loaded, setLoaded]        = useState(false)

  // LINE panel state
  const [showLinePanel, setShowLinePanel] = useState(false)
  const [lineSelStaff, setLineSelStaff]   = useState("")
  const [lineSelZones, setLineSelZones]   = useState([])
  const [sending, setSending]             = useState(false)

  // UI
  const [round, setRound]   = useState("morning")
  const [zFilter, setZFilter] = useState("all")
  const [sumDate, setSumDate] = useState(null)
  const [sumZone, setSumZone] = useState(["all"])
  const [showCalPop, setShowCalPop] = useState(false)
  const [sumWeekOffset, setSumWeekOffset] = useState(0)
  const [pinOld, setPinOld] = useState("")
  const [pinNew, setPinNew] = useState("")
  const [pinNew2, setPinNew2] = useState("")
  const [ownerPin, setOwnerPin] = useState(OWNER_PIN)
  const [toast, setToast]     = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewMsg, setPreviewMsg]   = useState("")
  const [orderZFilter, setOrderZFilter] = useState("all")
  const [showToken, setShowToken] = useState(false)
  const [tokenInput, setTokenInput] = useState("")

  // Settings form
  const [newZone, setNewZone] = useState("")
  const [newShop, setNewShop] = useState("")
  const [newStaffName, setNewStaffName] = useState("")
  const [newGName, setNewGName] = useState("")
  const [newGId, setNewGId]   = useState("")
  const [newGTypes, setNewGTypes] = useState(["all"])
  const [newGShops, setNewGShops] = useState(["all"])
  const [newGBars,  setNewGBars]  = useState(["all"])
  const [npName, setNpName]   = useState("")
  const [npZone, setNpZone]   = useState("z0")
  const [npUnit, setNpUnit]   = useState("")
  const [npMin, setNpMin]     = useState(5)
  const [npCost, setNpCost]   = useState(0)
  const [npShop, setNpShop]   = useState("")

  // Persist wrappers
  const setProducts   = v => { setProductsR(v);   persist.products(v) }
  const setZones      = v => { setZonesR(v);       persist.zones(v) }
  const setShops      = v => { setShopsR(v);       persist.shops(v) }
  const setGroupIds   = v => { setGroupIdsR(v);    persist.groupIds(v) }
  const setStaff      = v => { setStaffR(v);       persist.staff(v) }
  const setActiveStaff= v => { setActiveStaffR(v); persist.activeStaff(v) }
  const setHistory    = v => { setHistoryR(v);     persist.history(v) }
  const setNextId     = v => { setNextIdR(v);      persist.nextId(v) }

  useEffect(() => {
    // โหลดครั้งแรก
    loadAll().then(d => {
      setProductsR(d.products); setZonesR(d.zones); setShopsR(d.shops)
      setHistoryR(d.history);   setLineToken(d.token); setTokenInput(d.token)
      setGroupIdsR(d.groupIds||[]); setStaffR(d.staff||[])
      setActiveStaffR(d.activeStaff||"")
      setNextIdR(d.nextId)
      if(d.ownerPin) setOwnerPin(d.ownerPin)
      setLoaded(true)
    })

    // Realtime listeners — ทุกเครื่องเห็นข้อมูลเดียวกันทันที
    const unsubShop = subscribeShop(data => {
      if (data.products)    setProductsR(data.products)
      if (data.zones)       setZonesR(data.zones)
      if (data.shops)       setShopsR(data.shops)
      if (data.token!=null) setLineToken(data.token)
      if (data.groupIds)    setGroupIdsR(data.groupIds)
      if (data.staff)       setStaffR(data.staff)
      if (data.activeStaff!=null) setActiveStaffR(data.activeStaff)
      if (data.nextId)      setNextIdR(data.nextId)
      if (data.ownerPin)    setOwnerPin(data.ownerPin)
    })
    const unsubHistory = subscribeHistory(history => {
      setHistoryR(history)
    })

    return () => { unsubShop(); unsubHistory() }
  }, [])

  const showToast = (msg, color=C.green, big=false) => {
    setToast({msg,color,big}); setTimeout(()=>setToast(null), big?3500:2600)
  }

  const toggleAuth = () => {
    if (isOwner) { setIsOwner(false); return }
    const pin = window.prompt("รหัสเจ้าของร้าน:")
    if (pin===ownerPin) setIsOwner(true)
    else if (pin!==null) showToast("❌ รหัสไม่ถูกต้อง",C.red)
  }

  const updProd = (id,field,val) =>
    setProducts(products.map(p=>p.id===id?{...p,[field]:val}:p))

  // Reset all values to 0
  const resetAll = () => {
    setProducts(products.map(p=>({...p,morning:0,close:0,order:0})))
  }

  // Open LINE panel — preset zones based on current filter, type based on round
  const openLinePanel = () => {
    setLineSelStaff(activeStaff||"")
    setLineSelZones(zFilter==="all" ? zones.map(z=>z.id) : [zFilter])
    setShowLinePanel(true)
  }

  const buildPreview = (selZones, selStaff) => {
    const msgType = tab==="order" ? "order" : round
    const dk = todayKey()
    const fakeHistory = [...history]
    // preview ใช้ filter ของกลุ่มแรกที่ match type
    const firstG = groupIds.find(g=>{const t=g.types||["all"];return t.includes("all")||t.includes(msgType)})
    const shopF = firstG?.shops||["all"]
    const barF  = firstG?.bars||["all"]
    return buildMsg(msgType, selZones, products, zones, fakeHistory, dk, selStaff,
      shopF.includes("all")?null:shopF,
      barF.includes("all")?null:barF)
  }

  // Send LINE
  const doSend = async () => {
    if (!lineSelStaff) { showToast("⚠️ เลือกชื่อพนักงานก่อน",C.orange); return }
    if (lineSelZones.length===0) { showToast("⚠️ เลือกร้านค้าอย่างน้อย 1 ร้านค้า",C.orange); return }
    setSending(true)
    // Save to history first
    const dk = todayKey()
    const now = new Date()
    const entry = {
      dateKey:dk, date:todayStr(),
      time:`${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`,
      round, sender:lineSelStaff,
      snapshot:products.map(p=>({id:p.id,name:p.name,zone:p.zone,unit:p.unit,cost:p.cost,val:p[round]||0})),
    }
    const next = [entry,...history.filter(h=>!(h.dateKey===dk&&h.round===round))].slice(0,300)
    setHistory(next)
    apiSaveStock({round,products,zones})
    const msgType = tab==="order" ? "order" : round
    // ส่งแยกแต่ละกลุ่มตาม type + shop + bar filter
    const targetGroups = groupIds.filter(g => {
      const types = g.types || ["all"]
      return types.includes("all") || types.includes(msgType)
    })
    for (const g of targetGroups) {
      const shopF = g.shops||["all"]
      const barF  = g.bars||["all"]
      const message = buildMsg(msgType, lineSelZones, products, zones, next, dk, lineSelStaff,
        shopF.includes("all")?null:shopF,
        barF.includes("all")?null:barF)
      await apiSendLine(message, lineToken, [g])
    }
    // Reset all values
    resetAll()
    setSending(false)
    setShowLinePanel(false)
    setShowPreview(false)
    showToast(`✅ ส่ง LINE สำเร็จแล้ว! (${lineSelStaff})`, C.green, true)
    setActiveStaff(lineSelStaff)
  }

  const saveToken = () => {
    setLineToken(tokenInput); persist.token(tokenInput)
    showToast(tokenInput?"✅ บันทึก Token แล้ว":"ลบ Token แล้ว")
  }

  // Summary helpers
  const sortedDates = [...new Set(history.map(h=>h.dateKey))].sort()
  const displayDates = [...sortedDates].reverse().map(dk=>({key:dk,label:fmtDate(dk)}))
  const activeDK = sumDate||displayDates[0]?.key||null

  const getSummaryRows = useCallback((dk,zf) => {
    if (!dk) return []
    const pdk = prevKey(dk,sortedDates)
    const dayRecs  = history.filter(h=>h.dateKey===dk)
    const prevRecs = pdk?history.filter(h=>h.dateKey===pdk):[]
    const mRec  = dayRecs.find(h=>h.round==="morning")
    const cRec  = dayRecs.find(h=>h.round==="close")
    const pcRec = prevRecs.find(h=>h.round==="close")
    return products
      .filter(p=>zf==="all"||p.zone===zf)
      .map(p=>{
        const prevClose=pcRec?.snapshot.find(x=>x.id===p.id)?.val??null
        const morning=mRec?.snapshot.find(x=>x.id===p.id)?.val??null
        const todayClose=cRec?.snapshot.find(x=>x.id===p.id)?.val??null
        const start=(prevClose??0)+(morning??0)
        const used=(prevClose!==null||morning!==null)&&todayClose!==null
          ?Math.max(0,start-todayClose):null
        return {p,prevClose,morning,todayClose,start,used}
      })
  },[history,products,sortedDates])

  const summaryRows = getSummaryRows(activeDK,sumZone)
  const zoneOf = id=>zones.find(z=>z.id===id)||{name:id,color:"#666"}
  const filteredProds = zFilter==="all"?products:products.filter(p=>p.zone===zFilter)

  const TABS = [
    {id:"check",label:"เช็คของ",icon:"📋"},
    {id:"order",label:"สั่งของ",icon:"🛒"},
    ...(isOwner?[{id:"summary",label:"สรุป",icon:"📊"}]:[]),
    {id:"settings",label:"ตั้งค่า",icon:"⚙️"},
  ]

  // Toggle zone selection in LINE panel
  const toggleZone = (zid) => {
    setLineSelZones(prev =>
      prev.includes(zid) ? prev.filter(x=>x!==zid) : [...prev,zid]
    )
  }

  if (!loaded) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
      minHeight:"100vh",background:C.bg,flexDirection:"column",gap:12}}>
      <div style={{fontSize:40}}>🔥</div>
      <div style={{fontSize:16,fontWeight:700,color:C.textMute}}>กำลังโหลด...</div>
    </div>
  )

  // LINE ready check
  const lineReady = lineToken && groupIds.length>0

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,maxWidth:720,margin:"0 auto"}}>

      {/* Toast */}
      {toast&&(
        toast.big ? (
          <div style={{position:"fixed",inset:0,zIndex:1500,
            display:"flex",alignItems:"center",justifyContent:"center",
            background:"rgba(0,0,0,0.55)",flexDirection:"column",gap:16}}
            onClick={()=>setToast(null)}>
            <div style={{background:"#fff",border:`4px solid ${toast.color}`,color:toast.color,
              padding:"36px 48px",borderRadius:28,fontSize:28,fontWeight:900,
              textAlign:"center",maxWidth:320,lineHeight:1.4,
              boxShadow:`0 8px 40px ${toast.color}55`}}>
              {toast.msg}
            </div>
            <div style={{color:"#fff",fontSize:14,opacity:0.8}}>แตะเพื่อปิด</div>
          </div>
        ) : (
          <div style={{position:"fixed",top:16,left:"50%",zIndex:999,transform:"translateX(-50%)",
            background:"#fff",border:`2px solid ${toast.color}`,color:toast.color,
            padding:"12px 24px",borderRadius:16,fontSize:15,fontWeight:700,
            boxShadow:`0 4px 20px ${toast.color}33`,whiteSpace:"nowrap"}}>
            {toast.msg}
          </div>
        )
      )}

      {/* ── LINE Panel ── */}
      {showLinePanel&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.4)",
          display:"flex",alignItems:"flex-end"}}
          onClick={e=>{if(e.target===e.currentTarget)setShowLinePanel(false)}}>
          <div style={{background:C.bgCard,borderRadius:"20px 20px 0 0",
            padding:"20px 20px 36px",width:"100%",maxWidth:720,margin:"0 auto",
            boxShadow:"0 -4px 30px rgba(0,0,0,0.15)"}}>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontSize:18,fontWeight:800,color:C.text}}>📲 ส่ง LINE</div>
              <button onClick={()=>setShowLinePanel(false)}
                style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.textMute}}>✕</button>
            </div>

            {!lineReady&&(
              <div style={{background:C.orangeBg,border:`1px solid ${C.orange}`,borderRadius:10,
                padding:"10px 14px",marginBottom:14,fontSize:14,color:C.orange}}>
                ⚠️ ยังไม่ได้ตั้งค่า LINE Token หรือกลุ่ม — ให้เจ้าของตั้งค่าก่อน
              </div>
            )}

            {/* ประเภทข้อความ (read-only แสดงค่า preset) */}
            <div style={{background:C.primaryBg,border:`1px solid ${C.primary}33`,borderRadius:10,
              padding:"8px 14px",marginBottom:16,fontSize:14,color:C.primary,fontWeight:700}}>
              📋 ประเภท: {tab==="order"?"รายการสั่งของ":round==="morning"?"เช็คของที่สั่ง":"ปิดร้าน"}
            </div>

            {/* เลือกพนักงาน */}
            <div style={{marginBottom:16}}>
              <Label2>👤 ชื่อผู้ส่ง</Label2>
              {staff.length===0?(
                <div style={{fontSize:13,color:C.textMute}}>ยังไม่มีรายชื่อ — เจ้าของเพิ่มในตั้งค่า</div>
              ):(
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {staff.map(s=>(
                    <button key={s.id} onClick={()=>setLineSelStaff(s.name)}
                      style={{padding:"8px 18px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",
                        fontWeight:700,fontSize:14,border:`2px solid ${lineSelStaff===s.name?C.primary:C.border2}`,
                        background:lineSelStaff===s.name?C.primary:"transparent",
                        color:lineSelStaff===s.name?"#fff":C.textSub}}>
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* เลือกร้านค้า multi-select */}
            <div style={{marginBottom:18}}>
              <Label2>📍 ร้านค้าที่ส่ง</Label2>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button onClick={()=>setLineSelZones(
                  lineSelZones.length===zones.length?[]:zones.map(z=>z.id))}
                  style={{padding:"6px 14px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",
                    fontWeight:700,fontSize:13,
                    border:`2px solid ${lineSelZones.length===zones.length?"#475569":C.border2}`,
                    background:lineSelZones.length===zones.length?"#475569":"transparent",
                    color:lineSelZones.length===zones.length?"#fff":C.textSub}}>
                  ทั้งหมด
                </button>
                {zones.map(z=>(
                  <button key={z.id} onClick={()=>toggleZone(z.id)}
                    style={{padding:"6px 14px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",
                      fontWeight:700,fontSize:13,
                      border:`2px solid ${lineSelZones.includes(z.id)?z.color:C.border2}`,
                      background:lineSelZones.includes(z.id)?z.color:"transparent",
                      color:lineSelZones.includes(z.id)?"#fff":C.textSub}}>
                    {z.name}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={()=>{
                if (!lineSelStaff) { showToast("⚠️ เลือกชื่อพนักงานก่อน",C.orange); return }
                if (lineSelZones.length===0) { showToast("⚠️ เลือกร้านค้าอย่างน้อย 1 ร้านค้า",C.orange); return }
                setPreviewMsg(buildPreview(lineSelZones, lineSelStaff))
                setShowPreview(true)
              }}
              disabled={!lineReady||!lineSelStaff||lineSelZones.length===0}
              style={{width:"100%",padding:"15px",borderRadius:14,border:"none",
                fontSize:17,fontWeight:800,
                cursor:lineReady&&lineSelStaff&&lineSelZones.length>0?"pointer":"not-allowed",
                background:lineReady&&lineSelStaff&&lineSelZones.length>0?C.line:"#ccc",
                color:"#fff",opacity:!lineReady?0.5:1}}>
              {sending?"⏳ กำลังส่ง...":"👀 ดูตัวอย่างก่อนส่ง"}
            </button>
          </div>
        </div>
      )}

      {/* ── Preview Popup (เต็มหน้าจอ) ── */}
      {showPreview&&(
        <div style={{position:"fixed",inset:0,zIndex:600,background:C.bg,
          display:"flex",flexDirection:"column",maxWidth:720,margin:"0 auto"}}>
          <div style={{background:C.bgCard,borderBottom:`1px solid ${C.border}`,
            padding:"16px 18px",display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>setShowPreview(false)}
              style={{background:"none",border:"none",fontSize:26,cursor:"pointer",
                color:C.textMute,padding:"0 4px",lineHeight:1}}>←</button>
            <div style={{flex:1}}>
              <div style={{fontSize:18,fontWeight:800,color:C.text}}>👀 ตัวอย่างข้อความ LINE</div>
              <div style={{fontSize:12,color:C.textMute,marginTop:2}}>ตรวจสอบก่อนส่งจริง</div>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"18px 16px"}}>
            <div style={{background:"#dcf8c6",borderRadius:16,padding:"16px 18px",
              fontFamily:"monospace",fontSize:15,lineHeight:1.8,color:"#1a1a1a",
              whiteSpace:"pre-wrap",wordBreak:"break-word",
              boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
              {previewMsg}
            </div>
            <div style={{marginTop:10,fontSize:13,color:C.textMute,textAlign:"center"}}>
              {(()=>{
                const msgType = tab==="order" ? "order" : round
                const targets = groupIds.filter(g=>{
                  const types = g.types||["all"]
                  return types.includes("all")||types.includes(msgType)
                })
                return targets.length>0
                  ? <span>ส่งไป <strong style={{color:C.green}}>{targets.length} กลุ่ม</strong>: {targets.map(g=>g.name).join(", ")}</span>
                  : <span style={{color:C.orange}}>⚠️ ไม่มีกลุ่มที่รับประเภทนี้!</span>
              })()}
            </div>
          </div>
          <div style={{padding:"16px 16px 32px",background:C.bgCard,
            borderTop:`1px solid ${C.border}`,display:"flex",gap:10}}>
            <button onClick={()=>setShowPreview(false)}
              style={{flex:1,padding:"16px",borderRadius:14,border:`2px solid ${C.border2}`,
                fontSize:16,fontWeight:800,cursor:"pointer",fontFamily:"inherit",
                background:"transparent",color:C.textSub}}>
              ✏️ แก้ไข
            </button>
            <button onClick={doSend} disabled={sending}
              style={{flex:2,padding:"16px",borderRadius:14,border:"none",
                fontSize:18,fontWeight:900,cursor:sending?"not-allowed":"pointer",
                fontFamily:"inherit",
                background:sending?"#ccc":C.line,color:"#fff"}}>
              {sending?"⏳ กำลังส่ง...":"📲 ส่งเลย!"}
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
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {activeStaff&&(
              <div style={{fontSize:13,color:C.primary,fontWeight:700,
                background:C.primaryBg,padding:"4px 12px",borderRadius:20}}>
                👤 {activeStaff}
              </div>
            )}
            <button onClick={toggleAuth} style={{padding:"8px 18px",borderRadius:20,cursor:"pointer",
              fontFamily:"inherit",fontWeight:700,border:`2px solid ${isOwner?C.purple:C.border2}`,
              fontSize:13,background:isOwner?C.primaryBg:"transparent",
              color:isOwner?C.purple:C.textSub}}>
              {isOwner?"🔓 เจ้าของ":"🔒 พนักงาน"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{padding:"18px 16px 100px"}}>

        {/* ═══ เช็คของ ═══ */}
        {tab==="check"&&(
          <div>
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              <RoundBtn active={round==="morning"} color={C.primary} onClick={()=>setRound("morning")}>🌅 เช็คของที่สั่ง</RoundBtn>
              <RoundBtn active={round==="close"}   color="#475569"   onClick={()=>setRound("close")}>🌙 ปิดร้าน</RoundBtn>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
              {[{id:"all",name:"ทั้งหมด",color:"#475569"},...zones].map(z=>(
                <button key={z.id} onClick={()=>setZFilter(z.id)} style={{
                  padding:"6px 14px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
                  fontSize:13,border:`2px solid ${zFilter===z.id?z.color:C.border2}`,
                  background:zFilter===z.id?z.color:"transparent",
                  color:zFilter===z.id?"#fff":C.textSub}}>{z.name}</button>
              ))}
            </div>
            <LCard>
              {filteredProds.length===0
                ?<Empty/>
                :filteredProds.map((p,i)=>{
                  const z=zoneOf(p.zone)
                  return (
                    <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr auto",
                      alignItems:"center",gap:12,padding:"14px 0",
                      borderBottom:i<filteredProds.length-1?`1px solid ${C.border}`:"none"}}>
                      <div>
                        <div style={{fontSize:16,fontWeight:700,color:C.text}}>{p.name}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:5,flexWrap:"wrap"}}>
                          <span style={{fontSize:12,padding:"2px 10px",borderRadius:10,
                            background:z.color+"20",color:z.color,fontWeight:700}}>{z.name}</span>
                          <SBadge val={p[round]||0} min={p.min}/>
                          <span style={{fontSize:12,color:C.textMute}}>{p.unit}</span>
                        </div>
                      </div>
                      <QBox value={p[round]||0} onChange={v=>updProd(p.id,round,v)}/>
                    </div>
                  )
                })
              }
            </LCard>
            <BigBtn color={C.line} onClick={openLinePanel}>📲 ส่ง LINE</BigBtn>
          </div>
        )}

        {/* ═══ สั่งของ ═══ */}
        {tab==="order"&&(
          <div>
            <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
              {[{id:"all",name:"ทั้งหมด",color:"#475569"},...zones].map(z=>(
                <button key={z.id} onClick={()=>setOrderZFilter(z.id)} style={{
                  padding:"6px 14px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
                  fontSize:13,border:`2px solid ${orderZFilter===z.id?z.color:C.border2}`,
                  background:orderZFilter===z.id?z.color:"transparent",
                  color:orderZFilter===z.id?"#fff":C.textSub}}>{z.name}</button>
              ))}
            </div>
            {zones.filter(z=>orderZFilter==="all"||z.id===orderZFilter).map(z=>{
              const zp=products.filter(p=>p.zone===z.id)
              if(!zp.length) return null
              return (
                <div key={z.id} style={{marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <ZoneDot color={z.color}/>
                    <span style={{fontSize:14,fontWeight:800,color:z.color}}>{z.name}</span>
                  </div>
                  <LCard>
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
                            style={{...lSel(),marginTop:7,width:"auto",padding:"4px 10px",fontSize:12}}>
                            {shops.map(s=><option key={s}>{s}</option>)}
                          </select>
                          {isOwner&&<div style={{fontSize:12,color:C.textMute,marginTop:5}}>฿{p.cost}/{p.unit}</div>}
                        </div>
                        <QBox value={p.order||0} onChange={v=>updProd(p.id,"order",v)}/>
                      </div>
                    ))}
                  </LCard>
                </div>
              )
            })}
            <BigBtn color={C.line} onClick={openLinePanel}>📲 ส่ง LINE</BigBtn>
          </div>
        )}

        {/* ═══ สรุป (เจ้าของเท่านั้น) ═══ */}
        {tab==="summary"&&isOwner&&(
          <div>
            {(()=>{
              const thMonths=["","ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]
              const dayNames=["อา","จ","อ","พ","พฤ","ศ","ส"]
              // หาวันจันทร์ของสัปดาห์ที่เลือก
              const today=new Date(); today.setHours(0,0,0,0)
              const todayMon=new Date(today)
              todayMon.setDate(today.getDate()-((today.getDay()+6)%7))
              const weekStart=new Date(todayMon)
              weekStart.setDate(todayMon.getDate()+sumWeekOffset*7)
              const weekEnd=new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6)
              const weekDays=Array.from({length:7},(_,i)=>{
                const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); return d
              })
              const fmt=d=>`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
              const ws=weekStart; const we=weekEnd
              const weekLabel=ws.getMonth()===we.getMonth()
                ? `${ws.getDate()}–${we.getDate()} ${thMonths[ws.getMonth()+1]} ${ws.getFullYear()+543}`
                : `${ws.getDate()} ${thMonths[ws.getMonth()+1]} – ${we.getDate()} ${thMonths[we.getMonth()+1]} ${we.getFullYear()+543}`
              return (
                <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:14,
                  overflow:"hidden",marginBottom:12}}>
                  {/* header สัปดาห์ */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                    padding:"10px 14px",borderBottom:`1px solid ${C.border}`}}>
                    <button onClick={()=>setSumWeekOffset(o=>o-1)}
                      style={{background:"none",border:"none",fontSize:20,cursor:"pointer",
                        color:C.textSub,padding:"0 4px",lineHeight:1}}>‹</button>
                    <span style={{fontSize:14,fontWeight:700,color:C.text}}>{weekLabel}</span>
                    <button onClick={()=>setSumWeekOffset(o=>Math.min(0,o+1))}
                      style={{background:"none",border:"none",fontSize:20,cursor:"pointer",
                        color:sumWeekOffset===0?C.border2:C.textSub,padding:"0 4px",lineHeight:1}}>›</button>
                  </div>
                  {/* 7 วัน */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,padding:"8px 6px"}}>
                    {weekDays.map(d=>{
                      const dk=fmt(d)
                      const hasData=sortedDates.includes(dk)
                      const active=activeDK===dk
                      const isToday=fmt(d)===fmt(today)
                      return (
                        <button key={dk} onClick={()=>hasData&&setSumDate(dk)}
                          style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                            padding:"6px 2px",borderRadius:10,cursor:hasData?"pointer":"default",fontFamily:"inherit",
                            border:`2px solid ${active?C.primary:"transparent"}`,
                            background:active?C.primary:"transparent"}}>
                          <span style={{fontSize:9,color:active?"#fff":isToday?C.primary:C.textMute,fontWeight:isToday?700:400}}>
                            {dayNames[d.getDay()]}
                          </span>
                          <span style={{fontSize:14,fontWeight:700,color:active?"#fff":hasData?C.text:C.border2}}>
                            {d.getDate()}
                          </span>
                          {hasData&&!active&&<div style={{width:5,height:5,borderRadius:"50%",background:C.primary}}/>}
                          {!hasData&&<div style={{width:5,height:5}}/>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* Zone chips */}
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
              <button onClick={()=>setSumZone(["all"])} style={{
                padding:"5px 14px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontSize:12,
                border:`1.5px solid ${sumZone.includes("all")?"#475569":C.border2}`,
                background:sumZone.includes("all")?"#475569":"transparent",
                color:sumZone.includes("all")?"#fff":C.textSub,fontWeight:sumZone.includes("all")?700:400}}>
                ทั้งหมด
              </button>
              {zones.map(z=>{
                const sel=!sumZone.includes("all")&&sumZone.includes(z.id)
                return (
                  <button key={z.id} onClick={()=>{
                    if(sumZone.includes("all")){setSumZone([z.id]);return}
                    const next=sel?sumZone.filter(x=>x!==z.id):[...sumZone,z.id]
                    setSumZone(next.length===0?["all"]:next)
                  }} style={{
                    display:"flex",alignItems:"center",gap:5,
                    padding:"5px 12px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontSize:12,
                    border:`1.5px solid ${sel?z.color:C.border2}`,
                    background:sel?z.color+"22":"transparent",
                    color:sel?z.color:C.textSub,fontWeight:sel?700:400}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:sel?z.color:C.border2,flexShrink:0,display:"inline-block"}}/>
                    {z.name}
                  </button>
                )
              })}
            </div>

            {/* สถานะวัน */}
            {activeDK&&(()=>{
              const pdk=prevKey(activeDK,sortedDates)
              const dr=history.filter(h=>h.dateKey===activeDK)
              const pr=pdk?history.filter(h=>h.dateKey===pdk):[]
              const statuses=[
                {label:"ปิดเมื่อวาน",ok:!!pr.find(h=>h.round==="close")},
                {label:"สั่งเช้าวันนี้",ok:!!dr.find(h=>h.round==="morning")},
                {label:"ปิดวันนี้",ok:!!dr.find(h=>h.round==="close")},
              ]
              return (
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                  {statuses.map(s=>(
                    <span key={s.label} style={{fontSize:12,padding:"4px 12px",borderRadius:20,fontWeight:700,
                      background:s.ok?C.greenBg:C.orangeBg,color:s.ok?C.green:C.orange}}>
                      {s.ok?"✅":"❌"} {s.label}
                    </span>
                  ))}
                </div>
              )
            })()}

            {/* stat cards */}
            {summaryRows.length>0&&(()=>{
              const usedCost=summaryRows.reduce((s,r)=>s+(r.used??0)*r.p.cost,0)
              const remainCost=summaryRows.reduce((s,r)=>s+(r.todayClose??0)*r.p.cost,0)
              const low=summaryRows.filter(r=>r.todayClose!==null&&r.todayClose<r.p.min).length
              return (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                  <div style={{background:"#FCEBEB",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:10,color:"#791F1F",marginBottom:3}}>ใช้ไป</div>
                    <div style={{fontSize:16,fontWeight:800,color:"#A32D2D"}}>฿{usedCost.toLocaleString()}</div>
                  </div>
                  <div style={{background:C.greenBg,borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:10,color:"#166534",marginBottom:3}}>คงเหลือ</div>
                    <div style={{fontSize:16,fontWeight:800,color:C.green}}>฿{remainCost.toLocaleString()}</div>
                  </div>
                  <div style={{background:C.orangeBg,borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:10,color:"#92400E",marginBottom:3}}>ใกล้หมด</div>
                    <div style={{fontSize:16,fontWeight:800,color:C.orange}}>{low} รายการ</div>
                  </div>
                </div>
              )
            })()}

            {/* ตาราง */}
            {!activeDK&&<div style={{textAlign:"center",padding:"32px 0",fontSize:14,color:C.textMute}}>
              กดเลือกวันที่มีข้อมูล (จุดสีน้ำเงิน)
            </div>}
            {zones.filter(z=>sumZone.includes("all")||sumZone.includes(z.id)).map(z=>{
              const zRows=summaryRows.filter(r=>r.p.zone===z.id)
              if(!zRows.length) return null
              const maxUsed=Math.max(1,...zRows.map(r=>r.used||0))
              return (
                <div key={z.id} style={{marginBottom:18}}>
                  <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,padding:"9px 12px",
                      background:C.bgCard2,borderBottom:`1px solid ${C.border}`}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:z.color,flexShrink:0,display:"inline-block"}}/>
                      <span style={{fontSize:13,fontWeight:700,color:z.color}}>{z.name}</span>
                    </div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed",minWidth:300}}>
                        <thead>
                          <tr style={{background:C.bgCard2}}>
                            {["สินค้า","ต้น","ปิด","ใช้ไป","฿"].map((h,i)=>(
                              <th key={h} style={{padding:"6px 8px",fontSize:10,color:C.textMute,fontWeight:700,
                                textAlign:i===0?"left":"right",
                                width:i===0?"32%":i===3?"22%":"15%",
                                borderBottom:`1px solid ${C.border}`}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {zRows.map(({p,prevClose,morning,todayClose,start,used},i)=>{
                            const uc=used!=null?used*p.cost:null
                            const barPct=used>0?Math.round((used/maxUsed)*100):0
                            return (
                              <tr key={p.id} style={{borderBottom:i<zRows.length-1?`1px solid ${C.border}`:"none",
                                background:i%2===0?"transparent":C.bgCard2}}>
                                <td style={{padding:"9px 8px"}}>
                                  <div style={{fontSize:12,fontWeight:700,color:C.text}}>{p.name}</div>
                                  <div style={{fontSize:10,color:C.textMute}}>{p.unit}</div>
                                  {todayClose!=null&&todayClose<p.min&&(
                                    <span style={{fontSize:9,background:C.orangeBg,color:C.orange,
                                      padding:"1px 5px",borderRadius:5,fontWeight:700}}>ใกล้หมด</span>
                                  )}
                                </td>
                                <td style={{padding:"9px 8px",fontSize:12,color:C.textSub,textAlign:"right"}}>
                                  {(prevClose!=null||morning!=null)?start:<span style={{color:C.border2}}>—</span>}
                                </td>
                                <td style={{padding:"9px 8px",fontSize:12,color:C.text,textAlign:"right"}}>
                                  {todayClose!=null?todayClose:<span style={{color:C.textMute,fontSize:11}}>รอปิด</span>}
                                </td>
                                <td style={{padding:"9px 8px",textAlign:"right"}}>
                                  {used!=null
                                    ? <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                                        <span style={{fontSize:12,fontWeight:700,color:used>0?"#A32D2D":C.green}}>
                                          {used>0?`-${used}`:0}
                                        </span>
                                        {used>0&&<div style={{width:36,height:4,borderRadius:2,background:C.border2,overflow:"hidden"}}>
                                          <div style={{height:"100%",borderRadius:2,background:"#E24B4A",width:`${barPct}%`}}/>
                                        </div>}
                                      </div>
                                    : <span style={{color:C.textMute,fontSize:11}}>รอ</span>
                                  }
                                </td>
                                <td style={{padding:"9px 8px",fontSize:12,color:C.purple,textAlign:"right",fontWeight:700}}>
                                  {uc!=null?`฿${uc.toLocaleString()}`:"—"}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {/* ═══ ตั้งค่า ═══ */}
        {tab==="settings"&&(
          <div>
            {/* LINE */}
            {isOwner&&(
              <LCard>
                <ST>📲 ตั้งค่า LINE</ST>
                <div style={{fontSize:13,color:C.textSub,marginBottom:14,lineHeight:1.8,
                  background:C.primaryBg,borderRadius:10,padding:"10px 14px"}}>
                  1. เข้า <a href="https://developers.line.biz" target="_blank" rel="noreferrer"
                    style={{color:C.primary,fontWeight:700}}>developers.line.biz</a><br/>
                  2. Messaging API → คัดลอก Channel Access Token<br/>
                  3. เพิ่ม Bot เข้ากลุ่ม → รับ Group ID จาก webhook
                </div>
                <Label2>Channel Access Token</Label2>
                <div style={{display:"flex",gap:8,marginBottom:6}}>
                  <input type={showToken?"text":"password"} value={tokenInput}
                    onChange={e=>setTokenInput(e.target.value)}
                    placeholder="วาง Channel Access Token..."
                    style={{...lInp(),flex:1}}/>
                  <button onClick={()=>setShowToken(!showToken)}
                    style={{padding:"8px 14px",borderRadius:10,border:`1px solid ${C.border2}`,
                      background:C.bgCard2,cursor:"pointer",fontFamily:"inherit",fontSize:13,color:C.textSub}}>
                    {showToken?"ซ่อน":"แสดง"}
                  </button>
                </div>
                <div style={{marginBottom:16}}>
                  <BigBtn color={C.primary} onClick={saveToken}>💾 บันทึก Token</BigBtn>
                  <span style={{marginLeft:10,fontSize:13,color:lineToken?C.green:C.textMute,fontWeight:700}}>
                    {lineToken?"✅ มี Token แล้ว":"⚠️ ยังไม่มี Token"}
                  </span>
                </div>
                <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
                  <Label2>กลุ่ม LINE ({groupIds.length} กลุ่ม)</Label2>
                  {groupIds.map(g=>{
                    const types=g.types||["all"]; const gshops=g.shops||["all"]; const gbars=g.bars||["all"]
                    const TL={morning:"🌅 เช็คที่สั่ง",close:"🌙 ปิดร้าน",order:"🛒 สั่งของ",all:"📋 ทั้งหมด"}
                    return (
                    <div key={g.id} style={{padding:"12px",background:C.bgCard2,borderRadius:10,marginBottom:8,border:`1px solid ${C.border}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:14,fontWeight:700,color:C.text}}>{g.name}</div>
                          <div style={{fontSize:11,color:C.textMute,marginTop:2,fontFamily:"monospace",wordBreak:"break-all"}}>{g.groupId}</div>
                        </div>
                        <DelBtn onClick={()=>setGroupIds(groupIds.filter(x=>x.id!==g.id))}/>
                      </div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {types.map(t=><span key={t} style={{fontSize:11,padding:"2px 8px",borderRadius:8,fontWeight:700,
                          background:t==="all"?"#47556920":t==="morning"?C.primaryBg:t==="close"?"#47556920":C.orangeBg,
                          color:t==="all"?"#475569":t==="morning"?C.primary:t==="close"?"#475569":C.orange}}>{TL[t]||t}</span>)}
                        {!gshops.includes("all")&&gshops.map(s=><span key={s} style={{fontSize:11,padding:"2px 8px",borderRadius:8,fontWeight:700,background:C.greenBg,color:C.green}}>🏪 {s}</span>)}
                        {!gbars.includes("all")&&gbars.map(b=><span key={b} style={{fontSize:11,padding:"2px 8px",borderRadius:8,fontWeight:700,background:"#F3E8FF",color:"#7C3AED"}}>🍽 {b}</span>)}
                      </div>
                    </div>
                  )})}
                  <div style={{background:C.bgCard2,borderRadius:12,padding:"12px 14px",border:`1px dashed ${C.border2}`,marginTop:8}}>
                    <div style={{fontSize:13,fontWeight:700,color:C.textSub,marginBottom:10}}>+ เพิ่มกลุ่ม LINE</div>
                    <input value={newGName} onChange={e=>setNewGName(e.target.value)} placeholder="ชื่อกลุ่ม เช่น กลุ่มร้านทะเล" style={{...lInp(),marginBottom:8}}/>
                    <input value={newGId} onChange={e=>setNewGId(e.target.value)} placeholder="Group ID: C1234..." style={{...lInp(),marginBottom:10,fontFamily:"monospace",fontSize:13}}/>

                    <div style={{fontSize:12,fontWeight:700,color:C.textMute,marginBottom:8}}>ประเภทข้อความ</div>
                    {[{id:"all",label:"📋 ทั้งหมด",color:"#475569",bg:"#47556915"},{id:"morning",label:"🌅 เช็คที่สั่ง",color:C.primary,bg:C.primaryBg},{id:"close",label:"🌙 ปิดร้าน",color:"#475569",bg:"#47556915"},{id:"order",label:"🛒 สั่งของ",color:C.orange,bg:C.orangeBg}].map(t=>{
                      const ic=newGTypes.includes(t.id)
                      return <div key={t.id} onClick={()=>{if(t.id==="all"){setNewGTypes(["all"]);return};const w=newGTypes.filter(x=>x!=="all");setNewGTypes(ic?w.filter(x=>x!==t.id):[...w,t.id])}}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:10,marginBottom:5,cursor:"pointer",border:`2px solid ${ic?t.color:C.border}`,background:ic?t.bg:"transparent"}}>
                        <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${ic?t.color:C.border2}`,background:ic?t.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {ic&&<span style={{color:"#fff",fontSize:12,fontWeight:900}}>✓</span>}
                        </div>
                        <span style={{fontSize:13,fontWeight:700,color:ic?t.color:C.textSub}}>{t.label}</span>
                      </div>
                    })}

                    <div style={{fontSize:12,fontWeight:700,color:C.textMute,margin:"12px 0 8px"}}>กรองร้านค้า (ซัพพลาย)</div>
                    {[{id:"all",label:"🏪 ทุกร้านค้า"},...zones.map(z=>({id:z.id,label:z.name}))].map(z=>{
                      const ic=newGShops.includes(z.id)
                      return <div key={z.id} onClick={()=>{if(z.id==="all"){setNewGShops(["all"]);return};const w=newGShops.filter(x=>x!=="all");setNewGShops(ic?w.filter(x=>x!==z.id):[...w,z.id])}}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:10,marginBottom:5,cursor:"pointer",border:`2px solid ${ic?C.green:C.border}`,background:ic?C.greenBg:"transparent"}}>
                        <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${ic?C.green:C.border2}`,background:ic?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {ic&&<span style={{color:"#fff",fontSize:12,fontWeight:900}}>✓</span>}
                        </div>
                        <span style={{fontSize:13,fontWeight:700,color:ic?C.green:C.textSub}}>{z.label}</span>
                      </div>
                    })}

                    <div style={{fontSize:12,fontWeight:700,color:C.textMute,margin:"12px 0 8px"}}>กรองบาร์ (หมวดหมู่อาหาร)</div>
                    {[{id:"all",label:"🍽 ทุกบาร์"},...shops.map(s=>({id:s,label:s}))].map(b=>{
                      const ic=newGBars.includes(b.id)
                      return <div key={b.id} onClick={()=>{if(b.id==="all"){setNewGBars(["all"]);return};const w=newGBars.filter(x=>x!=="all");setNewGBars(ic?w.filter(x=>x!==b.id):[...w,b.id])}}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:10,marginBottom:5,cursor:"pointer",border:`2px solid ${ic?"#7C3AED":C.border}`,background:ic?"#F3E8FF":"transparent"}}>
                        <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${ic?"#7C3AED":C.border2}`,background:ic?"#7C3AED":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {ic&&<span style={{color:"#fff",fontSize:12,fontWeight:900}}>✓</span>}
                        </div>
                        <span style={{fontSize:13,fontWeight:700,color:ic?"#7C3AED":C.textSub}}>{b.label}</span>
                      </div>
                    })}

                    <BigBtn color={C.line} onClick={()=>{
                      if(!newGName.trim()||!newGId.trim())return
                      setGroupIds([...groupIds,{id:Date.now().toString(),name:newGName.trim(),groupId:newGId.trim(),
                        types:newGTypes.length===0?["all"]:newGTypes,
                        shops:newGShops.length===0?["all"]:newGShops,
                        bars:newGBars.length===0?["all"]:newGBars}])
                      setNewGName(""); setNewGId(""); setNewGTypes(["all"]); setNewGShops(["all"]); setNewGBars(["all"])
                      showToast("✅ เพิ่มกลุ่มแล้ว")
                    }}>+ เพิ่มกลุ่ม</BigBtn>
                  </div>
                </div>
                <div style={{marginTop:14,padding:"10px 14px",borderRadius:10,fontSize:14,fontWeight:700,
                  background:lineToken&&groupIds.length>0?C.greenBg:C.orangeBg,
                  color:lineToken&&groupIds.length>0?C.green:C.orange}}>
                  {lineToken&&groupIds.length>0?`✅ พร้อมส่ง LINE ${groupIds.length} กลุ่ม`:"⚠️ ต้องมีทั้ง Token และอย่างน้อย 1 กลุ่ม"}
                </div>
              </LCard>
            )}

            {/* พนักงาน */}
            <LCard>
              <ST>👤 รายชื่อพนักงาน</ST>
              {staff.map(s=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,
                  padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:15,fontWeight:600,color:C.text,flex:1}}>{s.name}</span>
                  {isOwner&&<DelBtn onClick={()=>setStaff(staff.filter(x=>x.id!==s.id))}/>}
                </div>
              ))}
              {staff.length===0&&<div style={{fontSize:13,color:C.textMute,marginBottom:8}}>ยังไม่มีรายชื่อ</div>}
              {isOwner?(
                <InAdd value={newStaffName} onChange={setNewStaffName} placeholder="ชื่อพนักงาน" onAdd={()=>{
                  if(!newStaffName.trim())return
                  setStaff([...staff,{id:Date.now().toString(),name:newStaffName.trim()}])
                  setNewStaffName(""); showToast("✅ เพิ่มพนักงานแล้ว")
                }}/>
              ):<LN>เพิ่ม/ลบพนักงาน — เฉพาะเจ้าของ</LN>}
            </LCard>

            {/* ร้านค้า */}
            <LCard>
              <ST>📍 ร้านค้าที่จะสั่ง</ST>
              {zones.map(z=>(
                <div key={z.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <ZoneDot color={z.color}/>
                  <span style={{fontSize:15,color:C.text,flex:1,fontWeight:600}}>{z.name}</span>
                  {isOwner&&<DelBtn onClick={()=>setZones(zones.filter(x=>x.id!==z.id))}/>}
                </div>
              ))}
              {isOwner
                ?<InAdd value={newZone} onChange={setNewZone} placeholder="ชื่อร้านค้าใหม่" onAdd={()=>{
                  if(!newZone.trim())return
                  setZones([...zones,{id:"z"+Date.now(),name:newZone.trim(),color:ZONE_COLORS[zones.length%ZONE_COLORS.length]}])
                  setNewZone("")
                }}/>
                :<LN>เพิ่ม/ลบร้านค้า — เฉพาะเจ้าของ</LN>}
            </LCard>

            {/* บาร์ */}
            <LCard>
              <ST>🛒 บาร์</ST>
              {shops.map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:15,color:C.text,flex:1,fontWeight:600}}>{s}</span>
                  {isOwner&&<DelBtn onClick={()=>setShops(shops.filter((_,j)=>j!==i))}/>}
                </div>
              ))}
              {isOwner
                ?<InAdd value={newShop} onChange={setNewShop} placeholder="ชื่อบาร์" onAdd={()=>{
                  if(!newShop.trim())return; setShops([...shops,newShop.trim()]); setNewShop("")
                }}/>
                :<LN>เพิ่ม/ลบบาร์ — เฉพาะเจ้าของ</LN>}
            </LCard>

            {/* สินค้า */}
            <LCard>
              <ST>📦 รายการสินค้า <span style={{fontSize:12,color:C.textMute,fontWeight:400}}>({products.length} รายการ)</span></ST>
              {products.map(p=>{
                const z=zoneOf(p.zone)
                return (
                  <div key={p.id} style={{padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:isOwner?8:0}}>
                      <ZoneDot color={z.color} size={8}/>
                      <span style={{fontSize:14,color:C.text,flex:1,fontWeight:700}}>{p.name}</span>
                      {isOwner&&<DelBtn onClick={()=>setProducts(products.filter(x=>x.id!==p.id))}/>}
                    </div>
                    {isOwner&&(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,paddingLeft:16}}>
                        <div>
                          <div style={{fontSize:11,color:C.textMute,marginBottom:3}}>หน่วย</div>
                          <input value={p.unit} onChange={e=>updProd(p.id,"unit",e.target.value)}
                            style={{...lInp(),fontSize:13,padding:"6px 10px"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:11,color:C.textMute,marginBottom:3}}>สต็อกต่ำสุด</div>
                          <input type="number" value={p.min} onChange={e=>updProd(p.id,"min",parseInt(e.target.value)||0)}
                            style={{...lInp(),fontSize:13,padding:"6px 10px"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:11,color:C.textMute,marginBottom:3}}>ราคา/หน่วย (฿)</div>
                          <input type="number" value={p.cost} onChange={e=>updProd(p.id,"cost",parseInt(e.target.value)||0)}
                            style={{...lInp(),fontSize:13,padding:"6px 10px",color:C.purple,fontWeight:700}}/>
                        </div>
                        <div>
                          <div style={{fontSize:11,color:C.textMute,marginBottom:3}}>บาร์</div>
                          <select value={p.shop} onChange={e=>updProd(p.id,"shop",e.target.value)}
                            style={{...lSel(),fontSize:13,padding:"6px 10px"}}>
                            {shops.map(s=><option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    {!isOwner&&(
                      <div style={{paddingLeft:16,fontSize:12,color:C.textMute}}>
                        {p.unit} · ต่ำสุด {p.min} · {p.shop}
                      </div>
                    )}
                  </div>
                )
              })}
              {isOwner?(
                <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.textMute,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>เพิ่มสินค้าใหม่</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                    <input value={npName} onChange={e=>setNpName(e.target.value)} placeholder="ชื่อสินค้า" style={lInp()}/>
                    <select value={npZone} onChange={e=>setNpZone(e.target.value)} style={lSel()}>
                      {zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                    <input value={npUnit} onChange={e=>setNpUnit(e.target.value)} placeholder="หน่วย" style={lInp()}/>
                    <input type="number" value={npMin} onChange={e=>setNpMin(parseInt(e.target.value)||0)} placeholder="สต็อกต่ำสุด" style={lInp()}/>
                    <input type="number" value={npCost} onChange={e=>setNpCost(parseInt(e.target.value)||0)} placeholder="ต้นทุน/หน่วย (฿)" style={lInp()}/>
                    <select value={npShop||shops[0]} onChange={e=>setNpShop(e.target.value)} style={lSel()}>
                      {shops.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <BigBtn color={C.primary} onClick={()=>{
                    if(!npName.trim())return
                    setProducts([...products,{id:nextId,name:npName.trim(),zone:npZone,unit:npUnit||"ชิ้น",
                      min:npMin,cost:npCost,morning:0,close:0,order:0,shop:npShop||shops[0]}])
                    setNextId(nextId+1); setNpName(""); setNpUnit(""); setNpMin(5); setNpCost(0)
                  }}>+ เพิ่มสินค้า</BigBtn>
                </div>
              ):<LN>เพิ่ม/ลบสินค้า — เฉพาะเจ้าของ</LN>}
            </LCard>

            {/* เปลี่ยนรหัสเจ้าของ */}
            {isOwner&&(
              <LCard>
                <ST>🔐 เปลี่ยนรหัสเจ้าของ</ST>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div>
                    <Label2>รหัสปัจจุบัน</Label2>
                    <input type="password" value={pinOld} onChange={e=>setPinOld(e.target.value)}
                      placeholder="ใส่รหัสเดิม" style={lInp()}/>
                  </div>
                  <div>
                    <Label2>รหัสใหม่</Label2>
                    <input type="password" value={pinNew} onChange={e=>setPinNew(e.target.value)}
                      placeholder="ใส่รหัสใหม่ (ตัวเลข 4+ หลัก)" style={lInp()}/>
                  </div>
                  <div>
                    <Label2>ยืนยันรหัสใหม่</Label2>
                    <input type="password" value={pinNew2} onChange={e=>setPinNew2(e.target.value)}
                      placeholder="ยืนยันรหัสใหม่อีกครั้ง" style={lInp()}/>
                  </div>
                  <BigBtn color={C.primary} onClick={()=>{
                    if(pinOld!==ownerPin){showToast("❌ รหัสเดิมไม่ถูกต้อง",C.red);return}
                    if(pinNew.length<4){showToast("⚠️ รหัสใหม่ต้องมีอย่างน้อย 4 หลัก",C.orange);return}
                    if(pinNew!==pinNew2){showToast("❌ รหัสใหม่ไม่ตรงกัน",C.red);return}
                    setOwnerPin(pinNew)
                    persist.ownerPin && persist.ownerPin(pinNew)
                    setPinOld(""); setPinNew(""); setPinNew2("")
                    showToast("✅ เปลี่ยนรหัสสำเร็จ!",C.green,true)
                  }}>🔐 บันทึกรหัสใหม่</BigBtn>
                </div>
              </LCard>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:720,background:C.bgCard,borderTop:`1px solid ${C.border}`,
        display:"flex",zIndex:200}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,padding:"10px 4px 14px",border:"none",background:"transparent",
            cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",
            alignItems:"center",gap:3,color:tab===t.id?C.primary:C.textMute}}>
            <span style={{fontSize:20}}>{t.icon}</span>
            <span style={{fontSize:12,fontWeight:tab===t.id?800:500}}>{t.label}</span>
            {tab===t.id&&<span style={{width:20,height:3,borderRadius:2,background:C.primary}}/>}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function lInp() {
  return {padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.border2}`,
    background:C.bgCard,color:C.text,fontSize:14,fontFamily:"inherit",width:"100%",outline:"none"}
}
function lSel() {
  return {padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.border2}`,
    background:C.bgCard,color:C.text,fontSize:14,fontFamily:"inherit",width:"100%",cursor:"pointer"}
}
function LCard({children,style}) {
  return <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:14,
    padding:"14px 16px",marginBottom:16,...style}}>{children}</div>
}
function ST({children}) {
  return <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:14}}>{children}</div>
}
function Label2({children}) {
  return <div style={{fontSize:13,color:C.textSub,marginBottom:6,fontWeight:600}}>{children}</div>
}
function QBox({value,onChange}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <QB onClick={()=>onChange(Math.max(0,value-1))}>−</QB>
      <input type="number" value={value} min={0}
        onChange={e=>onChange(Math.max(0,parseInt(e.target.value)||0))}
        style={{width:54,textAlign:"center",background:C.bgCard2,border:`1.5px solid ${C.border2}`,
          color:C.text,borderRadius:8,padding:"5px 0",fontSize:15,fontFamily:"inherit"}}/>
      <QB onClick={()=>onChange(value+1)}>+</QB>
    </div>
  )
}
function QB({onClick,children}) {
  return <button onClick={onClick} style={{width:32,height:32,borderRadius:8,
    border:`1.5px solid ${C.border2}`,background:C.bgCard2,color:C.text,
    cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>{children}</button>
}
function SBadge({val,min}) {
  if(val===null) return <span style={sb(C.border2,C.textMute)}>รอข้อมูล</span>
  if(val===0)   return <span style={sb(C.redBg,C.red)}>หมด</span>
  if(val<min)   return <span style={sb(C.orangeBg,C.orange)}>ใกล้หมด</span>
  return <span style={sb(C.greenBg,C.green)}>ปกติ</span>
}
function sb(bg,color){return{background:bg,color,padding:"2px 9px",borderRadius:10,fontSize:12,fontWeight:700}}
function LC({children,bold}){
  return <div style={{padding:"9px 10px",fontSize:13,color:bold?C.text:C.textSub,
    borderBottom:`1px solid ${C.border}`}}>{children}</div>
}
function Fm({children}){return <span style={{color:C.textMute,fontSize:12}}>{children}</span>}
function DelBtn({onClick}){
  return <button onClick={onClick} style={{background:"none",border:"none",cursor:"pointer",
    color:C.red,fontSize:16,padding:"0 4px",lineHeight:1,opacity:0.6}}>✕</button>
}
function LN({children}){
  return <div style={{fontSize:13,color:C.textMute,marginTop:10}}>🔒 {children}</div>
}
function InAdd({value,onChange,placeholder,onAdd}){
  return (
    <div style={{display:"flex",gap:8,marginTop:12}}>
      <input value={value} onChange={e=>onChange(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&onAdd()}
        placeholder={placeholder} style={{...lInp(),flex:1}}/>
      <button onClick={onAdd} style={{padding:"10px 16px",borderRadius:10,
        border:`1.5px solid ${C.primary}`,background:C.primaryBg,color:C.primary,
        cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,whiteSpace:"nowrap"}}>+ เพิ่ม</button>
    </div>
  )
}
function BigBtn({color,onClick,children,disabled}){
  return <button onClick={disabled?undefined:onClick} style={{padding:"12px 24px",borderRadius:14,
    border:"none",fontSize:15,cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",
    fontWeight:800,background:disabled?"#ccc":color,color:"#fff",opacity:disabled?0.5:1}}>{children}</button>
}
function RoundBtn({active,color,onClick,children}){
  return <button onClick={onClick} style={{padding:"10px 20px",borderRadius:20,fontFamily:"inherit",
    fontWeight:700,fontSize:14,cursor:"pointer",border:`2px solid ${active?color:C.border2}`,
    background:active?color:"transparent",color:active?"#fff":C.textSub,transition:"all .15s"}}>{children}</button>
}
function Empty(){
  return <div style={{textAlign:"center",color:C.textMute,padding:24,fontSize:15}}>ยังไม่มีสินค้า — เพิ่มในตั้งค่า</div>
}
