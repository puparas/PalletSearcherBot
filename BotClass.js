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
        this.searchResult = []
        this.fileExist().then((bool)=>{
            if(bool)
                this.prepearFileData()
        })


    }

    setState(state){
        this.state = state
    }
    getState(){
        return this.state
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
                    let keysFirstObj = Object.keys(this.xlsxData[0])
                    this.menuArray = (keysFirstObj.length > 0) ? keysFirstObj : ['Возможно таблица пуста!']

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
        this.xlsxData = XLSX.utils.sheet_to_json(this.xlsxData, )
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

    search(text){
        if (this.state == 'Длинное наименование') {
            this.searchResult = this.regexpSearch(text)
        }else if(this.state == 'Товар' || this.state == 'Sup') {
            this.searchResult = this.supLastSixNumberSearch(text)
        }else{
            this.searchResult = this.directEqlSearch(text)
        }
    }
    regexpSearch(text){
        let strRegexp = text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        let pattern = new RegExp(strRegexp, 'i');
        let result = this.xlsxData.filter((val)=>{
            if (!val[this.state]){
                return false}
            if(pattern.test(val[this.state])){
                return val
            }
        })
        return result
    }
    directEqlSearch(number){
        let result = this.xlsxData.filter((val) => {
            if (!val[this.state]){
                return false}
            return val[this.state] == number
        })
        return result
    }
    supLastSixNumberSearch(number){
        let result = this.xlsxData.filter((val) => {
            if (!val[this.state]){
                return false}
            return (val[this.state].length > 6) ? val[this.state].slice(6,) == number : val[this.state] == number
        })
        return result
    }
    // function sleep(ms){
    //     return new Promise(resolve=>{
    //         setTimeout(resolve,ms)
    //     })
    // }
    getResultMessageWithDelay(){
        let nextIndex = 0;
        return {
            isDone: () => {
                return {done: nextIndex < this.searchResult.length}
            },
            next: () => {
                let string = ''
                if(nextIndex < this.searchResult.length){
                    let cell = this.searchResult[nextIndex]
                    for (let [name, value] of Object.entries(cell)) {
                        string += `${name}: *${value}* \n`
                    }
                    nextIndex++
                    return {value: string, done: false}
                }else{
                    return {done: true}
                }
            }
        }
    }

}
module.exports = Bot