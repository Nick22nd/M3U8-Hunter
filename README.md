# README

## introduction

This is a m3u8 downloader based on electron and ffmpeg. It developed for personal use, and it is not guaranteed to be stable. If you have any questions, please submit an issue.

## requirements
need install the following software:
- ffmpeg: convert the m3u8 file to mp4 file
- serve(https://www.npmjs.com/package/serve) or other static server:  serve the directory that included the m3u8 file

## install

```shell
npm i
```
if you are in China or other countries need to use npm mirror, you can use the following command to install the dependencies(replace the `https://npmmirror.com` with your own mirror):

```shell
ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" npm i
```
## run
    
```shell
npm run dev
```

## build
    
```shell
npm run build
```


## project

This project is inspired by: [M3U8-Downloader](https://github.com/HeiSir2014/M3U8-Downloader)
