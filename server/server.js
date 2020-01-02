const express = require('express');
const app = express();
const path = require("path");
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' });
const processwav = require("./process_wav");
const dotenv = require('dotenv')
dotenv.config();
const PORT = process.env.PORT || 5000

const frontendDomain = (process.env.NODE_ENV === 'production')
    ? 'http://chorddetect.com'
    : 'http://127.0.0.1:8080'

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", frontendDomain); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.post("/upload_wav", upload.single("wav"), function(req, res) {
    console.log("received wav");
    let predictionPromise = processwav.process(req.file.path, frontendDomain);
    predictionPromise.then(function(result) {
        res.json({"chord": result});
    })
});

app.use("/public", express.static("./public"));

app.listen(PORT, () => console.log(`Listening on ${ PORT }`))