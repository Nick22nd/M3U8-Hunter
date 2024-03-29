import { join } from 'node:path'
import fs from 'node:fs'
import download from 'download'
import { Parser } from 'm3u8-parser'
import { getAppDataDir } from './m3u8.app'
import { TaskItem } from '../common.types'
import async from 'async'
import log from 'electron-log/main';
import { jsondb } from './jsondb'
import { updateProgress } from '../main'

// Optional, initialize the logger for any renderer process
log.initialize();

export async function downloadTS(task: TaskItem) {
  console.log('task', task)
  const urlOjb = new URL(task.url)
  const sampleFilename = urlOjb.pathname.split('/').pop()
  const targetPath = getAppDataDir()
  const baseURL = task.url.substring(0, task.url.indexOf(sampleFilename))
  console.log('baseURL', baseURL)
  const tsDir = task.directory
  console.log('tsDir', tsDir)

  const str = fs.readFileSync(join(tsDir, sampleFilename), 'utf8')
  const parser = new Parser()
  parser.push(str)
  // console.log(parser.manifest)
  const { segments } = parser.manifest
  let streamDuration = 0
  streamDuration = segments.reduce((acc, cur) => {
    return acc + cur.duration
  }, 0)
  const segmentCount = segments.length
  let downloadedCount = 0
  console.log('streamDuration: ', streamDuration)

  if (!fs.existsSync(tsDir)) {
    console.log('tsDir', tsDir)
    fs.mkdirSync(tsDir, { recursive: true })
  }
  // download key
  const key = parser.manifest.segments[0].key?.uri
  if (key) {
    const url = `${baseURL}${key}`
    console.log('key', url)
    try {
      await download(url, tsDir, {
        headers: task.headers,
        // agent: url.startsWith('https') ? proxy.https : proxy.http,
        // filename: 'key',
      })
    } catch (err) {
      console.error(err)
      log.error('[download] error key', url, err);
    }
  }
  // check if segments existed
  const existedSegments = fs.readdirSync(tsDir)
  console.log('existedSegments', existedSegments.length)
  let count = 0
  for (const segment of segments) {
    const segmentFile = new URL(`${baseURL}${segment.uri}`).pathname.split('/').pop()
    if (existedSegments.includes(segmentFile)) {
      downloadedCount++
      count++
      // console.log('existed', segmentFile)
    } else {
      console.log('not existed', segmentFile)
    }
  }
  await jsondb.update({
    ...task,
    segmentCount: segmentCount,
    downloadedCount: downloadedCount,
    progress: downloadedCount + '/' + segmentCount,
  })
  updateProgress()
  console.log('count', count)

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
    // console.log('segment', segment)
    try {
      const url = `${baseURL}${segment.uri}`
      const segmentFile = new URL(url).pathname.split('/').pop()
      // const name = segment.uri
      if (fs.existsSync(join(tsDir, segmentFile))) {
        // log.info('[download] already existed, skip segment', segment)
        // downloadedCount++
        return 'existed'
      } else {
        let a = await download(url, tsDir, {
          headers: task.headers,
          // agent: url.startsWith('https') ? proxy.https : proxy.http,
          // filename: name,
        })
        downloadedCount++
        await jsondb.update({
          ...task,
          segmentCount: segmentCount,
          downloadedCount: downloadedCount,
          progress: downloadedCount + '/' + segmentCount,
        })
        updateProgress()
        return 'ok'
      }

    } catch (error) {
      console.error(error);
      const url = `${baseURL}${segment.uri}`
      log.error('[download] error segment', url, segment, error);
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
