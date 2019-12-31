const express = require('express');
const app = express();
const path = require("path");
const PORT = process.env.PORT || 5000

app.get("/hello", function(req, res) {
    res.send({"message": "hello"});
});

app.use("/public", express.static("./public"));

app.listen(PORT, () => console.log(`Listening on ${ PORT }`))