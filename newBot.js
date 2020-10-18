'use strict'
const BotClass = require('./BotClass')
const Telegraf = require('telegraf')
const Markup = require('telegraf/markup')

const tgAPIkey = '1320517242:AAG_Q6RO0zOcPPpMORtGqYdjBKThDQjP_yY'
const bot = new Telegraf(tgAPIkey)
const SearchC = new BotClass(`pallet_table.xlsx`)

// const ctx = {
//     reply: (text) => {
//         console.log(text)
//     }
// }

async function botInit(ctx) {
    try {
        let fileCheck = await SearchC.fileExist()
        if (!fileCheck) {
            return ctx.replyWithMarkdown('Нет таблицы для работы. Скиньте файл в формате *xlsx* в чат и повторите команду */start*')
        }
        let fileCTdate = await SearchC.fileGetCTDate()
        ctx.replyWithMarkdown(`Файл был залит: *${fileCTdate}*`)

        let menu = await SearchC.makeMenu()
        ctx.reply('Выберите поле в котором будет происходить поиск', Markup
            .keyboard(menu)
            .oneTime()
            .resize()
            .extra())


        bot.hears(menu, (ctx) =>{
            let text = ctx.update.message.text
            SearchC.setState(text)
            ctx.replyWithMarkdown(`Понял! Отправьте текст для поиска по полю *${text}*`)
        })




    } catch (e) {
        ctx.reply(`Err: ${e}`)
    }


}




bot.help((ctx)=>{
    ctx.replyWithMarkdown(`Бот ищет по таблицке товаров по выбранному полю.\n
    Что бы обновить табличку для поиска скиньте файл в фотмате *XLSX* в чат и дождитесь сообщения об успешном обновлении файла. \n 
    Что бы начать поиск выберите поле для поиска в меню и введите текст для поиска. \n 
    Для вывода истории обновления файла отправьте команду */info* \n
    Для обновления кол-ва товара ответьте на сообщение с результатом поиска и напишите новое кол-во`)
})

bot.command('info',(ctx)=>{
    ctx.replyWithMarkdown('Файл содержит лог обновления файла таблицы. Когда и кем был изменен')
    ctx.replyWithDocument({
        source: SearchC.getLogFilePath(),
        filename: 'Лог изменений файла таблицы.txt'
    })
})

bot.on('document',  async (ctx) => {
    let response = await SearchC.saveFile(ctx)
    let date = new Date()
    ctx.reply(`Файл успешно заменен/добавлен! дата замены/добавления ${date.toLocaleString()}`)
})



bot.start((ctx) => {
    botInit(ctx)
})

bot.launch()

