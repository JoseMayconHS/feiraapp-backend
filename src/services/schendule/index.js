const schendule = require('node-schedule')
const dateFns = require('date-fns')
const { middlewareAsync } = require('../../functions')

exports.push_token = (db) => {
  // TODOS OS DIAS A MEIA NOITE
  const job = schendule.scheduleJob('0 0 0 * * *', async actualDate => {

    const push_tokens = await db.push_tokens.find({}, { projection: { data: 1, _id: 1 } }).toArray()

    const stack = push_tokens.map(({ data, _id }) => ({
      async fn() {
        try {
          const daysAgo = dateFns.differenceInCalendarDays(actualDate, new Date(data))

          if (daysAgo >= (process.env.DAYS_AGO_FOR_PUSH_TOKEN || 100)) {
            await db.push_tokens.deleteOne({ _id })
          }
        } catch(e) {
          console.error('schendule.push_token() Error ', e.message)
        }
      }
    }))

    await middlewareAsync(...stack)

  })
}
