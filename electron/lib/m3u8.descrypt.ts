import * as crypto from 'crypto';
import { join } from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
// const request = require('request');
import { Parser } from 'm3u8-parser';
import { TaskItem } from '../common.types';
function getAppDataDir() {
    const appDir = join(os.homedir(), 'M3U8Hunter');
    // fsExtra.ensureDirSync(appDir)
    return appDir;
}
// or use ffmpeg command: ffmpeg -allowed_extensions ALL -i 39715.m3u8 -c copy output.ts
function de(task: TaskItem) {
    const appDir = getAppDataDir();
    const parser = new Parser()
    const sampleFilename = new URL(task.url).pathname.split('/').pop()
    const targetPath = getAppDataDir()
    const m3u8File = fs.readFileSync(join(targetPath, sampleFilename), 'utf8')
    const tsDir = `${targetPath}/${sampleFilename.split('.')[0]}`

    parser.push(m3u8File)
    const { segments } = parser.manifest
    console.log('segments', segments)
    console.log(parser.manifest)
    let segment = segments[0]
    const keyfile = segment.key.uri
    /**
     * @type {Uint32Array}
     */
    const iv = segment.key.iv
    console.log(segment.uri, segment.key.iv, Buffer.from(iv.buffer).toString('hex'))
    let a = 'we'.toLowerCase()
    const key = Buffer.from(fs.readFileSync(join(tsDir, keyfile), {
        encoding: 'binary'
    }), 'binary');
    // 读取切片
    const encryptedContent = fs.readFileSync(join(tsDir, segment.uri));

    // 创建解密器
    const decipher = crypto.createDecipheriv(`${segment.key.method.toLowerCase()}-cbc`, key, Buffer.from(iv.buffer));

    // 解密切片
    let decryptedContent = decipher.update(encryptedContent);
    decryptedContent = Buffer.concat([decryptedContent, decipher.final()]);

    // 写入解密后的切片
    fs.writeFileSync(join(tsDir, 'de-' + segment.uri), decryptedContent);

}
