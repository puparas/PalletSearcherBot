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
    if(ctx.updateSubTypes == 'document' && ctx.update.message.document.mime_type == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'){
        saveNewSheet(ctx)
    }else if(ctx.updateType == 'message'){
        if(ctx.update.message.text){
            let text = ctx.update.message.text
            let resObj = searchOnSheet(text)
            // console.log(resObj)
            let msg = `По полю "${(state) ? state : 'ВЫБЕРИ ПОЛЕ ДЛЯ ПОИСКА, МУДЕНЬ'}" найдено: ${(resObj === {}) ? 'НИХУЯ' : resObj}`
            ctx.reply(msg)
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
    let strRegexp = text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    let pattern = new RegExp(strRegexp, 'ig');
    jsonWorksheet.forEach((val, index)=>{
        if(pattern.test(val[state])){
            console.log(val);
            result.push(val)
        }

    })
    // console.log(result);
    return result


}

bot.launch() // запуск бота