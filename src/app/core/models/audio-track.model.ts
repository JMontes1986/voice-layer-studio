export interface AudioTrack {
  id: string;
  created_at: string;
  file_path: string;
  duration_ms: number | null;
  mime_type: string;
  size_bytes: number;
  checksum?: string;
  is_mixdown: boolean;
  session_id: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  blob: Blob | null;
}

export interface SessionStats {
  total_tracks: number;
  total_duration_ms: number;
  total_size_bytes: number;
  has_mixdown: boolean;
}
