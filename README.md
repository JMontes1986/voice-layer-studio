# 🎙️ Voice Layer Studio

Aplicación web móvil-first para grabar, superponer y mezclar pistas de audio directamente desde el navegador.

## 🚀 Características

- ✅ Grabación de voz con MediaRecorder API
- ✅ Almacenamiento en Supabase Storage
- ✅ Superposición de múltiples pistas (sincronizadas en t=0)
- ✅ Generación automática de mixdown (mezcla final)
- ✅ Reproducción individual y grupal
- ✅ Descarga del mixdown en formato WAV
- ✅ Diseño mobile-first y PWA-ready

## 🛠️ Stack Tecnológico

- **Frontend**: Angular 17+ (Standalone Components)
- **Backend**: Supabase (Postgres + Storage)
- **Despliegue**: Vercel
- **Audio Processing**: Web Audio API, OfflineAudioContext

## 📦 Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/voice-layer-studio.git
cd voice-layer-studio
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar el SQL de `supabase/migrations/001_initial_schema.sql`
3. Crear bucket `audios` (público)
4. Copiar URL y Anon Key

### 4. Configurar variables de entorno

Editar `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'https://TU-PROYECTO.supabase.co',
    anonKey: 'TU-ANON-KEY'
  }
};
```

### 5. Ejecutar en desarrollo
```bash
npm start
```

Abrir [http://localhost:4200](http://localhost:4200)

## 🚀 Despliegue en Vercel

### Opción 1: Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

### Opción 2: Vercel Dashboard

1. Ir a [vercel.com/new](https://vercel.com/new)
2. Importar repositorio de GitHub
3. Framework Preset: **Angular**
4. Build Command: `npm run build`
5. Output Directory: `dist/voice-layer-studio/browser`
6. Agregar variables de entorno:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
7. Deploy

## 📱 Uso

1. **Grabar**: Presiona "Iniciar Grabación" y habla
2. **Detener**: Presiona "Detener" cuando termines
3. **Preview**: Escucha la grabación
4. **Guardar**: Sube el track a la nube
5. **Repetir**: Graba más tracks para superponerlos
6. **Reproducir**: Escucha la mezcla final
7. **Descargar**: Obtén el mixdown.wav

## 🔒 Seguridad

- HTTPS obligatorio (requerido por MediaRecorder)
- Row Level Security (RLS) en Supabase
- Validación de MIME type y tamaño (15MB max)
- Storage policies configuradas

## 📄 Licencia

MIT

## 👨‍💻 Autor

Desarrollado con ❤️ por [Tu Nombre]
