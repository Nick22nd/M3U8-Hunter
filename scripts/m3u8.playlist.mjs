import { join } from 'node:path'
import fs from 'node:fs'
import { Parser } from 'm3u8-parser'

export function analyseM3u8File(targetPath, sampleFilename) {
  const str = fs.readFileSync(join(targetPath, sampleFilename), 'utf8')
  const parser = new Parser()
  parser.push(str)
  console.log(JSON.stringify(parser.manifest, null, 2))
  const { segments } = parser.manifest
  let streamDuration = 0
  streamDuration = segments.reduce((acc, cur) => {
    return acc + cur.duration
  }, 0)
  console.log('streamDuration: ', streamDuration)
  console.log(parser)
  if (parser.manifest.playlists && parser.manifest.playlists.length !== 0)
    console.log(parser.manifest.playlists)
}
