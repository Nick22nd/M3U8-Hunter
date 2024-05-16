// use ffmpeg to generate m3u8 file from mp4 file
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import http from 'node:http'
import got from 'got'
import ffmpeg from 'fluent-ffmpeg'
import { Parser } from 'm3u8-parser'
import { jsondb } from './jsondb.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// const basePath = join('..', '..', '..', '/tmp')
const basePath = join(__dirname, '../tmp')
console.log('basePath', basePath)
const sampleFilename = 'first-take.m3u8'
const mp4Path = join(basePath, 'first-take.mp4')
console.log(mp4Path)
export async function mp4ToM3u8(mp4Path, m3u8Path) {
  return new Promise((resolve, reject) => {
    ffmpeg(mp4Path)
      .addOptions([
        '-profile:v baseline',
        '-level 3.0',
        '-start_number 0',
        '-hls_time 10',
        '-hls_list_size 0',
        '-f hls',
      ])
      .output(m3u8Path)
      .on('end', () => {
        console.log('end')
        resolve('end')
      })
      .on('error', (err) => {
        console.log('err', err)
        reject(err)
      })
      .run()
  })
}

export function downloadFileMine(url, targetPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(targetPath)
    http.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close(resolve(true))
      })
      file.on('error', (err) => {
        fs.unlink(targetPath)
        reject(err.message)
      })
    })
  })
}
async function downloadFile(url, targetPath, name = '') {
  jsondb.update({
    url,
    headers: {},
    targetPath,
    status: 'downloading',
  })
  const stream = got.stream(url)
  name = name || new URL(url).pathname.split('/').pop()
  console.log('name', name)
  console.log(targetPath, name)
  const writer = fs.createWriteStream(join(targetPath, name))

  stream.pipe(writer)
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}
function timeFormat(streamDuration) {
  const hours = Math.floor(streamDuration / 3600).toString().padStart(2, '0')
  const minutes = Math.floor((streamDuration - hours * 3600) / 60).toString().padStart(2, '0')
  const seconds = Math.floor(streamDuration - hours * 3600 - minutes * 60).toString().padStart(2, '0')
  const str = [hours, minutes, seconds].map((item) => {
    return item.toString().padStart(2, '0')
  }).join(':')
  return str
}
function analyseM3u8File(targetPath, sampleFilename) {
  const str = fs.readFileSync(join(targetPath, sampleFilename), 'utf8')
  const parser = new Parser()
  parser.push(str)
  console.log(JSON.stringify(parser.manifest, null, 2))
  const { segments } = parser.manifest
  let streamDuration = 0
  streamDuration = segments.reduce((acc, cur) => {
    return acc + cur.duration
  }, 0)
  console.log('streamDuration: ', streamDuration, timeFormat(streamDuration))
  console.log(parser)
}

async function main() {
  const m3u8Url = `http://localhost:3000/${sampleFilename}`
  const targetPath = join(basePath, 'download')
  console.log('targetPath', targetPath)
  if (!fs.existsSync(targetPath)) {
    console.log('targetPath', targetPath)
    fs.mkdirSync(targetPath, { recursive: true })
  }

  try {
    await jsondb.init()

    if (fs.existsSync(join(targetPath, sampleFilename))) {
      console.log('file exists')
      analyseM3u8File(targetPath, sampleFilename)
    }
    else {
      await downloadFile(m3u8Url, targetPath)
    }
  }
  catch (err) {
    console.log('err', err)
  }
}
main()
