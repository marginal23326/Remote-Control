class ClientAudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.buffer = [];
    this.bufferSize = options.processorOptions.bufferSize || 512;
    
    // For smoothing high frequencies
    this.lastSamples = new Float32Array(3).fill(0);
    
    // For dynamic range compression
    this.lastAmplitude = 0;
    this.smoothingFactor = 0.95;
    
    // Compression thresholds
    this.compressorThreshold = 0.3;  // Start compression earlier
    this.compressorRatio = 4;        // More aggressive compression
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input.length > 0) {
      const inputChannelData = input[0];

      for (let i = 0; i < inputChannelData.length; i+=2) {
        let sample = inputChannelData[i];
        
        // Moving average filter to suppress high frequencies
        sample = (sample + this.lastSamples[0] + this.lastSamples[1] + this.lastSamples[2]) / 4;
        
        // Update sample history
        this.lastSamples[2] = this.lastSamples[1];
        this.lastSamples[1] = this.lastSamples[0];
        this.lastSamples[0] = sample;
        
        // Track amplitude with smoothing
        const currentAmplitude = Math.abs(sample);
        this.lastAmplitude = (this.smoothingFactor * this.lastAmplitude) + 
                            ((1 - this.smoothingFactor) * currentAmplitude);
        
        // Dynamic range compression
        if (this.lastAmplitude > this.compressorThreshold) {
          const compressionFactor = this.compressorThreshold + 
            (this.lastAmplitude - this.compressorThreshold) / this.compressorRatio;
          sample *= (compressionFactor / this.lastAmplitude);
        }

        // Additional high-frequency attenuation for very loud signals
        if (Math.abs(sample) > 0.6) {
          sample = sample * 0.6;
        }

        this.buffer.push(sample);
      }
      
      while (this.buffer.length >= this.bufferSize) {
        const chunk = this.buffer.splice(0, this.bufferSize);
        
        const int16Chunk = new Int16Array(chunk.length);
        for (let i = 0; i < chunk.length; i++) {
          const sample = Math.max(-1, Math.min(1, chunk[i]));
          int16Chunk[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        this.port.postMessage({
          type: 'pcmData',
          pcmData: int16Chunk.buffer
        }, [int16Chunk.buffer]);
      }
    }

    return true;
  }
}

registerProcessor('client-audio-processor', ClientAudioProcessor);