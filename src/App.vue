<template>
  <v-app>
    <v-content>
      <h1 class="main-header blue--text text--darken-2">Chord Detect</h1>
      <p class="subtitle">
        <strong>Use machine learning to detect musical chords played in a recording</strong>
      </p>

      <v-card :style="cardStyle">
        <div class="inner-app-container">
          <h3>Detect</h3>
          <div id="recording-playback">
            <audio controls :src="audioUrl"></audio>
          </div>
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-btn
                color="primary"
                @click="startRecording"
                :disabled="recordButtonDisabled"
                v-on="on"
              >
                <v-icon>mdi-record</v-icon>
              </v-btn>
            </template>
            <span>Record</span>
          </v-tooltip>

          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-btn
                color="primary"
                @click="stopRecording"
                :disabled="stopButtonDisabled"
                v-on="on"
              >
                <v-icon>mdi-stop</v-icon>
              </v-btn>
            </template>
            <span>Stop</span>
          </v-tooltip>

          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-btn
                color="primary"
                @click="analyseRecording"
                :disabled="analyseButtonDisabled"
                v-on="on"
              >
                <v-icon>mdi-chart-line</v-icon>
              </v-btn>
            </template>
            <span>Analyse Recording</span>
          </v-tooltip>

          <v-dialog v-model="settingsDialog">
            <template v-slot:activator="{ on }">
              <v-btn color="primary" v-on="on" text>
                <v-icon>mdi-settings</v-icon>
              </v-btn>
            </template>
            <v-card>
              <v-card-title class="headline grey lighten-2" primary-title>Settings</v-card-title>

              <v-card-text>
                <div class="center-align-flex-container">
                  <div style="width: 50px;">
                    <v-text-field
                      label="Delay"
                      v-model="recordDelay"
                      type="number"
                      max="10"
                      min="0"
                    />
                    <v-text-field
                      label="Length"
                      v-model="recordLength"
                      type="number"
                      max="5"
                      min="0"
                    />
                  </div>
                </div>
              </v-card-text>
              <v-divider></v-divider>

              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" @click="settingsDialog = false">Save</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <p>Prediction: {{ prediction }}</p>
        </div>
      </v-card>
    </v-content>
  </v-app>
</template>

<style scoped>
.main-header {
  text-align: center;
  font-size: 3.5em;
}

.subtitle {
  text-align: center;
  font-size: 1.3em;
}

.inner-app-container {
  padding: 10%;
}

.center-align-flex-container {
  display: flex;
  justify-content: center;
}

#recording-playback {
  page-break-after: always;
}
</style>

<script>
import Recorder from "recorderjs";
import axios from "axios";

export default {
  name: "App",
  data: () => ({
    recordButtonDisabled: false,
    stopButtonDisabled: true,
    gumStream: undefined, // stream from getUserMedia()
    rec: undefined, // Recorder.js object
    input: undefined, //MediaStreamAudioSourceNode we'll be recording
    audioContext: undefined,
    recordingBlob: undefined,
    settingsDialog: false,
    recordDelay: 0, // in seconds
    recordLength: 3, // in seconds
    prediction: ""
  }),
  computed: {
    audioUrl() {
      if (this.recordingBlob) {
        return URL.createObjectURL(this.recordingBlob);
      } else {
        return "";
      }
    },
    analyseButtonDisabled() {
      return !Boolean(this.recordingBlob);
    },
    cardStyle() {
      //padding-bottom: 0; padding-top: 0; display: flex; overflow: scroll;
      const {mdAndUp} = this.$vuetify.breakpoint;
      return {
        marginLeft: (mdAndUp) ? '25%' : '5%',
        width: (mdAndUp) ? '50%' : '90%',
        marginTop: '15%',
      }
    }
  },
  methods: {
    startRecording() {
      let _this = this;
      setTimeout(function() {

        let constraints = { audio: true, video: false };

        // disable the record button until we get a success or fail from getUserMedia()
        _this.recordButtonDisabled = true;
        _this.stopButtonDisabled = false;

        navigator.mediaDevices
          .getUserMedia(constraints)
          .then(function(stream) {
            console.log(
              "getUserMedia() success, stream created, initializing Recorder.js ..."
            );

            _this.audioContext = new AudioContext({
              sampleRate: 44100
            });

            //update the format
            console.log(
              "Format: 1 channel pcm @ " +
                _this.audioContext.sampleRate / 1000 +
                "kHz"
            );

            //assign to gumStream for later use
            _this.gumStream = stream;

            //use the stream
            _this.input = _this.audioContext.createMediaStreamSource(stream);

            _this.rec = new Recorder(_this.input, { numChannels: 1 });

            //start recording
            _this.rec.record();

            console.log("Recording started");
            setTimeout(_this.stopRecording, _this.recordLength * 1100);
          })
          .catch(function(err) {
            console.error(err);
            //enable the record button if getUserMedia() fails
            _this.recordButtonDisabled = false;
            _this.stopButtonDisabled = true;
          });
      }, this.recordDelay * 1000);
    },
    stopRecording() {

      //disable the stop button, enable the record too allow for new recordings
      this.stopButtonDisabled = true;
      this.recordButtonDisabled = false;

      this.rec.stop();

      //stop microphone access
      this.gumStream.getAudioTracks()[0].stop();

      //create the wav blob and pass it on to createDownloadLink
      let _this = this;
      this.rec.exportWAV(blob => {
        _this.recordingBlob = blob;
      });
    },
    analyseRecording() {
      let formData = new FormData();
      let filename = new Date().toISOString();
      formData.append("wav", this.recordingBlob, filename);
      let url = `https://${window.location.hostname}:5000/upload_wav`;
      let _this = this;
      return axios
        .post(url, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        })
        .then(response => {
          _this.prediction = response.data.chord;
          return response.data;
        })
        .catch(err => Promise.reject(err.message));
    }
  }
};
</script>
