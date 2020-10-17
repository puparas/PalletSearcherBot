const Telegraf = require('telegraf')
const Markup = require('telegraf/markup')
XLSX = require('xlsx')
const Axios = require('axios')
const fs = require('fs')

const tgAPIkey = '1320517242:AAG_Q6RO0zOcPPpMORtGqYdjBKThDQjP_yY'
const bot = new Telegraf(tgAPIkey)
const filePath = `pallet_table.xlsx`
let state = ''
//ответ бота на команду /start
bot.start((ctx) => {
    return ctx.reply('Выберите поле в котором будет происходить поиск', Markup
        .keyboard([
            ['Товар', 'Номер паллета'], // Row1 with 2 buttons
            ['Длинное наименование'], // Row2 with 1 buttons
        ])
        .oneTime()
        .resize()
        .extra()
    )
})

//ответ бота на команду /help
bot.help((ctx) => ctx.reply('Выбираем поле для поиска в меню и отправляем текст для поиска в таблице данного текста по выбранному полю.'))

// Слушаем команды по кнопкам
bot.hears(['Товар', 'Номер паллета', 'Длинное наименование'], (ctx) =>{
    let cellNameForSearch = ctx.update.message.text
    state = cellNameForSearch;

    ctx.reply(`Понял! Отправьте текст для поиска по полю "${cellNameForSearch}"`)
})

// Обрабатываем отправленные боту сообщению. Если файл и это табличка, то отправляем ее на сохранение. Если текст, то идем искать по табличке.
bot.on('message', (ctx) => {
    if(ctx.updateSubTypes == 'document'){
        if(ctx.update.message.document.mime_type == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'){
            saveNewSheet(ctx)
        }else{
            ctx.reply('Не тот формат файла!')
        }

    }else if(ctx.updateType == 'message' && state){
        if(ctx.update.message.text){
            let text = ctx.update.message.text
            let resObj = searchOnSheet(text)
            // console.log(resObj)

            if(!resObj){
                ctx.reply(`Либо ничего не найдено, либо ты забыл выбрать поле для поиска!!`)
            }else{
                let messageIterator = printfIterator(resObj)
                while(messageIterator.isDone().done) {
                    ctx.reply(messageIterator.next().value)
                }
            }


            // let msg = '```' + resObj + '``` ты найдешь в паллете номер ' + palletNumber
        }
    }
})



// Функция для обработки новой таблички скинутой в чат. Берем ссылку у ТГ и с скачиваем рядом
function saveNewSheet(ctx){
    ctx.telegram.getFileLink(ctx.update.message.document.file_id).then(url => {
        Axios({url, responseType: 'stream'}).then(response => {
            response.data.pipe(fs.createWriteStream(filePath))
                .on('finish', () => {
                    let date = new Date()
                    ctx.reply(`Файл успешно заменен! дата замены ${date.toLocaleString()}`)

                })
                .on('error', e => ctx.reply(`Ошибка при обновлении файла. Отправить это сообщение @PUPARAS ${e}`))
        })
    })
}
// Функция поиска по табличке если в есть поле по которому искать и текст который искать.
function searchOnSheet(text){
    if(!state || !text){
        return ''
    }

    let workbook = XLSX.readFile(filePath)
    let firstSheetName = workbook.SheetNames[0]
    let worksheet = workbook.Sheets[firstSheetName]
    let jsonWorksheet = XLSX.utils.sheet_to_json(worksheet)
    let result = []
    if(state == 'Длинное наименование'){
        let strRegexp = text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        let pattern = new RegExp(strRegexp, 'i');
        jsonWorksheet.forEach((val, index)=>{
            if(pattern.test(val[state])){
                result = [...result, val]
            }

        })
    }else{
        jsonWorksheet.forEach((val, index)=>{
            if(val[state] == text){
                result = [...result, val]
            }

        })
    }

    // console.log(result);
    return (Object.entries(result).length === 0) ? false : result


}

function printfIterator(objToString){
    let nextIndex = 0;
    if(!objToString){
        return ''
    }
    return {
        isDone: function() {
            return {done: nextIndex < objToString.length}
        },
        next: function() {
            let string = ''
            if(nextIndex < objToString.length){
                let cell = objToString[nextIndex]
                for (let [name, value] of Object.entries(cell)) {
                    string += `${name}: ${value} \n`
                }
                nextIndex++
                return {value: string, done: false}
            }else{
                return {done: true}
            }
        }
    }

}

bot.launch() // запуск бота