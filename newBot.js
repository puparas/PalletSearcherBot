'use strict'
const BotClass = require('./BotClass')
const Telegraf = require('telegraf')
const Markup = require('telegraf/markup')
const Extra = require('telegraf/extra')

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
        ctx.reply('Выберете поле для поиска в меню', Markup
            .keyboard(menu)
            .oneTime()
            .resize()
            .extra())


        bot.hears(menu, (ctx) =>{
            let text = ctx.update.message.text
            SearchC.setState(text)
            ctx.replyWithMarkdown(`Понял! Отправьте текст для поиска по полю *${text}*`)
        })


        bot.on('message',   async (ctx) => {
            let text = ctx.update.message.text
            let state = SearchC.getState()
            let GlobalIdFotCommentState = SearchC.getGlobalIdForComment()
            if(GlobalIdFotCommentState){
                let commentAdded = await SearchC.addCommentToProductFromGlobalIndex(ctx)
                 if(commentAdded){
                     ctx.reply('Комментарий успешно добавлен', Markup
                         .keyboard(menu)
                         .oneTime()
                         .resize()
                         .extra())
                 }

            }else{
                if(!state)
                    await ctx.replyWithMarkdown('Не указанно поле для поиска')
                SearchC.search(text)
                let messageIterator = SearchC.getResultMessageWithDelay()
                while(messageIterator.isDone().done) {
                    let message = await messageIterator.next()
                    await ctx.replyWithMarkdown( message.value,
                        ((message.resultEmpty) ? Markup.inlineKeyboard([
                            Markup.callbackButton(`Добавить комментарий к товару`, message.globalElIngex),
                            Markup.callbackButton(message.curMessageNumber + 'й результат из ' + message.allMessageCount, 'test', ),
                        ], ).resize().extra(): ''))
                }
            }



        })
        bot.on('callback_query', (ctx) => {
            let globalIndexElementOnTable = ctx.update.callback_query.data
            let messageId = ctx.update.callback_query.message.message_id
            SearchC.setGlobalIdForComment(globalIndexElementOnTable)
            return ctx.replyWithMarkdown("*!!!ВНИМАНИЕ!!! следующее сообщение будет записано как комментарий к данному товару *", Extra.inReplyTo(messageId))
        })

    } catch (e) {
        ctx.reply(`Err: ${e}`)
    }


}




bot.help((ctx)=>{
    ctx.replyWithMarkdown(`Бот ищет по таблицке товаров по выбранному полю.\n
Что бы обновить табличку для поиска скиньте файл в фотмате *LSX* в чат и дождитесь сообщения об успешном обновлении файла. \n 
Что бы начать поиск выберите поле для поиска в меню и введите текст для поиска. \n 
Для вывода истории обновления файла отправьте команду */info* \n
Что бы оставить комментарий к товару нажмите на кнопку под сообщением с результатом`)
})

bot.command('info',(ctx)=>{
    ctx.replyWithMarkdown('Файл содержит лог обновления файла таблицы. *Когда* и *кем* был изменен')
    ctx.replyWithDocument({
        source: SearchC.getLogFilePath(),
        filename: 'Лог изменений файла таблицы.txt'
    })
})

bot.on('document',  async (ctx) => {
    let response = await SearchC.saveFile(ctx)
    let date = new Date()
    ctx.reply(`Файл успешно заменен / добавлен! дата замены / добавления *${date.toLocaleString()}*`)
})



bot.start((ctx) => {
    botInit(ctx)
})

bot.launch()

