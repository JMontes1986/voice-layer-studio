import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { AudioTrack } from '../models/audio-track.model';

@Injectable({
  providedIn: 'root'
})
export class AudioMixerService {
  private audioContext: AudioContext | null = null;

  constructor(private storageService: StorageService) {}

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  async mixTracks(tracks: AudioTrack[]): Promise<Blob> {
    if (tracks.length === 0) {
      throw new Error('No hay tracks para mezclar');
    }

    try {
      const ctx = this.getAudioContext();

      // 1. Descargar y decodificar todos los audios
      const audioBuffers = await Promise.all(
        tracks.map(async (track) => {
          try {
            const blob = await this.storageService.downloadBlob(track.file_path);
            const arrayBuffer = await blob.arrayBuffer();
            return await ctx.decodeAudioData(arrayBuffer);
          } catch (error) {
            console.error(`Error decodificando track ${track.id}:`, error);
            return null;
          }
        })
      );

      // Filtrar buffers nulos
      const validBuffers = audioBuffers.filter(b => b !== null) as AudioBuffer[];

      if (validBuffers.length === 0) {
        throw new Error('No se pudo decodificar ningún track');
      }

      // 2. Calcular duración máxima
      const maxDuration = Math.max(...validBuffers.map(b => b.duration));
      const sampleRate = validBuffers[0].sampleRate;
      const numberOfChannels = 2; // Stereo

      // 3. Crear OfflineAudioContext para mezcla
      const offlineCtx = new OfflineAudioContext(
        numberOfChannels,
        Math.ceil(maxDuration * sampleRate),
        sampleRate
      );

      // 4. Crear nodos de source para cada buffer y conectarlos
      validBuffers.forEach((buffer) => {
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(offlineCtx.destination);
        source.start(0); // TODAS inician en t=0
      });

      // 5. Renderizar la mezcla
      const mixedBuffer = await offlineCtx.startRendering();

      // 6. Convertir AudioBuffer a WAV
      const wavBlob = this.audioBufferToWav(mixedBuffer);

      return wavBlob;
    } catch (error: any) {
      console.error('Error in mixTracks:', error);
      throw new Error(`Error mezclando tracks: ${error.message}`);
    }
  }

  async playMultipleTracks(tracks: AudioTrack[]): Promise<void> {
    if (tracks.length === 0) {
      throw new Error('No hay tracks para reproducir');
    }

    try {
      const ctx = this.getAudioContext();

      // Resume context si está suspendido
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Descargar y decodificar
      const audioBuffers = await Promise.all(
        tracks.map(async (track) => {
          try {
            const blob = await this.storageService.downloadBlob(track.file_path);
            const arrayBuffer = await blob.arrayBuffer();
            return await ctx.decodeAudioData(arrayBuffer);
          } catch (error) {
            console.error(`Error decodificando track ${track.id}:`, error);
            return null;
          }
        })
      );

      const validBuffers = audioBuffers.filter(b => b !== null) as AudioBuffer[];

      if (validBuffers.length === 0) {
        throw new Error('No se pudo reproducir ningún track');
      }

      // Reproducir todas desde t=0
      const startTime = ctx.currentTime + 0.1; // Pequeño delay para sincronización
      validBuffers.forEach((buffer) => {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(startTime);
      });
    } catch (error: any) {
      console.error('Error in playMultipleTracks:', error);
      throw new Error(`Error reproduciendo tracks: ${error.message}`);
    }
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = this.interleave(buffer);
    const dataLength = data.length * bytesPerSample;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // WAV Header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // PCM samples
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private interleave(buffer: AudioBuffer): Float32Array {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels;
    const result = new Float32Array(length);

    let offset = 0;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        result[offset++] = buffer.getChannelData(channel)[i];
      }
    }

    return result;
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // Método auxiliar para desbloquear AudioContext en iOS
  async unlockAudioContext(): Promise<void> {
    const context = this.getAudioContext();
    
    if (context.state === 'suspended') {
      await context.resume();
    }
  }
}
