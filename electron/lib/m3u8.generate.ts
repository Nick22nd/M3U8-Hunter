// use ffmpeg to generate m3u8 file from mp4 file
import * as path from 'node:path'
import ffmpeg from 'fluent-ffmpeg'

const join = path.join
const basePath = join('..', '..', '..', '/tmp')
console.log('basePath', basePath)
const mp4Path = join(basePath, 'first-take.mp4')
async function mp4ToM3u8(mp4Path: string, m3u8Path: string) {
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
      .on('error', (err: any) => {
        console.log('err', err)
        reject(err)
      })
      .run()
  })
}
mp4ToM3u8(mp4Path, join(basePath, 'first-take.m3u8'))
