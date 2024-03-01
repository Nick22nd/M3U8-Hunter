import crypto from 'crypto';
import { join } from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
// const request = require('request');
import { Parser } from 'm3u8-parser';
function getAppDataDir() {
    const appDir = join(os.homedir(), 'M3U8Hunter');
    // fsExtra.ensureDirSync(appDir)
    return appDir;
}
function de(task) {
    const appDir = getAppDataDir();
    const parser = new Parser()
    const str = fs.readFileSync(join(appDir, '39507.m3u8'), 'utf8')
    parser.push(str)
    const { segments } = parser.manifest
    console.log('segments', segments)
    console.log(parser.manifest)
    /**
     * @type {Uint32Array}
     */
    const iv = segments[0].key.iv
    console.log(segments[0].uri, segments[0].key.iv, Buffer.from(iv.buffer).toString('hex'))

    const key = Buffer.from(fs.readFileSync(join(appDir, '39507', 'aes.key'), {
        encoding: 'binary'
    }), 'binary');
    // 读取切片
    const encryptedContent = fs.readFileSync(join(appDir, '39507', '395070.ts'));

    // 创建解密器
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, Buffer.from('2dee5526aef74b3fe6a68f0195cea95f', 'hex'));

    // 解密切片
    let decryptedContent = decipher.update(encryptedContent);
    decryptedContent = Buffer.concat([decryptedContent, decipher.final()]);

    // 写入解密后的切片
    fs.writeFileSync(join(appDir, 'target.ts'), decryptedContent);

}
de()
// 获取密钥
// request.get('http://example.com/28bef2e83abc8d5d.ts', (error, response, body) => {
//   if (!error && response.statusCode == 200) {
//     const key = new Buffer(body, 'binary');

//     // 读取切片
//     const encryptedContent = fs.readFileSync('path/to/encrypted/segment.ts');

//     // 创建解密器
//     const decipher = crypto.createDecipheriv('aes-128-cbc', key, Buffer.from('f864a2ceadc206818d0782bcf9270ddd', 'hex'));

//     // 解密切片
//     let decryptedContent = decipher.update(encryptedContent);
//     decryptedContent = Buffer.concat([decryptedContent, decipher.final()]);

//     // 写入解密后的切片
//     fs.writeFileSync('path/to/decrypted/segment.ts', decryptedContent);
//   }
// });