import { join } from 'node:path'
import fs from 'node:fs'
import download from 'download'
import { Parser } from 'm3u8-parser'
import { jsondb } from './jsondb.mjs'

async function downloadTS(task) {
  console.log('task', task)
  const sampleFilename = new URL(task.url).pathname.split('/').pop()
  const baseURL = task.url.replace(sampleFilename, '')
  console.log('baseURL', baseURL)
  const tsDir = `${task.targetPath}/${sampleFilename.split('.')[0]}`
  console.log('tsDir', tsDir)

  const str = fs.readFileSync(join(task.targetPath, sampleFilename), 'utf8')
  const parser = new Parser()
  parser.push(str)
  console.log(parser.manifest)
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
  // download key file
  if (parser.manifest.key) {
    const url = `${baseURL}${parser.manifest.key.uri}`
    await download(url, tsDir, {
      headers: task.headers,
    })
  }
  for (const segment of segments) {
    const url = `${baseURL}${segment.uri}`
    // const name = segment.uri
    await download(url, tsDir, {
      headers: task.headers,
      // filename: name,
    })
  }
}

async function mainModule() {
  await jsondb.init()
  const data = await jsondb.get()
  console.log('data', data.tasks.at(0))
  downloadTS(data.tasks.at(0))
}
mainModule()
