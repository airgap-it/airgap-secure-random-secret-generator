import sha3_256 from 'js-sha3'
import bip39 from 'bip39'

(function () {
  const ENTROPY_THRESHOLD = 10000
  const ENTROPY_SIZE = 4096
  const hash = sha3_256.sha3_256.create()
  const video = document.querySelector('video')

  // global variables
  let previousAudioArrayBuffer = null
  let previousVideoArrayBuffer = null
  let previousMouseArrayBuffer = null

  let audioEntropy = 0
  let videoEntropy = 0
  let mouseEntropy = 0

  function calculateEntropy (byteArrayA, byteArrayB) {
    let sum = 0
    for (let i = 0; i < byteArrayA.length; i++) {
      sum += Math.abs(byteArrayA[i] - byteArrayB[i])
    }
    return sum / byteArrayA.length
  }

  function processAudioStream (event) {
    if (previousAudioArrayBuffer) {
      audioEntropy += calculateEntropy(previousAudioArrayBuffer, event.inputBuffer.getChannelData(0))
    }
    previousAudioArrayBuffer = event.inputBuffer.getChannelData(0)
    seedEntropy(previousAudioArrayBuffer)
  }

  function handleStream (stream) {
    handleAudio(stream)
    handleVideo(stream)
  }

  function handleAudio (stream) {
    const audioContext = new AudioContext()
    const microphoneStreamSource = audioContext.createMediaStreamSource(stream)
    const scriptProcessor = audioContext.createScriptProcessor(ENTROPY_SIZE, 1, 1)
    scriptProcessor.onaudioprocess = processAudioStream
    microphoneStreamSource.connect(scriptProcessor)
    scriptProcessor.connect(audioContext.destination)
  }

  function handleVideo (stream) {
    video.src = window.URL.createObjectURL(stream)
    video.onloadedmetadata = function (e) {
      video.play()
      setTimeout(handleFrame, 100)
    }
    console.log('stream')
  }

  function handleMotion(event){
    if (previousMouseArrayBuffer) {
      mouseEntropy += calculateEntropy(previousMouseArrayBuffer,[event.pageX,event.pageY])
    }
    previousMouseArrayBuffer = [event.pageX,event.pageY]
    seedEntropy(previousMouseArrayBuffer)
  }

  function handleFrame () {
    const canvas = document.querySelector('canvas')
    const context = canvas.getContext('2d')
    context.drawImage(video, 0, 0)
    if (previousVideoArrayBuffer) {
      videoEntropy += calculateEntropy(previousVideoArrayBuffer, context.getImageData(0, 0, video.videoWidth, video.videoHeight).data)
    }
    previousVideoArrayBuffer = context.getImageData(0, 0, video.videoWidth, video.videoHeight).data
    seedEntropy(previousVideoArrayBuffer)
    setTimeout(handleFrame, 100)
  }

  function seedEntropy(array){
    hash.update(hash.array().concat(array))
    document.getElementById("video_entropy_span").innerHTML=videoEntropy.toFixed(2)
    document.getElementById("audio_entropy_span").innerHTML=audioEntropy.toFixed(2)
    document.getElementById("mouse_entropy_span").innerHTML=mouseEntropy.toFixed(2)
  }

  function videoError (e) {
    // do something
  }

  window.generateSecret = function() {
    const secureRandomArray = new Uint32Array(ENTROPY_SIZE)
    window.crypto.getRandomValues(secureRandomArray)
    seedEntropy(secureRandomArray)
    document.getElementById('mnemonic_code').value = bip39.entropyToMnemonic(hash.hex())
  }

  navigator.getUserMedia({video: true, audio: true}, handleStream, videoError)
  document.onmousemove = handleMotion
})()