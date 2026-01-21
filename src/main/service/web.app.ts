import os from 'node:os'
import express from 'express'
import cors from 'cors'
import portfinder from 'portfinder'
import { getAppDataDir } from '../lib/utils'

export const serverConfig = {
  ip: 'localhost',
  port: 3000,
  serverStarted: false,
}
async function main() {
  const app = express()
  const appDir = getAppDataDir()
  app.use(cors())
  app.use(express.static(appDir))

  // Find an available port
  let port = 3000
  try {
    port = await portfinder.getPortPromise({
      port: 3000,
      startPort: 3000,
      stopPort: 4000,
    })
    console.log('port', port)
  }
  catch (error) {
    console.error('error', error)
  }

  // Start the server
  const server = app.listen(port, () => {
    const address = server.address()
    const host = address.address
    serverConfig.serverStarted = true
    console.log(`Server running at http://${host}:${port}/`)
  })
  try {
    serverConfig.ip = getLocalNetworkIP()
    serverConfig.port = port
  }
  catch (error) {
    console.log('error', error)
  }
}
export function runServe() {
  main()
}

function getLocalNetworkIP() {
  const networkInterfaces = os.networkInterfaces()
  // Priority keywords for network adapters (in order of preference)
  const priorities = ['以太网', 'WLAN', 'Wireless', 'Wi-Fi', 'WiFi', '无线局域网']
  // Keywords to skip (virtual adapters)
  const skipKeywords = ['WSL', 'Hyper-V', 'VMware', 'VirtualBox', 'vEthernet', '未知适配器', 'Loopback', 'Tunnel']

  let bestMatch: { ip: string, priority: number } | null = null

  for (const name of Object.keys(networkInterfaces)) {
    // Skip adapters with skip keywords
    if (skipKeywords.some(keyword => name.includes(keyword)))
      continue

    // Calculate priority score based on adapter name
    let priority = -1
    for (let i = 0; i < priorities.length; i++) {
      if (name.includes(priorities[i])) {
        priority = priorities.length - i // Higher index = lower priority
        break
      }
    }

    for (const net of networkInterfaces[name]) {
      // Skip over non-IPv4 and internal addresses
      if (net.family === 'IPv4' && !net.internal) {
        // If this is a priority adapter, return it immediately
        if (priority > 0)
          return net.address

        // Otherwise, keep track of the first valid IP (fallback)
        if (!bestMatch) {
          bestMatch = { ip: net.address, priority }
        }
      }
    }
  }

  // Return the best match found, or undefined if no valid IP found
  return bestMatch?.ip
}

// const localNetworkIP = getLocalNetworkIP();
