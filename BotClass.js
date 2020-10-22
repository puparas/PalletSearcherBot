'use strict'

const XLSX = require('xlsx')
const Axios = require('axios')
const fs = require('fs')
const fsPromises = fs.promises;

class Bot {
    constructor(filePath) {
        this.filePath = filePath
        this.state = ''
        this.tmpGlobalIdFotComment = ''
        this.fileLogPath = 'logFileChange.txt'
        this.searchResult = []
        this.fileExist().then((bool)=>{
            if(bool)
                this.prepearFileData()
        })


    }

    setState(state){
        this.tmpGlobalIdFotComment = ''
        this.state = state
    }
    setGlobalIdForComment(index){
        this.tmpGlobalIdFotComment = index
    }
    getGlobalIdForComment(index){
        return this.tmpGlobalIdFotComment
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
                    let keysFirstObj = [... new Set(Object.keys(this.xlsxData).map((i)=>{return Object.keys(this.xlsxData[i])}).flat())]
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
        if(typeof callback == "function")
            callback()
    }
    async addCommentToProductFromGlobalIndex(ctx){
        let comment = ctx.update.message.text
        let autor = `${ctx.update.message.from.first_name} aka ${ctx.update.message.from.username}`
        let commentWithAutor = `\n${comment} ( ${autor} ) \n—————————————————— `
        let curComments = this.xlsxData[this.tmpGlobalIdFotComment]['Комментарии'] ? this.xlsxData[this.tmpGlobalIdFotComment]['Комментарии'] : ''
        this.xlsxData[this.tmpGlobalIdFotComment]['Комментарии'] = curComments + commentWithAutor
        let sheet = XLSX.utils.json_to_sheet(this.xlsxData)
        let newBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newBook, sheet, 'Лист 1')
        return new Promise((resolve) => {
            XLSX.writeFile(newBook, this.filePath)
            this.tmpGlobalIdFotComment = ''
            resolve(true)
        })
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
            let autor = `${ctx.update.message.from.first_name} aka ${ctx.update.message.from.username}`
            let date = new Date()
            let str = `Файл был изменён ${date} пользователем ${autor}  \n ******************************************** \n`
            fs.appendFile(this.fileLogPath, str, (err)=>{
                if (err) throw err
            })
        })
    }

    searchProductsWithComments() {
        this.state = 'Комментарии'
        return this.search('(.*)')
    }

    search(text){
        if (this.state == 'Длинное наименование' || this.state == 'Комментарии') {
            var result = this.regexpSearch(text)
        }else if(this.state == 'Товар' || this.state == 'Sup') {
            var result = this.supLastSixNumberSearch(text)
        }else{
            var result = this.directEqlSearch(text)
        }
        this.searchResult = (result.length) ? result : [{'Результат':'Ничего не найдено'}]
    }
    regexpSearch(text, skipReplace){
        if(this.state != 'Комментарии'){
            var strRegexp = text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        }
        let pattern = new RegExp(strRegexp, 'i');
        let result = this.xlsxData.filter((val, i)=>{
            if (!val[this.state]){
                return false}
            val = this.setInumValToIbj(val, i)
            if(pattern.test(val[this.state])){
                return val
            }
        })
        return result
    }
    directEqlSearch(number){
        let result = this.xlsxData.filter((val, i) => {
            if (!val[this.state]){
                return false}
            val = this.setInumValToIbj(val, i)
            // Object.defineProperty(val, 'globalIndex', {
            //     value: i,
            //     enumerable: false
            // })
            return val[this.state] == number
        })
        return result
    }
    supLastSixNumberSearch(number){
        let result = this.xlsxData.filter((val, i) => {
            if (!val[this.state]){
                return false}
            val = this.setInumValToIbj(val, i)
            // Object.defineProperty(val, 'globalIndex', {
            //     value: i,
            //     enumerable: false
            // })
            return (val[this.state].length > 6) ? val[this.state].slice(-6, ) == number : val[this.state] == number
        })
        return result
    }
    getResultMessageWithDelay(){
        let nextIndex = 0;
        let messageCoutn = this.searchResult.length
        return {
            isDone: () => {
                return {done: nextIndex < messageCoutn}
            },
            next: async () => {
                let string = ''
                await this.timeout(200)

                    let row = this.searchResult[nextIndex]
                    for (let [name, value] of Object.entries(row)) {
                        string += `${name}: *${value}* \n`
                    }
                    nextIndex++
                    return {value: string, allMessageCount: messageCoutn, curMessageNumber: nextIndex, globalElIngex: row.globalIndex,  resultEmpty: (row[this.state])}

            }
        }
    }
    timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    setInumValToIbj(obj, val) {
        return  Object.defineProperty(obj, 'globalIndex', {
            value: val,
            enumerable: false
        })

    }

}
module.exports = Bot