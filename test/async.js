(async () => {
  const data = await requireAsync('./data.json')
  module.exports = exports = data.message
})()