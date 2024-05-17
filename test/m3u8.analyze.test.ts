import path from 'node:path'
import { expect, it } from 'vitest'
import { M3u8Service } from '../electron/lib/m3u8.app'
import { DialogService } from '../electron/service/dialog.service'

let win: any
const dialogService = new DialogService(win)
const m3u8Service = new M3u8Service(dialogService)
const sampleM3u8File = 'first-take.m3u8'
const samplePath = '../tmp'
const sampleDuration = 243
it('m3u8 file type is segment and duration is right', () => {
  const absolutePath = path.join(__dirname, samplePath)
  console.log('absolutePath', absolutePath)
  const result = m3u8Service.analyzeM3u8File(absolutePath, sampleM3u8File)
  expect(result.type).toEqual('segments')
  expect(Math.floor(result.duration)).toEqual(sampleDuration)
})
