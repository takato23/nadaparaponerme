# Camera Capture Testing Guide

## Implementation Summary

### Components Created/Modified

1. **CameraCaptureButton.tsx** (NEW - 471 lines)
   - Full-screen camera interface with live preview
   - Permission handling with device-specific instructions
   - Photo capture with automatic compression (800px max, 0.8 quality)
   - Supports iOS Safari 14+ and Android Chrome 90+

2. **AddItemView.tsx** (MODIFIED)
   - Added camera capture integration
   - New "Tomar Foto" primary button
   - Added `capture="environment"` to file input for direct camera access
   - Refactored image processing into shared `processImageDataUrl` function

## Features Implemented

### 1. Native Camera Capture
- Uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`
- Automatically requests rear camera on mobile devices
- Fallback to front camera if rear not available

### 2. Permission Handling
```typescript
// States: idle → requesting → active/denied/unavailable
- idle: Initial state with "Activate Camera" button
- requesting: Shows loading spinner while requesting permission
- denied: Shows device-specific settings instructions
- unavailable: Shows error with retry option
- active: Live camera preview with capture controls
- captured: Preview of captured photo with confirm/retake
```

### 3. Mobile-Specific UI
- Touch-friendly capture button (80x80px)
- Grid overlay for composition guidance
- Center focus frame for item alignment
- Bottom controls with gradient overlay
- Orientation-aware layout

### 4. Photo Optimization
```typescript
// Automatic compression workflow:
1. Capture full resolution from camera
2. Resize if larger than 800px on longest side
3. Compress to JPEG at 0.8 quality
4. Convert to base64 data URL
5. Pass to existing AI analysis pipeline
```

### 5. Error Recovery
- Permission denied → Settings instructions (iOS/Android specific)
- Camera in use → Error message with retry
- No camera found → Fallback to file upload
- Unsupported browser → Graceful degradation

## Testing Checklist

### iOS Safari (14+)

#### First-Time Permission Flow
- [ ] Open app on iOS Safari
- [ ] Tap "Tomar Foto" button
- [ ] System permission dialog appears
- [ ] Grant permission
- [ ] Camera preview loads with rear camera
- [ ] Grid overlay visible
- [ ] Capture button (80x80px white circle) visible

#### Permission Denied Flow
- [ ] Deny camera permission
- [ ] See "Permiso Denegado" screen
- [ ] Settings instructions displayed (Safari-specific)
- [ ] "Volver a Subir Archivo" button works
- [ ] Can still use file upload option

#### Photo Capture Flow
- [ ] Camera preview shows clear image
- [ ] Tap white capture button
- [ ] Photo captured successfully
- [ ] Preview screen shows captured image
- [ ] "Repetir" button retakes photo
- [ ] "Confirmar" button proceeds to AI analysis
- [ ] Captured photo compressed < 1MB
- [ ] AI analysis works with captured photo

#### Orientation Changes
- [ ] Rotate device while camera active
- [ ] Preview adjusts to orientation
- [ ] Capture still works in landscape
- [ ] UI remains touch-friendly

### Android Chrome (90+)

#### First-Time Permission Flow
- [ ] Open app on Android Chrome
- [ ] Tap "Tomar Foto" button
- [ ] System permission dialog appears
- [ ] Grant permission
- [ ] Camera preview loads with rear camera
- [ ] Grid overlay visible
- [ ] Capture controls visible

#### Permission Denied Flow
- [ ] Deny camera permission
- [ ] See "Permiso Denegado" screen
- [ ] Settings instructions displayed (Android-specific)
- [ ] Can access settings and change permission
- [ ] After permission granted, camera works

#### Photo Capture Flow
- [ ] Same as iOS flow above
- [ ] Verify compression works
- [ ] Verify AI analysis integration

#### Edge Cases
- [ ] Camera already in use by another app → Error shown
- [ ] Switch between apps while camera active → Stream stops
- [ ] Return to app → Can restart camera
- [ ] Low storage warning → Handled gracefully

### File Input with Camera Attribute

- [ ] Tap "Subir Archivo" button
- [ ] On mobile: Camera launches directly (capture="environment")
- [ ] On desktop: File picker opens
- [ ] Selected/captured photo processes normally

### Desktop Browser Testing

- [ ] Chrome/Firefox: Camera works with webcam
- [ ] Safari: getUserMedia API supported
- [ ] No camera available: Shows "unavailable" state
- [ ] File upload always available as fallback

## Code Examples

### Camera Activation
```typescript
const constraints: MediaStreamConstraints = {
  video: {
    facingMode: 'environment', // Rear camera on mobile
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  },
  audio: false
};

