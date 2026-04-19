const DB_KEY = "MASTER_MONITOR_LIST";

const DB = {
  // Read the single master list (1 Read Op - 100k free/day)
  async getList(env) {
    const data = await env.STATUS_WATCH_DB.get(DB_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  // Save the updated list
  async saveList(env, list) {
    if (list.length === 0) {
      await env.STATUS_WATCH_DB.delete(DB_KEY); // Cleanup
    } else {
      await env.STATUS_WATCH_DB.put(DB_KEY, JSON.stringify(list));
    }
  },

  // Add a new site to watch
  async addMonitor(env, url, contact) {
    const list = await this.getList(env);
    // Prevent duplicate entries for the same URL
    if (!list.some(item => item.url === url)) {
      list.push({ url, contact, timestamp: Date.now() });
      await this.saveList(env, list);
    }
  }
};

// --- CORE WORKER LOGIC ---
export default {
  // 1. INGESTION (Browser Extension hits this)
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/track") {
      try {
        const body = await request.json();
        if (!body.url || !body.contact) throw new Error("Missing Data");

        // Save to our optimized array
        await DB.addMonitor(env, body.url, body.contact);

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }
    return new Response("StatusWatch Active & Optimized", { status: 200, headers: corsHeaders });
  },

  // 2. BACKGROUND MONITORING (Cron Job)
  async scheduled(event, env) {
    const activeMonitors = await DB.getList(env);

    // FAIL-FAST: If nothing to monitor, exit immediately to save CPU/KV Limits
    if (activeMonitors.length === 0) {
      console.log("No active monitors. Sleeping...");
      return; 
    }

    const resolvedUrls = [];

    // Ping all sites concurrently
    await Promise.all(activeMonitors.map(async (monitor) => {
      try {
        // Add a timeout to prevent hanging requests
        const ping = await fetch(monitor.url, { 
          method: 'HEAD',
          headers: { 'User-Agent': 'StatusWatch-Bot/1.0' }
        }); 
        
        if (ping.ok) {
          // Add to our resolved list so we can remove it from the DB later
          resolvedUrls.push(monitor.url);

          // Send Email via Resend
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { 
              Authorization: `Bearer ${env.RESEND_API_KEY}`, 
              "Content-Type": "application/json" 
            },
            body: JSON.stringify({
              from: "StatusWatch <onboarding@resend.dev>",
              to: monitor.contact,
              subject: "Site Restored!",
              html: `
                <div style="font-family: sans-serif; padding: 20px;">
                  <h2>Good News!</h2>
                  <p>The site you were watching is back online.</p>
                  <a href="${monitor.url}" style="padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 5px;">Visit ${monitor.url}</a>
                </div>
              `
            })
          });
        }
      } catch (e) {
        console.log(`Site still down or unreachable: ${monitor.url}`);
      }
    }));

    // BATCH CLEANUP: Remove all resolved sites in ONE database write
    if (resolvedUrls.length > 0) {
      const remainingMonitors = activeMonitors.filter(m => !resolvedUrls.includes(m.url));
      await DB.saveList(env, remainingMonitors);
      console.log(`Cleaned up ${resolvedUrls.length} restored sites.`);
    }
  }
};