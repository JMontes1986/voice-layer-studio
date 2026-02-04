import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AudioTrack } from '../models/audio-track.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly BUCKET_NAME = 'audios';
  private readonly MIXDOWN_FILENAME = 'mixdown.wav';
  private readonly MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

  constructor(private supabase: SupabaseService) {}

  async uploadAudio(blob: Blob, sessionId: string): Promise<AudioTrack> {
    // Validar tamaño
    if (blob.size > this.MAX_FILE_SIZE) {
      throw new Error('El archivo excede el tamaño máximo de 15MB');
    }

    // Validar tipo MIME
    if (!this.isValidMimeType(blob.type)) {
      throw new Error(`Tipo de archivo no soportado: ${blob.type}`);
    }

    // Generar nombre único
    const timestamp = Date.now();
    const extension = this.getExtensionFromMimeType(blob.type);
    const fileName = `track_${sessionId}_${timestamp}.${extension}`;

    try {
      // Upload a Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, blob, {
          contentType: blob.type,
          upsert: false,
          cacheControl: '3600'
        });

      if (uploadError) {
        throw new Error(`Error subiendo archivo: ${uploadError.message}`);
      }

      // Calcular duración
      const duration = await this.estimateAudioDuration(blob);

      // Insertar metadata en DB
      const { data: track, error: dbError } = await this.supabase.db
        .from('audio_tracks')
        .insert({
          file_path: fileName,
          duration_ms: duration,
          mime_type: blob.type,
          size_bytes: blob.size,
          is_mixdown: false,
          session_id: sessionId
        })
        .select()
        .single();

      if (dbError) {
        // Rollback: eliminar archivo de storage
        await this.supabase.storage.from(this.BUCKET_NAME).remove([fileName]);
        throw new Error(`Error guardando metadata: ${dbError.message}`);
      }

      return track as AudioTrack;
    } catch (error: any) {
      console.error('Error in uploadAudio:', error);
      throw error;
    }
  }

  async uploadMixdown(blob: Blob, sessionId: string): Promise<AudioTrack> {
    const fileName = `${sessionId}_${this.MIXDOWN_FILENAME}`;

    try {
      // Eliminar mixdown anterior si existe
      await this.deleteMixdown(sessionId);

      // Upload nuevo mixdown
      const { error: uploadError } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, blob, {
          contentType: 'audio/wav',
          upsert: true,
          cacheControl: '0' // No cachear mixdowns (cambian frecuentemente)
        });

      if (uploadError) {
        throw new Error(`Error subiendo mixdown: ${uploadError.message}`);
      }

      const duration = await this.estimateAudioDuration(blob);

      // Upsert en DB
      const { data: track, error: dbError } = await this.supabase.db
        .from('audio_tracks')
        .upsert({
          file_path: fileName,
          duration_ms: duration,
          mime_type: 'audio/wav',
          size_bytes: blob.size,
          is_mixdown: true,
          session_id: sessionId
        }, {
          onConflict: 'file_path'
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Error guardando mixdown: ${dbError.message}`);
      }

      return track as AudioTrack;
    } catch (error: any) {
      console.error('Error in uploadMixdown:', error);
      throw error;
    }
  }

  async getTracks(sessionId: string, page: number = 0, pageSize: number = 20): Promise<AudioTrack[]> {
    try {
      const { data, error } = await this.supabase.db
        .from('audio_tracks')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_mixdown', false)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        throw new Error(`Error obteniendo tracks: ${error.message}`);
      }

      return (data || []) as AudioTrack[];
    } catch (error: any) {
      console.error('Error in getTracks:', error);
      throw error;
    }
  }

  async getMixdown(sessionId: string): Promise<AudioTrack | null> {
    try {
      const { data, error } = await this.supabase.db
        .from('audio_tracks')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_mixdown', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Error obteniendo mixdown: ${error.message}`);
      }

      return data as AudioTrack | null;
    } catch (error: any) {
      console.error('Error in getMixdown:', error);
      return null;
    }
  }

  async deleteTrack(track: AudioTrack): Promise<void> {
    try {
      // Eliminar de storage
      const { error: storageError } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove([track.file_path]);

      if (storageError) {
        console.warn('Error eliminando archivo de storage:', storageError);
      }

      // Eliminar de DB
      const { error: dbError } = await this.supabase.db
        .from('audio_tracks')
        .delete()
        .eq('id', track.id);

      if (dbError) {
        throw new Error(`Error eliminando registro: ${dbError.message}`);
      }
    } catch (error: any) {
      console.error('Error in deleteTrack:', error);
      throw error;
    }
  }

  async deleteMixdown(sessionId: string): Promise<void> {
    try {
      const mixdown = await this.getMixdown(sessionId);
      if (mixdown) {
        await this.deleteTrack(mixdown);
      }
    } catch (error: any) {
      console.error('Error in deleteMixdown:', error);
    }
  }

  async getPublicUrl(filePath: string): Promise<string> {
    const { data } = this.supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async downloadBlob(filePath: string): Promise<Blob> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.BUCKET_NAME)
        .download(filePath);

      if (error || !data) {
        throw new Error(`Error descargando archivo: ${error?.message || 'Sin datos'}`);
      }

      return data;
    } catch (error: any) {
      console.error('Error in downloadBlob:', error);
      throw error;
    }
  }

  private isValidMimeType(mimeType: string): boolean {
    const validTypes = [
      'audio/webm',
      'audio/wav',
      'audio/mpeg',
      'audio/ogg',
      'audio/mp4',
      'audio/x-m4a'
    ];
    return validTypes.some(type => mimeType.startsWith(type));
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/wav': 'wav',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a'
    };
    
    for (const [mime, ext] of Object.entries(map)) {
      if (mimeType.startsWith(mime)) {
        return ext;
      }
    }
    
    return 'webm'; // Fallback
  }

  private async estimateAudioDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const timeout = setTimeout(() => {
        resolve(0);
        URL.revokeObjectURL(audio.src);
      }, 5000);

      audio.addEventListener('loadedmetadata', () => {
        clearTimeout(timeout);
        const duration = Math.round(audio.duration * 1000);
        resolve(isNaN(duration) ? 0 : duration);
        URL.revokeObjectURL(audio.src);
      });

      audio.addEventListener('error', () => {
        clearTimeout(timeout);
        resolve(0);
        URL.revokeObjectURL(audio.src);
      });

      audio.src = URL.createObjectURL(blob);
    });
  }
}
