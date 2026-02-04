import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey,
      {
        auth: {
          persistSession: false // No necesitamos sesión para MVP público
        }
      }
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  get storage() {
    return this.supabase.storage;
  }

  get db() {
    return this.supabase;
  }
}
