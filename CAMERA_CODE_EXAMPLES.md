# Camera Capture Code Examples

## Key Implementation Patterns

### 1. Camera Activation with Error Handling

```typescript
const startCamera = async () => {
  setCameraState('requesting');
  setError(null);

  try {
    // Request camera with rear camera preference
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: 'environment', // Prefer rear camera
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        setCameraState('active');
      };
    }
  } catch (err) {
    console.error('Camera access error:', err);
    stopCamera();

    if (err instanceof DOMException) {
      switch (err.name) {
        case 'NotAllowedError':
          setCameraState('denied');
          setError('Permiso de cámara denegado');
          break;
        case 'NotFoundError':
          setCameraState('unavailable');
          setError('No se encontró ninguna cámara');
          break;
        case 'NotReadableError':
          setCameraState('unavailable');
          setError('La cámara está siendo usada por otra aplicación');
          break;
        case 'OverconstrainedError':
          // Fallback to simpler constraints
          retryWithSimpleConstraints();
          break;
        default:
          setCameraState('unavailable');
          setError('Error al acceder a la cámara');
      }
    }
  }
};
```

### 2. Photo Capture with Automatic Compression

```typescript
const capturePhoto = () => {
  if (!videoRef.current || !canvasRef.current) return;

  const video = videoRef.current;
  const canvas = canvasRef.current;
  const context = canvas.getContext('2d');

  if (!context) return;

  // Set canvas dimensions to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw video frame to canvas
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convert to data URL with compression
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

  // Resize if needed (max 800px on longest side)
  const maxSize = 800;
  const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height, 1);

  if (scale < 1) {
    // Need to resize
    canvas.width = Math.floor(canvas.width * scale);
    canvas.height = Math.floor(canvas.height * scale);

    const img = new Image();
    img.onload = () => {
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(compressedDataUrl);
      setCameraState('captured');
      stopCamera();
    };
    img.src = dataUrl;
  } else {
    // No resize needed
    setCapturedImage(dataUrl);
    setCameraState('captured');
    stopCamera();
  }
};
```

### 3. Stream Cleanup (Memory Management)

```typescript
const stopCamera = () => {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }
};

// Cleanup on unmount
useEffect(() => {
  return () => {
    stopCamera();
  };
}, []);
```

### 4. Device-Specific Settings Instructions

```typescript
const getSettingsInstructions = () => {
  if (isIOS) {
    return (
      <div className="space-y-2 text-left">
        <p className="font-semibold">Para activar la cámara en iOS:</p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Abre la app "Ajustes"</li>
          <li>Desplázate hasta Safari</li>
          <li>Toca "Cámara" en la sección "Configuración para sitios web"</li>
          <li>Selecciona "Permitir"</li>
          <li>Recarga esta página</li>
        </ol>
      </div>
    );
  } else if (isAndroid) {
    return (
      <div className="space-y-2 text-left">
        <p className="font-semibold">Para activar la cámara en Android:</p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Abre "Configuración" de Android</li>
          <li>Ve a "Aplicaciones" → "Chrome"</li>
          <li>Toca "Permisos"</li>
          <li>Activa "Cámara"</li>
          <li>Recarga esta página</li>
        </ol>
      </div>
    );
  }
};
```

### 5. Touch-Friendly Capture Button

```typescript
// Capture button - 80x80px for excellent touch target
<button
  onClick={capturePhoto}
  className="w-20 h-20 rounded-full bg-white border-4 border-white/50 shadow-lg hover:scale-110 active:scale-95 transition-transform"
>
  <div className="w-full h-full rounded-full bg-white" />
</button>
```

### 6. Live Preview with Composition Grid

```typescript
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="relative w-full h-full bg-black"
>
  {/* Video preview */}
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    className="w-full h-full object-cover"
  />

  {/* Grid overlay for composition */}
  <div className="absolute inset-0 pointer-events-none">
    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="border border-white/20" />
      ))}
    </div>

    {/* Center focus frame */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 rounded-2xl" />
  </div>

  {/* Controls */}
  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
    {/* Capture button and controls */}
  </div>
</motion.div>
```

### 7. File Input with Camera Attribute (Mobile Shortcut)

```typescript
// In AddItemView.tsx
<input
  type="file"
  accept="image/*"
  capture="environment"  // Triggers camera directly on mobile
  ref={fileInputRef}
  onChange={handleFileChange}
  className="hidden"
/>

<button onClick={() => fileInputRef.current?.click()}>
  Subir Archivo
</button>
```

### 8. Integration with Existing Image Processing

```typescript
// In AddItemView.tsx - unified processing function
const processImageDataUrl = async (url: string, file?: File) => {
  const validationResult = validateImageDataUri(url);
  if (!validationResult.isValid) {
    setError(validationResult.error || 'Imagen inválida');
    setViewState('capture');
    return;
  }

  setImageDataUrl(url);
  setViewState('analyzing');
  setError(null);

  try {
    const result = await aiService.analyzeClothingItem(url);
    setMetadata(result);
    setViewState('editing');
  } catch (err) {
    console.error('Analysis error:', err);
    setError('Error al analizar la imagen');
    setViewState('capture');
  }
};

// Called from both camera and file upload
const handleCameraCapture = async (imageDataUrl: string) => {
  await processImageDataUrl(imageDataUrl);
};

const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const url = e.target?.result as string;
      await processImageDataUrl(url, file);
    };
    reader.readAsDataURL(file);
  }
};
```

