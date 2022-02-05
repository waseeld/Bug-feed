var cron = require('node-cron');
const config = require('./config');
// cron.schedule(`* ${config.getFeedsEvrey} * * *`, () => {
//     console.log('running a tasks');
// });

var compression = require('compression')
const express = require('express');
const app = express()
const routes = require('./routes/index');
app.use(compression())
app.use("/api/", routes)
app.get("/", async(req, res) => {
    res.json({
        status: 200,
        data: "Hello"
    })
})

app.listen(9600)