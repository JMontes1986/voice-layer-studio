# 📦 Guía de Instalación - Voice Layer Studio

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ y npm
- Cuenta de Supabase (gratuita)
- Cuenta de Vercel (gratuita) - opcional para producción
- Git

---

## 📝 Paso 1: Clonar o Crear el Proyecto

### Opción A: Si ya tienes el repositorio
```bash
git clone https://github.com/tu-usuario/voice-layer-studio.git
cd voice-layer-studio
```

### Opción B: Crear desde cero

1. Crea una carpeta para el proyecto
2. Copia todos los archivos proporcionados en la estructura correcta
3. Inicializa Git:
```bash
git init
git add .
git commit -m "Initial commit"
```

---

## 📦 Paso 2: Instalar Dependencias
```bash
npm install
```

Esto instalará:
- Angular 17
- Supabase JS Client
- RxJS
- TypeScript
- Todas las dependencias necesarias

---

## 🔧 Paso 3: Configurar Supabase

### 3.1 Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Click en "New Project"
3. Completa los datos:
   - **Name**: voice-layer-studio
   - **Database Password**: (guárdala, la necesitarás)
   - **Region**: Selecciona la más cercana
4. Click "Create new project"

### 3.2 Ejecutar SQL

1. En el panel de Supabase, ve a **SQL Editor**
2. Click en "New Query"
3. Copia y pega el contenido completo de `supabase/migrations/001_initial_schema.sql`
4. Click "Run" (puede tardar unos segundos)
5. Verifica que no haya errores

### 3.3 Crear Bucket de Storage

1. Ve a **Storage** en el menú lateral
2. Click "Create a new bucket"
3. Configura:
   - **Name**: `audios`
   - **Public bucket**: ✅ Activado
   - **File size limit**: 15 MB
   - **Allowed MIME types**: `audio/webm, audio/wav, audio/mpeg, audio/ogg, audio/mp4`
4. Click "Create bucket"

### 3.4 Obtener Credenciales

1. Ve a **Project Settings** > **API**
2. Copia:
   - **Project URL** (ejemplo: `https://abcdefgh.supabase.co`)
   - **anon public key** (comienza con `eyJhbGciOiJIUzI...`)

---

## 🔐 Paso 4: Configurar Variables de Entorno

### 4.1 Entorno de Desarrollo

Edita `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'https://TU-PROYECTO-ID.supabase.co',  // ← Pega tu URL aquí
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // ← Pega tu key aquí
  }
};
```

### 4.2 Entorno de Producción

Edita `src/environments/environment.prod.ts` con los mismos valores.

---

## ▶️ Paso 5: Ejecutar en Desarrollo
```bash
npm start
```

La aplicación se abrirá en [http://localhost:4200](http://localhost:4200)

### Verificar Funcionamiento

1. ✅ La página carga sin errores
2. ✅ Click en "Iniciar Grabación" solicita permiso de micrófono
3. ✅ Puedes grabar y guardar un track
4. ✅ El track aparece en la lista
5. ✅ Se genera el mixdown automáticamente

---

## 🚀 Paso 6: Desplegar en Vercel (Opcional)

### 6.1 Conectar con GitHub

1. Sube tu código a GitHub:
```bash
git remote add origin https://github.com/tu-usuario/voice-layer-studio.git
git branch -M main
git push -u origin main
```

### 6.2 Importar a Vercel

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Selecciona tu repo `voice-layer-studio`
4. Configura:
   - **Framework Preset**: Angular
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/voice-layer-studio/browser`
5. Click "Deploy"

### 6.3 Configurar Variables de Entorno en Vercel

1. Ve a **Project Settings** > **Environment Variables**
2. Agrega:
   - `SUPABASE_URL` = tu URL de Supabase
   - `SUPABASE_ANON_KEY` = tu anon key
3. **Importante**: Marca estas variables para todos los entornos (Production, Preview, Development)
4. Redeploy si es necesario

### 6.4 Verificar Despliegue

1. Abre la URL de Vercel (ejemplo: `https://voice-layer-studio.vercel.app`)
2. Verifica que funcione igual que en local
3. Prueba en un móvil real (HTTPS es obligatorio para micrófono)

---

## 📱 Paso 7: Probar en Móvil

### iOS Safari

1. Abre la URL en Safari (no Chrome iOS)
2. Acepta permisos de micrófono
3. Graba y verifica que funcione

**Limitaciones conocidas de iOS:**
- MediaRecorder no soportado en iOS < 14.3
- Requiere interacción del usuario para reproducir audio
- Formato preferido: `audio/mp4` sobre `audio/webm`

### Android Chrome

1. Abre la URL en Chrome
2. Acepta permisos
3. Todo debería funcionar correctamente

---

## 🔍 Solución de Problemas

### Error: "No se pudo acceder al micrófono"

✅ **Solución:**
- Verifica que estés en HTTPS (no HTTP)
- En Chrome: `chrome://settings/content/microphone`
- Asegúrate de dar permisos al sitio

### Error: "Error subiendo archivo"

✅ **Solución:**
- Verifica credenciales de Supabase en `environment.ts`
- Verifica que el bucket `audios` exista y sea público
- Revisa las policies de Storage en Supabase

### Error: "Error mezclando tracks"

✅ **Solución:**
- Verifica que los archivos se hayan subido correctamente
- Comprueba la consola del navegador para más detalles
- Intenta con menos tracks primero

### La página se ve rota después de desplegar

✅ **Solución:**
- Verifica que `vercel.json` esté en la raíz
- Comprueba que el build haya terminado sin errores
- Limpia caché del navegador o prueba en incógnito

---

## 📊 Verificar que Todo Funciona

### Checklist Final

- [ ] Instalación de dependencias: `npm install` sin errores
- [ ] Build exitoso: `npm run build` sin errores
- [ ] Base de datos creada en Supabase
- [ ] Bucket `audios` creado y público
- [ ] Variables de entorno configuradas
- [ ] App corre en local: `npm start`
- [ ] Puedo grabar audio
- [ ] El audio se guarda en Supabase
- [ ] Aparece en la lista de tracks
- [ ] Se genera el mixdown
- [ ] Puedo descargar el mixdown
- [ ] Puedo eliminar tracks
- [ ] Deploy en Vercel exitoso (si aplica)
- [ ] Funciona en móvil real

---

## 📚 Comandos Útiles
```bash
# Desarrollo
npm start                    # Servidor de desarrollo
npm run build               # Build de producción
npm run watch               # Build con watch mode

# Git
git status                  # Ver cambios
git add .                   # Agregar todos los archivos
git commit -m "mensaje"     # Commit
git push                    # Push a GitHub

# Vercel
vercel                      # Deploy a preview
vercel --prod              # Deploy a producción
vercel logs                # Ver logs
```

---

## 🆘 Soporte

Si encuentras problemas:

1. Revisa la consola del navegador (F12 > Console)
2. Revisa los logs de Supabase (Dashboard > Logs)
3. Revisa los logs de Vercel (Dashboard > Deployments > Logs)
4. Verifica que todas las credenciales sean correctas

---

## 🎉 ¡Listo!

Tu aplicación Voice Layer Studio está configurada y funcionando.

Ahora puedes:
- Grabar múltiples pistas de audio
- Superponerlas automáticamente
- Descargar la mezcla final
- Compartir la URL con otros usuarios

**¡Disfruta grabando! 🎙️**
