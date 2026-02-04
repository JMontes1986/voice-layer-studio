import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecorderComponent } from './features/recorder/recorder.component';
import { TrackListComponent } from './features/track-list/track-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RecorderComponent, TrackListComponent],
  template: `
    <div class="app-container">
      <header class="app-header">
        <h1>🎙️ Voice Layer Studio</h1>
        <p class="subtitle">Graba, superpone y mezcla tus pistas de audio</p>
      </header>

      <main class="app-main">
        <app-recorder></app-recorder>
        <app-track-list></app-track-list>
      </main>

      <footer class="app-footer">
        <p>Mobile-first Audio Layering App · v1.0.0</p>
        <p class="credits">Desarrollado con Angular + Supabase</p>
      </footer>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
    }

    .app-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem 1rem;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);

      h1 {
        margin: 0;
        font-size: 2rem;
        font-weight: 700;
        text-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }

      .subtitle {
        margin: 0.5rem 0 0;
        opacity: 0.95;
        font-size: 0.95rem;
        font-weight: 300;
      }
    }

    .app-main {
      flex: 1;
      padding: 1.5rem 0;
      width: 100%;
      max-width: 100%;
    }

    .app-footer {
      background: #343a40;
      color: white;
      padding: 1.5rem 1rem;
      text-align: center;
      font-size: 0.85rem;
      border-top: 3px solid #667eea;

      p {
        margin: 0.25rem 0;
        
        &.credits {
          opacity: 0.7;
          font-size: 0.75rem;
        }
      }
    }

    @media (max-width: 768px) {
      .app-header h1 {
        font-size: 1.5rem;
      }
      
      .app-header .subtitle {
        font-size: 0.85rem;
      }
      
      .app-main {
        padding: 1rem 0;
      }
    }
  `]
})
export class AppComponent {
  title = 'voice-layer-studio';
}
