<template>
  <v-app>
    <v-content>
      <h1 text-align="center">Hi</h1>
      <v-btn @click="startRecording" :disabled="recordButtonDisabled">Start</v-btn>
      <v-btn @click="pauseRecording" :disabled="pauseButtonDisabled">{{ pauseButtonText }}</v-btn>
      <v-btn @click="stopRecording" :disabled="stopButtonDisabled">Stop</v-btn>
      <div id="recording-playback">
        <audio controls :src="audioUrl"></audio>
      </div>
      <v-btn @click="analyseRecording" v-show="showAnalyseButton">Analyse</v-btn>
    </v-content>
  </v-app>
</template>

<script>
import Recorder from "recorderjs";
import axios from "axios";

export default {
  name: "App",
  data: () => ({
    recordButtonDisabled: false,
    stopButtonDisabled: true,
    pauseButtonDisabled: true,
    showAnalyseButton: true,
    pauseButtonText: "Pause",
    gumStream: undefined, // stream from getUserMedia()
    rec: undefined, // Recorder.js object
    input: undefined, //MediaStreamAudioSourceNode we'll be recording
    audioContext: undefined,
    recordingBlob: undefined
  }),
  computed: {
    audioUrl() {
      if (this.recordingBlob) {
        return URL.createObjectURL(this.recordingBlob);
      } else {
        return "";
      }
    }
  },
  methods: {
    startRecording() {
      console.log("recordButton clicked");

      let constraints = { audio: true, video: false };

      // disable the record button until we get a success or fail from getUserMedia()
      this.recordButtonDisabled = true;
      this.stopButtonDisabled = false;
      this.pauseButtonDisabled = false;

      let _this = this;
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
        })
        .catch(function(err) {
          console.error(err);
          //enable the record button if getUserMedia() fails
          _this.recordButtonDisabled = false;
          _this.stopButtonDisabled = true;
          _this.pauseButtonDisabled = true;
        });
    },
    pauseRecording() {
      console.log("pauseButton clicked, rec.recording=", this.rec.recording);
      if (this.rec.recording) {
        //pause
        this.rec.stop();
        this.pauseButtonText = "Resume";
      } else {
        //resume
        this.rec.record();
        this.pauseButtonText = "Pause";
      }
    },
    stopRecording() {
      console.log("stopButton clicked");

      //disable the stop button, enable the record too allow for new recordings
      this.stopButtonDisabled = true;
      this.recordButtonDisabled = false;
      this.pauseButtonDisabled = true;

      //reset button just in case the recording is stopped while paused
      this.pauseButtonText = "Pause";

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
      let url = `http://${window.location.hostname}:5000/upload_wav`;
      return axios
        .post(url, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        })
        .then(response => {
          return response.data;
        })
        .catch(err => Promise.reject(err.message));
    }
  }
};
</script>

<style scoped>
h1 {
  text-align: center;
}
</style>
