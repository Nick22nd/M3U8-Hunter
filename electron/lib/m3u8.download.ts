import { join } from 'node:path'
import fs from 'node:fs'
import download from 'download'
import { Parser } from 'm3u8-parser'
import { getAppDataDir } from './m3u8.app'
import { Task } from '../../common/common.types'
import { HttpProxyAgent, HttpsProxyAgent } from './proxy'

export async function downloadTS(task: Task) {
  console.log('task', task)
  const sampleFilename = new URL(task.url).pathname.split('/').pop()
  const targetPath = getAppDataDir()
  const baseURL = task.url.replace(sampleFilename, '')
  console.log('baseURL', baseURL)
  const tsDir = `${targetPath}/${sampleFilename.split('.')[0]}`
  console.log('tsDir', tsDir)

  const str = fs.readFileSync(join(targetPath, sampleFilename), 'utf8')
  const parser = new Parser()
  parser.push(str)
  // console.log(parser.manifest)
  const { segments } = parser.manifest
  let streamDuration = 0
  streamDuration = segments.reduce((acc, cur) => {
    return acc + cur.duration
  }, 0)
  console.log('streamDuration: ', streamDuration)

  if (!fs.existsSync(tsDir)) {
    console.log('tsDir', tsDir)
    fs.mkdirSync(tsDir, { recursive: true })
  }
  const proxy = {
    http: new HttpProxyAgent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      proxy: "http://127.0.0.1:7890"
    }),
    https: new HttpsProxyAgent({
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 256,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      proxy: "https://127.0.0.1:7890"
    })
  }
  // download key
  const key = parser.manifest.segments[0].key.uri
  if (key) {
    const url = `${baseURL}${key.uri}`
    console.log('key', key)
    await download(url, tsDir, {
      headers: task.headers,
      // agent: url.startsWith('https') ? proxy.https : proxy.http,
      // filename: 'key',
    })
  }
  // console.log('segments', segments)
  for (const segment of segments) {
    console.log('segment', segment)
    const url = `${baseURL}${segment.uri}`
    // const name = segment.uri
    await download(url, tsDir, {
      headers: task.headers,
      // agent: url.startsWith('https') ? proxy.https : proxy.http,
      // filename: name,
    })
  }
}

// async function mainModule() {
//   await jsondb.init()
//   const data = await jsondb.get()
//   console.log('data', data.tasks.at(0))
//   downloadTS(data.tasks.at(0))
// }
// mainModule()
