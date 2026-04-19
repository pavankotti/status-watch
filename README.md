# StatusWatch | Distributed SRE Downtime Monitor

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=Cloudflare&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![Chrome API](https://img.shields.io/badge/Chrome_Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)
![Resend](https://img.shields.io/badge/Resend-000000?style=for-the-badge&logo=minutemailer&logoColor=white)

StatusWatch is a serverless, event-driven downtime monitoring tool. Instead of wasting CPU cycles and database operations continuously polling live sites, StatusWatch uses a **"Fail-Fast, Lazy-Registry"** architecture to only monitor infrastructure that is confirmed to be offline.

It consists of a real-time Chrome Extension for interception and a Cloudflare Worker for background polling and alerting.

## 🚀 The Architecture

1. **Passive Interception (Frontend):** The Chrome Extension uses the `webRequest` API to silently monitor network traffic. It only wakes up when a user encounters a `5xx` server error (500, 502, 503, 504).
2. **Ingestion (Edge):** When a user triggers a "Vigil", the extension sends the URL and contact email to a Cloudflare Worker via a POST request.
3. **Lazy-Registry Storage (Database):** To bypass expensive KV `list()` operations, the Worker stores all active monitors in a single, batched JSON array within Cloudflare KV.
4. **Asynchronous Polling (Cron):** A Cloudflare Cron Trigger wakes up every minute. **Fail-Fast mechanism:** If the KV array is empty, it exits instantly (0 write costs). If active, it concurrently pings the offline URLs.
5. **Automated Recovery:** When a `200 OK` is detected, the Worker triggers the **Resend API** to email the user, and atomically removes the resolved URL from the KV array.

## 🧠 SRE Cost Optimization

Most custom monitoring tools fail on serverless free tiers because they poll constantly.

StatusWatch was specifically engineered to minimize Cloudflare KV read/write operations:

* **No `list()` Operations:** Cloudflare charges heavily for listing keys. StatusWatch uses a Single-Key Master Array, reducing costs by 90%.
* **Zero-Cost Idle:** When no sites are down, the Cron job performs exactly **1 Read (Free)** and **0 Writes/Deletes**, keeping it effortlessly within the free tier.

## 📂 Repository Structure

```text
/status-watch
│
├── /extension        # Chrome Extension source code (UI & Background scripts)
└── /worker           # Cloudflare Worker API & Cron job (Node.js)
```

## 🛠️ Local Setup & Installation

### 1. Deploying the Cloudflare Worker

```bash
cd worker
npm install
```

Add your secrets. You will need a free Resend API key:

```bash
npx wrangler secret put RESEND_API_KEY
```

Deploy to Cloudflare's edge network:

```bash
npx wrangler deploy
```

### 2. Installing the Chrome Extension

- Open Google Chrome and navigate to `chrome://extensions/`.
- Enable Developer mode in the top right corner.
- Click **Load unpacked** and select the `/extension` folder from this repository.
- Pin the extension to your toolbar.
- (Optional) Update the API URL in `monitor.js` to point to your newly deployed Cloudflare Worker URL.

## 💡 Use Case

Perfect for developers, SREs, or anyone waiting for a crashed service (ticket booking, flash sales, university portals) to come back online without manually refreshing the page.
