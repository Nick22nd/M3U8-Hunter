import { join } from 'node:path'
import fs from 'node:fs'
import download from 'download'
import { Parser } from 'm3u8-parser'
import { getAppDataDir } from './m3u8.app'
import { TaskItem } from '../common.types'
import async from 'async'
import log from 'electron-log/main';

// Optional, initialize the logger for any renderer process
log.initialize();

export async function downloadTS(task: TaskItem) {
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
  // download key
  const key = parser.manifest.segments[0].key.uri
  if (key) {
    const url = `${baseURL}${key}`
    console.log('key', url)
    await download(url, tsDir, {
      headers: task.headers,
      // agent: url.startsWith('https') ? proxy.https : proxy.http,
      // filename: 'key',
    })
  }
  // console.log('segments', segments)
  // for (const segment of segments) {
  //   console.log('segment', segment)
  //   const url = `${baseURL}${segment.uri}`
  //   // const name = segment.uri
  //   await download(url, tsDir, {
  //     headers: task.headers,
  //     // agent: url.startsWith('https') ? proxy.https : proxy.http,
  //     // filename: name,
  //   })
  // }
  async.mapLimit(segments, 5, async function (segment) {
    console.log('segment', segment)
    try {
      const url = `${baseURL}${segment.uri}`
      // const name = segment.uri
      if (fs.existsSync(join(tsDir, segment.uri))) {
        log.info('[download] already existed, skip segment', segment)
        return 'ok'
      }
      let a = await download(url, tsDir, {
        headers: task.headers,
        // agent: url.startsWith('https') ? proxy.https : proxy.http,
        // filename: name,
      })
      return 'ok'

    } catch (error) {
      console.error(error);
      log.error('[download] error segment', segment, error);
      return 'error'
    }
  }, (err, results) => {
    if (err) {
      console.error(err)
      log.error('[download] error', err);
      return
    }
    // results is now an array of the response bodies
    console.log('task ok', results)
  })
}

// async function mainModule() {
//   await jsondb.init()
//   const data = await jsondb.get()
//   console.log('data', data.tasks.at(0))
//   downloadTS(data.tasks.at(0))
// }
// mainModule()
