const fs = require("fs");
const WavDecoder = require("wav-decoder");
const Meyda = require('meyda');
const tf = require('@tensorflow/tfjs');

const BUFFER_SIZE = 16384;
const chord_names = ['a', 'am', 'bm', 'c', 'd', 'dm', 'e', 'em', 'f', 'g'];

// function to read a wav file and return the signal
const readFile = (filepath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filepath, (err, buffer) => {
        if (err) {
            return reject(err);
        }
        return resolve(buffer);
        });
    });
};

function calculateAverageChroma(chromas) {
    let avgChroma = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < chromas.length; i++) {
        for (let j = 0; j < chromas[i].length; j++) {
            avgChroma[j] += chromas[i][j];
        }
    }

    for (let i = 0; i < avgChroma.length; i++) {
        avgChroma[i] = avgChroma[i] / chromas.length;
    }
    return avgChroma;
}

function getChromaFromAudioData(audioData) {
    let samplesRemaining = audioData.channelData[0].length;
    let i = 0;
    let chromas = []
    while (samplesRemaining > BUFFER_SIZE) {
        // extract buffer from signal
        let signal = audioData.channelData[0].slice(i * BUFFER_SIZE, i * BUFFER_SIZE + BUFFER_SIZE);

        // analyse signal with meyda
        let chroma = Meyda.extract("chroma", signal);
        chromas.push(chroma);
        i += 1;
        samplesRemaining -= BUFFER_SIZE;
    }
    // TODO maybe normalise the chroma too
    let avgChroma = calculateAverageChroma(chromas);
    return avgChroma;
}

module.exports = {
    process: async function(filepath) {
        const model = await tf.loadLayersModel('http://127.0.0.1:8080/model/model.json');
        await readFile(filepath).then((buffer) => {
            return WavDecoder.decode(buffer);
        }).then(function(audioData) {
            Meyda.sampleRate = audioData.sampleRate;
            let fileChroma = getChromaFromAudioData(audioData);
            console.log(fileChroma);
            tf.tidy(() => {
                const tensor = tf.tensor2d([fileChroma]);
                const prediction = model.predict(tensor);
                const logits = Array.from(prediction.dataSync());
                
                let idx = prediction.argMax(-1).dataSync()[0]
                let predictedChord = chord_names[idx];
                console.log(predictedChord);
            })
        });
    }
}