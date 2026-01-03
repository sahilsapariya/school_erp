# Network Connection Troubleshooting Guide

## Current Issue: Android Emulator Cannot Connect to Flask

The Android emulator is trying to connect to `http://10.0.2.2:5001` but getting "Network request failed".

## Step-by-Step Debugging

### 1. Verify Flask Server is Running

**Check if Flask is running:**
```bash
# Check if port 5001 is in use
lsof -i :5001

# You should see Python/Flask process
```

**Start Flask server:**
```bash
python app.py
```

**Expected output:**
```
 * Running on http://0.0.0.0:5001
 * Debug mode: on
```

### 2. Test Flask Locally

**In your browser, test:**
- `http://localhost:5001/api` - Should show "Hello, World!"

**Or use the test script:**
```bash
python test_flask_connection.py
```

### 3. Android Emulator Network Configuration

The Android emulator uses `10.0.2.2` to reach your host machine's `localhost`.

**Test from Android emulator:**
1. Open browser in Android emulator
2. Go to: `http://10.0.2.2:5001/api`
3. Should show "Hello, World!"

**If this doesn't work:**
- The emulator might not be able to reach your host
- Try restarting the Android emulator
- Check Android emulator network settings

### 4. Common Issues

#### Issue: Flask crashes on startup
**Solution:** Check if DATABASE_URL environment variable is set
```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# If not set, you might need to create a .env file or set it:
export DATABASE_URL="sqlite:///app.db"  # or your database URL
```

#### Issue: Port already in use
**Solution:** Check what's using port 5001
```bash
lsof -i :5001
# Kill the process or use a different port
```

#### Issue: Firewall blocking connections
**Solution (macOS):**
1. System Settings → Network → Firewall
2. Make sure Flask/Python is allowed
3. Or temporarily disable firewall for testing

### 5. Alternative: Use Physical Device

If Android emulator continues to have issues:

1. **Find your computer's IP:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Update `client/common/constants/api.ts`:**
   ```typescript
   return 'http://192.168.1.XXX:5001'; // Your actual IP
   ```

3. **Make sure phone and computer are on same Wi-Fi**

4. **Test in phone browser:**
   `http://YOUR_IP:5001/api`

## Quick Checklist

- [ ] Flask server is running (`python app.py`)
- [ ] Flask is accessible at `http://localhost:5001/api`
- [ ] Port 5001 is not blocked by firewall
- [ ] Android emulator can access `http://10.0.2.2:5001/api` in browser
- [ ] No errors in Flask terminal when starting
- [ ] DATABASE_URL environment variable is set (if needed)

## Still Not Working?

1. **Check Flask logs** - Look for errors in the terminal where Flask is running
2. **Check Expo/React Native logs** - Look for more detailed error messages
3. **Try iOS Simulator** - It uses `localhost` directly, which might work better
4. **Use ngrok or similar** - For testing across networks

