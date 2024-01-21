import { Controller } from '@nestjs/common'
import { IpcHandle, Window } from '@doubleshot/nest-electron'
import { Payload } from '@nestjs/microservices'
import { type Observable, of } from 'rxjs'
import type { BrowserWindow } from 'electron'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Window() private readonly mainWin: BrowserWindow,
  ) { }

  @IpcHandle('msg')
  public handleSendMsg(@Payload() msg: string): Observable<string> {
    const { webContents } = this.mainWin
    webContents.send('reply-msg', 'this is msg from webContents.send')
    if (['m3u8', 'M3U8'].includes(JSON.parse(msg).type)) {
      const _item = JSON.parse(msg)
      this.appService.downloadM3u8(_item)
    }

    return of(`The main process received your message: ${msg} at time: ${this.appService.getTime()}`)
  }
}
