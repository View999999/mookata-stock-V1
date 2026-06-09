// Vercel Serverless Function — ส่งข้อความ LINE Messaging API (หลายกลุ่ม)
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" })
  }

  const { message, channelToken, groupIds } = req.body
  // groupIds = ["Cxxx", "Cyyy", ...] หรือ string เดียว (backward compat)

  if (!channelToken || !groupIds || !message) {
    return res.status(400).json({ ok: false, error: "ข้อมูลไม่ครบ" })
  }

  const ids = Array.isArray(groupIds) ? groupIds : [groupIds]

  const results = await Promise.all(ids.map(async (to) => {
    try {
      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${channelToken}`,
        },
        body: JSON.stringify({
          to,
          messages: [{ type: "text", text: message }],
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        return { to, ok: false, error: err.message || "LINE API error" }
      }
      return { to, ok: true }
    } catch (err) {
      return { to, ok: false, error: err.message }
    }
  }))

  const allOk = results.every(r => r.ok)
  return res.status(allOk ? 200 : 207).json({ ok: allOk, results })
}
