## some commands to convert video files

```js
await ffmpeg.writeFile('test.m3u8', await fetchFile(m3u8URL))
// ffmpeg -i "https://url.com/shi.m3u8" -vcodec copy -acodec copy -absf aac_adtstoasc test.mp4
// 保存到当前文件夹
await ffmpeg.exec(['-i', 'test.m3u8', '-vcodec copy -acodec copy -absf aac_adtstoasc', 'test.mp4'])
```