### 9. State Machine Pattern

```typescript
type CameraState = 'idle' | 'requesting' | 'active' | 'captured' | 'denied' | 'unavailable';

const renderContent = () => {
  switch (cameraState) {
    case 'idle':
      // Show "Activate Camera" button
      return <ActivateCameraUI />;

    case 'requesting':
      // Show loading spinner
      return <LoadingSpinner message="Solicitando permiso..." />;

    case 'active':
      // Show live camera preview with controls
      return <CameraPreview />;

    case 'captured':
      // Show photo preview with confirm/retake
      return <PhotoPreview />;

    case 'denied':
      // Show settings instructions
      return <PermissionDeniedUI />;

    case 'unavailable':
      // Show error with retry option
      return <CameraUnavailableUI />;
  }
};
```

### 10. Responsive Button Layout

```typescript
// In AddItemView.tsx - button hierarchy
<div className="w-full space-y-3">
  {/* Primary: Camera capture */}
  <button
    onClick={() => setViewState('camera')}
    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 px-6 rounded-2xl shadow-glow-accent transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
  >
    <span className="material-symbols-outlined">photo_camera</span>
    Tomar Foto
  </button>

  {/* Secondary: File upload */}
  <button
    onClick={() => fileInputRef.current?.click()}
    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-text-primary dark:text-gray-200 font-bold py-4 px-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
  >
    <span className="material-symbols-outlined">add_a_photo</span>
    Subir Archivo
  </button>

  <div className="relative py-2">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">o</span>
    </div>
  </div>

  {/* Tertiary: AI generation */}
  <button
    onClick={() => setViewState('generate')}
    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-text-primary dark:text-gray-200 font-bold py-4 px-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
  >
    <span className="material-symbols-outlined text-secondary">auto_awesome</span>
    Generar con IA
  </button>
</div>
```

## Performance Optimizations

### 1. Image Size Calculation
```typescript
// Calculate compressed file size
function estimateCompressedSize(width: number, height: number): number {
  const pixels = width * height;
  const bytesPerPixel = 0.5; // JPEG at 0.8 quality
  return Math.floor(pixels * bytesPerPixel);
}

// Example: 1920x1080 → ~1MB uncompressed → ~100KB compressed at 800px
```

### 2. Lazy Stream Initialization
```typescript
// Only request camera when user explicitly activates it
const [cameraState, setCameraState] = useState<CameraState>('idle');

// User must click "Activate Camera" button
<button onClick={startCamera}>Activar Cámara</button>
```

### 3. Canvas Reuse
```typescript
// Single canvas element reused for all captures
const canvasRef = useRef<HTMLCanvasElement>(null);

// Hidden from UI
<canvas ref={canvasRef} className="hidden" />
```

## Mobile-Specific Patterns

### 1. Orientation Handling
```typescript
// CSS handles orientation automatically
<video className="w-full h-full object-cover" />

// Video automatically fills container regardless of orientation
```

### 2. Viewport Meta Tag (in index.html)
```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
>
```

### 3. Full-Screen Modal Pattern
```typescript
// Full-screen overlay for camera
<div className="fixed inset-0 z-50 bg-black">
  {/* Camera UI */}
</div>
```

## Testing Utilities

### 1. Browser Detection
```typescript
useEffect(() => {
  const ua = navigator.userAgent.toLowerCase();
  setIsIOS(/iphone|ipad|ipod/.test(ua));
  setIsAndroid(/android/.test(ua));
}, []);
```

### 2. Camera API Support Check
```typescript
const checkCameraSupport = () => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};
```

### 3. Debug Logging
```typescript
console.log('Camera state:', cameraState);
console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
console.log('Compressed size:', Math.floor(dataUrl.length * 0.75 / 1024), 'KB');
```

## Common Patterns Summary

| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| getUserMedia | Camera access | `navigator.mediaDevices.getUserMedia()` |
| facingMode | Rear camera | `{ video: { facingMode: 'environment' } }` |
| Canvas capture | Photo capture | `context.drawImage(video, 0, 0)` |
| JPEG compression | File size | `canvas.toDataURL('image/jpeg', 0.8)` |
| Stream cleanup | Memory | `track.stop()` on unmount |
| Error handling | UX | Switch on `err.name` |
| Touch targets | Mobile UX | Min 44x44px, used 80x80px |
| capture attr | Quick camera | `<input capture="environment">` |

## Resources

- [getUserMedia API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Canvas toDataURL](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL)
- [Media Constraints](https://developer.mozilla.org/en-US/docs/Web/API/Media_Streams_API/Constraints)
- [iOS Safari Media Capture](https://webkit.org/blog/6784/new-video-policies-for-ios/)
