# 🚀 Pre-Deployment Checklist for Vercel

## ✅ Optimizations Applied
- [x] Vite build configuration optimized
- [x] Three.js DPR reduced to [1, 1]
- [x] Vercel.json caching headers configured
- [x] Spell projectile geometry optimized (12→8 segments)

## 📋 Before Deploying to Vercel

```bash
# 1. Clean build
rm -rf dist
npm run build

# 2. Check bundle size
npm run build 2>&1 | grep -E "dist/|final"

# 3. Test locally
npm run preview

# 4. Deploy
vercel deploy --prod
```

## 🔍 Post-Deployment Verification

1. **Load Game**: https://your-vercel-url.com
2. **Check Network Tab (F12)**:
   - Model files should be ~1-2 seconds total
   - Assets should have "200 (from cache)" on reload
3. **Check Performance (F12 → Performance)**:
   - Should maintain 60 FPS
   - GPU load <50%

## 🎮 Gaming Performance Checklist

- [ ] Character models load smoothly
- [ ] Spells don't cause frame drops
- [ ] No stuttering during gameplay
- [ ] Consistent 60 FPS (check with F12 → FPS meter)
- [ ] Multiplayer (socket.io) feels responsive

## ⚡ If Still Experiencing Lag

### Network Lag (socket.io)
```bash
# Check WebSocket connection quality
# F12 → Network → Filter by "ws://"
# Should see low latency (<100ms)
```

### Rendering Lag
```bash
# In browser console:
renderer.info.render.calls  # Should be <50
renderer.info.memory.geometries  # Should be <20
```

### CPU Lag (JavaScript)
- F12 → Performance → Record 5 seconds
- Look for long tasks (>50ms)
- Profile useAIOpponent (AI pathfinding might be heavy)

## 📞 Optimization Steps if Needed

1. **Reduce Physics Updates**: Check `useAIOpponent` for expensive computations
2. **Compress Models More**: Use Draco with higher compression
3. **Implement LOD**: Use low-poly models for AI when off-screen
4. **Reduce Draw Calls**: Combine similar objects with InstancedMesh
5. **Cache Geometries**: Pre-load models during menu screen

## 📈 Expected Results

- **Initial Load**: < 5 seconds
- **Gameplay**: Solid 60 FPS
- **Mobile**: 30+ FPS
- **Model Download**: ~1-2 MB (compressed)

---

## 🔧 Quick Fixes

If you see lag:

1. **High GPU usage?** → Reduce `gl.powerPreference` from 'high-performance' to 'low-power'
2. **High CPU usage?** → Profile AI loop, reduce pathfinding frequency
3. **Network lag?** → Increase socket.io frequency throttle in useAIOpponent
4. **Stutter on cast?** → Reduce spell pool size or increase geometry segments

---

## 📞 Support
- Check PERFORMANCE_GUIDE.md for detailed optimization tips
- Review Vercel logs: `vercel logs`
- Check browser console for errors
