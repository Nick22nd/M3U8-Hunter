# README

## introduction

This is a m3u8 downloader based on electron and ffmpeg. It developed for personal use, and it is not guaranteed to be stable. If you have any questions, please submit an issue.

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

## note
 if app can't generate task, you can check the log file,
- Mac: view log from ~/Library/Logs/M3U8-Hunter

if it show error like this:
```shell
init jsondb error Error: EPERM: operation not permitted,
```

you can try to give the app permission to write the file.

Privacy and Security -> Full Disk Access -> select the folder where the app is located -> give the app permission to write the file.

## TODO

- [ ] support m3u8 file that included play list
- [ ] improve ui
- [ ] add tutorial

## project

This project is inspired by: [M3U8-Downloader](https://github.com/HeiSir2014/M3U8-Downloader)
