import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioRecorderService } from '../../core/services/audio-recorder.service';
import { StorageService } from '../../core/services/storage.service';
import { AudioMixerService } from '../../core/services/audio-mixer.service';
import { RecordingState } from '../../core/models/audio-track.model';
import { BlobPipe } from '../../shared/pipes/blob.pipe';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-recorder',
  standalone: true,
  imports: [CommonModule, BlobPipe],
  templateUrl: './recorder.component.html',
  styleUrls: ['./recorder.component.scss']
})
export class RecorderComponent implements OnInit, OnDestroy {
  recordingState: RecordingState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    blob: null
  };

  isUploading = false;
  uploadProgress = 0;
  errorMessage = '';
  sessionId = this.getOrCreateSessionId();
  
  private destroy$ = new Subject<void>();

  constructor(
    private recorder: AudioRecorderService,
    private storage: StorageService,
    private mixer: AudioMixerService
  ) {}

  ngOnInit(): void {
    this.recorder.getRecordingState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.recordingState = state;
      });

    // Desbloquear AudioContext en iOS al cargar
    this.mixer.unlockAudioContext().catch(err => {
      console.warn('No se pudo desbloquear AudioContext:', err);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async startRecording(): Promise<void> {
    this.errorMessage = '';
    try {
      await this.recorder.startRecording();
    } catch (error: any) {
      this.errorMessage = error.message;
      console.error('Error al iniciar grabación:', error);
    }
  }

  stopRecording(): void {
    this.recorder.stopRecording();
  }

  pauseRecording(): void {
    this.recorder.pauseRecording();
  }

  resumeRecording(): void {
    this.recorder.resumeRecording();
  }

  async uploadRecording(): Promise<void> {
    if (!this.recordingState.blob) return;

    this.isUploading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';

    try {
      // Simular progreso
      this.uploadProgress = 10;

      // 1. Subir el track individual
      await this.storage.uploadAudio(this.recordingState.blob, this.sessionId);
      this.uploadProgress = 40;

      // 2. Obtener todos los tracks de esta sesión
      const tracks = await this.storage.getTracks(this.sessionId, 0, 1000);
      this.uploadProgress = 60;

      // 3. Generar nuevo mixdown
      const mixdownBlob = await this.mixer.mixTracks(tracks);
      this.uploadProgress = 80;

      // 4. Subir mixdown (sobrescribe el anterior)
      await this.storage.uploadMixdown(mixdownBlob, this.sessionId);
      this.uploadProgress = 100;

      // 5. Reset recorder
      this.recorder.reset();

      // Emitir evento para que track-list se actualice
      window.dispatchEvent(new CustomEvent('track-uploaded'));

      // Pequeño delay para mostrar 100% antes de ocultar
      setTimeout(() => {
        this.isUploading = false;
        this.uploadProgress = 0;
      }, 500);
    } catch (error: any) {
      this.errorMessage = `Error: ${error.message}`;
      console.error('Error uploading:', error);
      this.isUploading = false;
      this.uploadProgress = 0;
    }
  }

  discardRecording(): void {
    if (confirm('¿Descartar esta grabación?')) {
      this.recorder.reset();
      this.errorMessage = '';
    }
  }

  formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  clearError(): void {
    this.errorMessage = '';
  }
}
