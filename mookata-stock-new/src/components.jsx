export function QtyBox({ value, onChange }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <Qbtn onClick={() => onChange(Math.max(0, value-1))}>−</Qbtn>
      <input
        type="number" value={value} min={0}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value)||0))}
        style={{ width:52, textAlign:"center", background:"#1a1a1a", border:"1px solid #2e2e2e",
          color:"#f0f0f0", borderRadius:8, padding:"4px 0", fontSize:14, fontFamily:"inherit" }}
      />
      <Qbtn onClick={() => onChange(value+1)}>+</Qbtn>
    </div>
  )
}
function Qbtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      width:28, height:28, borderRadius:8, border:"1px solid #2e2e2e",
      background:"#1e1e1e", color:"#f0f0f0", cursor:"pointer", fontSize:17,
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>{children}</button>
  )
}

export function StatusBadge({ val, min }) {
  if (val === null) return <span style={badgeStyle("#333","#555")}>รอข้อมูล</span>
  if (val === 0)    return <span style={badgeStyle("#3D0000","#FF6B6B")}>หมด</span>
  if (val < min)    return <span style={badgeStyle("#3D2000","#FFB347")}>ใกล้หมด</span>
  return <span style={badgeStyle("#003D15","#4ADE80")}>ปกติ</span>
}
function badgeStyle(bg, color) {
  return { background:bg, color, padding:"2px 8px", borderRadius:10, fontSize:11, fontWeight:600 }
}

export function ZoneDot({ color, size=8 }) {
  return <span style={{ width:size, height:size, borderRadius:"50%", background:color,
    display:"inline-block", flexShrink:0 }} />
}

export function Card({ children, style }) {
  return (
    <div style={{ background:"#111", border:"1px solid #1e1e1e", borderRadius:14,
      padding:"14px 16px", marginBottom:16, ...style }}>
      {children}
    </div>
  )
}

export function Btn({ children, onClick, variant="default", disabled, style={} }) {
  const base = { padding:"9px 20px", borderRadius:20, border:"none", fontSize:14,
    cursor:disabled?"not-allowed":"pointer", fontFamily:"inherit", fontWeight:700,
    opacity:disabled?0.4:1, transition:"opacity .15s", ...style }
  const variants = {
    default: { background:"#1e1e1e", border:"1px solid #2e2e2e", color:"#ccc" },
    primary: { background:"#f0f0f0", color:"#111" },
    line:    { background:"#00B900", color:"#fff" },
    ghost:   { background:"transparent", border:"1.5px solid #333", color:"#888" },
  }
  return <button onClick={disabled?undefined:onClick} style={{...base,...variants[variant]}}>{children}</button>
}

export function RoundBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:"8px 18px", borderRadius:20, fontFamily:"inherit", fontWeight:700,
      fontSize:13, cursor:"pointer",
      border:`1.5px solid ${active?"#f0f0f0":"#2e2e2e"}`,
      background:active?"#f0f0f0":"transparent",
      color:active?"#111":"#666",
      transition:"all .15s",
    }}>{children}</button>
  )
}

export function InpStyle() {
  return { padding:"8px 12px", borderRadius:10, border:"1px solid #2a2a2a",
    background:"#0d0d0d", color:"#f0f0f0", fontSize:13, fontFamily:"inherit", width:"100%" }
}
export function SelStyle() {
  return { padding:"8px 12px", borderRadius:10, border:"1px solid #2a2a2a",
    background:"#0d0d0d", color:"#f0f0f0", fontSize:13, fontFamily:"inherit",
    width:"100%", cursor:"pointer" }
}
