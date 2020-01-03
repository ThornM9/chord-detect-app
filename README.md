# ChordDetect App

This is the source code for the web application served at chorddetect.com, where you can record a musical chord and predict it's name with machine learning.

The main process for this app is as follows:
1. User records short audio clip of a chord being played
2. Client sends this audio clip to the server
3. Server saves the file and performs audio analysis to extract the Pitch Class Profile (PCP), which is an array of 12 numbers representing the energy of each of the 12 semitones in an octave
4. The PCP is used with a pretrained neural network (see https://github.com/ThornM9/chord-detect-model-processing for training the model used here) to output a prediction of the chord in the recording
5. The predicted chord is returned to the client

Credit goes to a research paper written here: https://www.researchgate.net/publication/252067543_Neural_networks_for_musical_chords_recognition
This paper provided the general process of the audio analysis, which I implemented and added to a web application.
