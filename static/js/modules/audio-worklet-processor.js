class ClientAudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.buffer = [];
    this.bufferSize = options.processorOptions.bufferSize || 512; // Get buffer size from options
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input.length > 0) {
      const inputChannelData = input[0]; // Assuming mono audio

      // Downsample and buffer
      for (let i = 0; i < inputChannelData.length; i+=2) {
        // Take every other sample for simple downsampling (you can improve this)
        this.buffer.push(inputChannelData[i]);
      }
      
      // Send when buffer is full
      while (this.buffer.length >= this.bufferSize) {
        const chunk = this.buffer.splice(0, this.bufferSize);
        
        // Convert to Int16
        const int16Chunk = new Int16Array(chunk.length);
        for (let i = 0; i < chunk.length; i++) {
          const sample = Math.max(-1, Math.min(1, chunk[i]));
          int16Chunk[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        // Post the PCM data to the main thread
        this.port.postMessage({
          type: 'pcmData',
          pcmData: int16Chunk.buffer
        }, [int16Chunk.buffer]); // Transfer the buffer
      }
    }

    return true;
  }
}

registerProcessor('client-audio-processor', ClientAudioProcessor);