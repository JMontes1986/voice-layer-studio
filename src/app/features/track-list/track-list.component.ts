import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService } from '../../core/services/storage.service';
import { AudioMixerService } from '../../core/services/audio-mixer.service';
import { AudioTrack } from '../../core/models/audio-track.model';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-track-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './track-list.component.html',
  styleUrls: ['./track-list.component.scss']
})
export class TrackListComponent implements OnInit, OnDestroy {
  tracks: AudioTrack[] = [];
  mixdown: AudioTrack | null = null;
  
  isLoading = false;
  isDeleting = false;
  isPlayingMix = false;
  isLoadingMixdown = false;
  
  sessionId = localStorage.getItem('sessionId') || '';
  page = 0;
  pageSize = 20;
  hasMore = true;

  // Cache de URLs públicas
  private urlCache = new Map<string, string>();
  
  private destroy$ = new Subject<void>();

  constructor(
    private storage: StorageService,
    private mixer: AudioMixerService
  ) {}

  ngOnInit(): void {
    if (this.sessionId) {
      this.loadTracks();
      this.loadMixdown();
    }

    // Escuchar evento de nueva grabación
    window.addEventListener('track-uploaded', this.handleTrackUploaded.bind(this));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('track-uploaded', this.handleTrackUploaded.bind(this));
    
    // Limpiar URLs creadas
    this.urlCache.clear();
  }

  async loadTracks(): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    try {
      const newTracks = await this.storage.getTracks(this.sessionId, this.page, this.pageSize);
      
      if (newTracks.length < this.pageSize) {
        this.hasMore = false;
      }

      this.tracks = [...this.tracks, ...newTracks];

      // Pre-cargar URLs
      newTracks.forEach(async track => {
        if (!this.urlCache.has(track.id)) {
          const url = await this.storage.getPublicUrl(track.file_path);
          this.urlCache.set(track.id, url);
        }
      });
    } catch (error: any) {
      console.error('Error cargando tracks:', error);
      alert(`Error cargando tracks: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }

  async loadMixdown(): Promise<void> {
    this.isLoadingMixdown = true;
    try {
      this.mixdown = await this.storage.getMixdown(this.sessionId);
      
      if (this.mixdown && !this.urlCache.has(this.mixdown.id)) {
        const url = await this.storage.getPublicUrl(this.mixdown.file_path);
        this.urlCache.set(this.mixdown.id, url);
      }
    } catch (error: any) {
      console.error('Error cargando mixdown:', error);
    } finally {
      this.isLoadingMixdown = false;
    }
  }

  async deleteTrack(track: AudioTrack): Promise<void> {
    if (!confirm(`¿Eliminar "${track.file_path}"?\n\nSe recalculará el mixdown automáticamente.`)) {
      return;
    }

    this.isDeleting = true;
    try {
      // 1. Eliminar track
      await this.storage.deleteTrack(track);

      // 2. Actualizar lista local
      this.tracks = this.tracks.filter(t => t.id !== track.id);
      this.urlCache.delete(track.id);

      // 3. Recalcular mixdown
      if (this.tracks.length > 0) {
        const mixdownBlob = await this.mixer.mixTracks(this.tracks);
        await this.storage.uploadMixdown(mixdownBlob, this.sessionId);
        await this.loadMixdown();
      } else {
        // Si no quedan tracks, eliminar mixdown
        await this.storage.deleteMixdown(this.sessionId);
        this.mixdown = null;
      }

      alert('✅ Track eliminado y mixdown actualizado');
    } catch (error: any) {
      console.error('Error eliminando track:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      this.isDeleting = false;
    }
  }

  async playAllTracks(): Promise<void> {
    if (this.tracks.length === 0) return;

    this.isPlayingMix = true;
    try {
      await this.mixer.playMultipleTracks(this.tracks);
      
      // Estimar duración máxima para resetear el estado
      const maxDuration = Math.max(...this.tracks.map(t => t.duration_ms || 0));
      setTimeout(() => {
        this.isPlayingMix = false;
      }, maxDuration + 500);
    } catch (error: any) {
      console.error('Error reproduciendo:', error);
      alert(`Error reproduciendo: ${error.message}`);
      this.isPlayingMix = false;
    }
  }

  async downloadMixdown(): Promise<void> {
    if (!this.mixdown) return;

    try {
      const url = this.getTrackUrl(this.mixdown);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mixdown_${this.sessionId.substring(0, 8)}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error descargando:', error);
      alert(`Error descargando: ${error.message}`);
    }
  }

  loadMore(): void {
    if (!this.hasMore || this.isLoading) return;
    this.page++;
    this.loadTracks();
  }

  getTrackUrl(track: AudioTrack): string {
    return this.urlCache.get(track.id) || '';
  }

  formatDuration(ms: number | null): string {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private handleTrackUploaded(): void {
    // Reset y recargar
    this.tracks = [];
    this.page = 0;
    this.hasMore = true;
    this.urlCache.clear();
    this.loadTracks();
    this.loadMixdown();
  }

  getTotalDuration(): string {
    const total = this.tracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0);
    return this.formatDuration(total);
  }

  getTotalSize(): string {
    const total = this.tracks.reduce((sum, track) => sum + track.size_bytes, 0);
    return this.formatFileSize(total);
  }
}
