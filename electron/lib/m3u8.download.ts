import { join } from 'node:path'
import fs from 'node:fs'
import download from 'download'
import { Parser } from 'm3u8-parser'
import { getAppDataDir } from './utils'
import { TaskItem } from '../common.types'
import async from 'async'
import log from 'electron-log/main';
import { jsondb } from './jsondb'
import { serviceHub } from '../main'

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
        retry: {
          retries: 3
        }
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
  let needToDownloadCount = 0
  for (const segment of segments) {
    const segmentFile = new URL(`${baseURL}${segment.uri}`).pathname.split('/').pop()
    if (existedSegments.includes(segmentFile)) {
      downloadedCount++
      count++
      // console.log('existed', segmentFile)
    } else {
      needToDownloadCount++
      // console.log('not existed', segmentFile)
    }
  }
  console.log('needToDownloadCount', needToDownloadCount)
  await jsondb.update({
    ...task,
    segmentCount: segmentCount,
    downloadedCount: downloadedCount,
    progress: downloadedCount + '/' + segmentCount,
  })
  const newTaskArray = await jsondb.getDB()
  serviceHub.dialogService.updateProgress(newTaskArray)
  console.log('count', count)

  async.mapLimit(segments, 5, async function (segment) {
    // console.log('segment', segment)
    try {
      let url = ''
      if (segment.uri.startsWith('http') || segment.uri.startsWith('https')) {
        url = segment.uri
      } else {
        url = `${baseURL}${segment.uri}`
      }
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
          retry: {
            retries: 3
          }
        })
        downloadedCount++
        await jsondb.update({
          ...task,
          segmentCount: segmentCount,
          downloadedCount: downloadedCount,
          progress: downloadedCount + '/' + segmentCount,
        })
        const newTaskArray = await jsondb.getDB()
        serviceHub.dialogService.updateProgress(newTaskArray)
        return 'ok'
      }

    } catch (error) {
      console.error(error);
      const url = `${baseURL}${segment.uri}`
      log.error('[download] error segment', url, error);
      return 'error'
    }
  }, (err, results) => {
    if (err) {
      console.error(err)
      log.error('[download] error', err);
      return
    }
    // results is now an array of the response bodies
    let errorCount = results.map((item, index) => item === 'error' ? index : null).filter(item => item !== null)
    const okCount = results.map((item, index) => item === 'ok' ? index : null).filter(item => item !== null)
    console.log('task ok', okCount.length)
    console.log('task error', errorCount.length)
  })
}

