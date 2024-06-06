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
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal)
        return net.address
    }
  }
}

// const localNetworkIP = getLocalNetworkIP();
