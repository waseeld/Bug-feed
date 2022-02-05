const express = require('express');
const app = express.Router()
const hackerone = require('../feed/hackerone');

app.get('/', function(req, res){
    res.write("fdfdsf")
})

app.get("/reload/hackerone/", async(req, res) => {
    let data = await hackerone()
    res.json({
        status: 200,
        data: data
    })
})

module.exports = app