'use strict'

const XLSX = require('xlsx')
const Axios = require('axios')
const fs = require('fs')
const fsPromises = fs.promises;

class Bot {
    constructor(filePath) {
        this.filePath = filePath
        this.state = ''
        this.fileLogPath = 'logFileChange.txt'
        this.fileExist().then((bool)=>{
            if(bool)
                this.prepearFileData()
        })


    }

    setState(state){
        this.state = state
    }
    getLogFilePath(){
        return this.fileLogPath
    }
    fileExist() {
        return fsPromises.access(this.filePath, fs.constants.F_OK | fs.constants.W_OK)
            .then(() => {
                return true
            })
            .catch(() => {
                return false
            })
    }

    fileGetCTDate() {
        return fsPromises.stat(this.filePath)
            .then(
                (stats) => {
                    return stats.ctime.toDateString()
                }
            )
            .catch(
                (e) => {
                    return e
                }
            )
    }

    makeMenu() {
        return new Promise((resolve, reject) => {
                if(this.xlsxData){
                    this.menuArray = []
                    for (const [key, value] of Object.entries(this.xlsxData)) {
                        if(key == 'A2'){
                            break
                        }
                        if(value.v)
                            this.menuArray.push(value.v)
                    }
                    resolve(this.menuArray)
                }else{
                    this.prepearFileData(this)
                }

            }
        )
    }

    prepearFileData(callback) {
        let xlsxSource = XLSX.readFile(this.filePath)
        let first_sheet_name = xlsxSource.SheetNames[0];
        this.xlsxData = xlsxSource.Sheets[first_sheet_name];
        if(callback)
            callback()
    }
    saveFile(ctx){
        return ctx.telegram.getFileLink(ctx.update.message.document.file_id).then(url => {
            return Axios({url, responseType: 'stream'}).then(response => {
                return response.data.pipe(fs.createWriteStream(this.filePath))
            }).then(()=>{
                this.logFileChange(ctx)
            })
        })
    }
    logFileChange(ctx){
        return new Promise((resolve, reject)=>{
            let fName = ctx.update.message.from.first_name
            let lName = ctx.update.message.from.last_name
            let date = new Date()
            let str = `Файл был изменён ${date} пользователем ${fName} ${lName} n ******************************************** \n`
            fs.appendFile(this.fileLogPath, str, (err)=>{
                if (err) throw err
            })
        })
    }
}

module.exports = Bot