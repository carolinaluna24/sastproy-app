// test-edge.js

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env.js"

async function callEdgeFunction() {
  const url = `${SUPABASE_URL}/functions/v1/edit-user`

  try {
    console.log("📡 Llamando a:", url)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ping: true })
    })

    const text = await response.text()

    console.log("STATUS:", response.status)
    console.log("RESPONSE:", text)

  } catch (error) {
    console.error("🔥 Error de red:", error)
  }
}

callEdgeFunction()
