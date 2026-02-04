import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { RecordingState } from '../models/audio-track.model';

@Injectable({
  providedIn: 'root'
})
export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private timerInterval: any;

  private recordingState$ = new BehaviorSubject<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    blob: null
  });

  getRecordingState(): Observable<RecordingState> {
    return this.recordingState$.asObservable();
  }

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });

      const mimeType = this.getSupportedMimeType();
      
      this.mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000 
      });

      this.audioChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: mimeType });
        this.recordingState$.next({
          ...this.recordingState$.value,
          isRecording: false,
          blob
        });
        stream.getTracks().forEach(track => track.stop());
        clearInterval(this.timerInterval);
      };

      this.mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        this.stopRecording();
        throw new Error('Error durante la grabación');
      };

      this.mediaRecorder.start(100);

      this.startTimer();

      this.recordingState$.next({
        ...this.recordingState$.value,
        isRecording: true,
        isPaused: false,
        duration: 0,
        blob: null
      });
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      
      let errorMessage = 'No se pudo acceder al micrófono.';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Permiso de micrófono denegado. Verifica la configuración de tu navegador.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No se encontró ningún micrófono. Conecta un micrófono e intenta de nuevo.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'El micrófono está siendo usado por otra aplicación.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Tu navegador no soporta grabación de audio.';
      }
      
      throw new Error(errorMessage);
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      clearInterval(this.timerInterval);
      this.recordingState$.next({
        ...this.recordingState$.value,
        isPaused: true
      });
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.startTimer();
      this.recordingState$.next({
        ...this.recordingState$.value,
        isPaused: false
      });
    }
  }

  private startTimer(): void {
    const pausedDuration = this.recordingState$.value.duration;
    this.startTime = Date.now() - pausedDuration;
    
    this.timerInterval = setInterval(() => {
      const duration = Date.now() - this.startTime;
      this.recordingState$.next({
        ...this.recordingState$.value,
        duration
      });
    }, 100);
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }

  reset(): void {
    this.recordingState$.next({
      isRecording: false,
      isPaused: false,
      duration: 0,
      blob: null
    });
    this.audioChunks = [];
    clearInterval(this.timerInterval);
  }
}
