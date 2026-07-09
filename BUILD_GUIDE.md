# 📱 Build APK via GitHub Actions

## Two Build Methods Available

---

### Method 1: EAS Build (Recommended — easiest)

Uses Expo's cloud build service (EAS). Free tier available.

**One-time setup:**

1. Create a free account at [expo.dev](https://expo.dev)
2. Install EAS CLI locally: `npm install -g eas-cli`
3. Login: `eas login`
4. Get your token: `eas account:view`
5. In your GitHub repo → Settings → Secrets → New secret:
   - Name: `EXPO_TOKEN`
   - Value: your Expo token from step 4

**Trigger the build:**
- Push to `main` branch, or
- Go to GitHub → Actions → "Build Android APK" → Run workflow

**Download APK:**
- Check [expo.dev/builds](https://expo.dev/builds) after ~15 minutes

---

### Method 2: Local Gradle Build (No EAS account needed)

Builds entirely on GitHub's free runners.

**One-time setup:**

Add these secrets to GitHub repo (Settings → Secrets):
| Secret | Value |
|--------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://ntxvowjyraksncnintxv.backend.onspace.ai` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | *(get from OnSpace Cloud → Settings)* |

**Trigger the build:**
- Go to GitHub → Actions → "Build Android APK (Local Gradle)" → Run workflow

**Download APK:**
- When workflow completes, go to the run → Artifacts → Download `kvs-edushield-apk`

---

## Files Created

| File | Purpose |
|------|---------|
| `.github/workflows/build.yml` | EAS cloud build workflow |
| `.github/workflows/build-local.yml` | Local Gradle build workflow |
| `eas.json` | EAS build configuration |
| `app.json` | Updated with Android package name |

## Package Name
`com.novathink.kvsedushieldai`

---

*Made by team NovaThink · Kendriya Vidyalaya Pattom*