const stream = await navigator.mediaDevices.getUserMedia(constraints);
```

### Photo Capture with Compression
```typescript
// Capture from video stream
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
context.drawImage(video, 0, 0);

// Resize if > 800px
const maxSize = 800;
const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height, 1);
if (scale < 1) {
  canvas.width *= scale;
  canvas.height *= scale;
  // Redraw scaled...
}

// Compress to JPEG
const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
```

### Permission Error Handling
```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
} catch (err) {
  if (err.name === 'NotAllowedError') {
    // Show settings instructions
  } else if (err.name === 'NotFoundError') {
    // No camera available
  } else if (err.name === 'NotReadableError') {
    // Camera in use by another app
  }
}
```

## Mobile Testing Notes

### iOS Safari Specifics
- Requires user gesture to activate camera (button tap)
- Camera stream stops when tab backgrounded
- Requires HTTPS in production (localhost exempt)
- Permission persists per-domain

### Android Chrome Specifics
- More permissive with camera access
- Better handling of orientation changes
- Supports `facingMode: 'environment'` consistently
- Permission managed at OS level

### Performance Considerations
- Camera stream: ~5-10 MB/min memory
- Compressed photos: 100-500 KB (down from 2-5 MB)
- AI analysis: Same as file upload workflow
- Total workflow: < 10 seconds from capture to analysis

## Browser Support Matrix

| Browser | Version | Camera API | Capture Attr | Notes |
|---------|---------|------------|--------------|-------|
| iOS Safari | 14+ | ✅ | ✅ | Requires HTTPS |
| Android Chrome | 90+ | ✅ | ✅ | Full support |
| Chrome Desktop | 90+ | ✅ | ⚠️ | Webcam only |
| Firefox Mobile | 90+ | ✅ | ✅ | Good support |
| Samsung Internet | 14+ | ✅ | ✅ | Based on Chrome |

## Deployment Checklist

### Pre-Deploy
- [ ] Build passes without errors (`npm run build`)
- [ ] Camera permission dialogs tested on real devices
- [ ] Compression verified (photos < 1MB)
- [ ] Error states display correctly
- [ ] Settings instructions accurate for iOS/Android

### Post-Deploy (Production)
- [ ] HTTPS enabled (required for camera API)
- [ ] Test on iPhone with Safari
- [ ] Test on Android with Chrome
- [ ] Verify camera loads on first visit
- [ ] Verify permission persistence works
- [ ] Check analytics for camera usage vs file upload

## Common Issues & Solutions

### Issue: Camera permission denied permanently
**Solution**: Show detailed settings instructions with device-specific paths

### Issue: Camera shows black screen
**Solution**: Check if camera in use by another app, show error message

### Issue: Photo quality too low
**Solution**: Already optimized at 800px / 0.8 quality - increase if needed in line 109-130 of CameraCaptureButton.tsx

### Issue: Camera doesn't work on HTTP
**Solution**: Deploy to HTTPS domain (camera API requires secure context)

### Issue: Front camera activates instead of rear
**Solution**: Check `facingMode: 'environment'` constraint, fallback implemented

## File Structure
```
components/
├── CameraCaptureButton.tsx (NEW - 471 lines)
│   ├── Camera state management
│   ├── getUserMedia API integration
│   ├── Photo capture & compression
│   ├── Permission error handling
│   └── Device-specific UI instructions
│
└── AddItemView.tsx (MODIFIED)
    ├── Added camera view state
    ├── Integrated CameraCaptureButton
    ├── Updated file input with capture="environment"
    └── Unified image processing pipeline
```

## Next Steps (Optional Enhancements)

1. **Flash Control**: Add toggle for camera flash on supported devices
2. **Zoom Control**: Implement pinch-to-zoom during preview
3. **Timer**: Add 3-second countdown before capture
4. **Grid Options**: Let users toggle composition grid
5. **Resolution Selector**: Allow users to choose quality (low/med/high)
6. **Front/Rear Toggle**: Add button to switch cameras manually

## Success Metrics

Track in analytics:
- Camera usage rate vs file upload
- Permission grant rate
- Photo capture success rate
- Average photo file size
- Time from capture to analysis completion
- Error rate by device type

## Support Resources

- [MDN getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [iOS Safari Media Capture](https://webkit.org/blog/6784/new-video-policies-for-ios/)
- [Chrome Media Capture Spec](https://www.w3.org/TR/mediacapture-streams/)
