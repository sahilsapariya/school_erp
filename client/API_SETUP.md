# API Setup for Physical Device Testing

When testing on a physical device (iPhone/Android), you cannot use `localhost` because the device doesn't know what "localhost" refers to. You need to use your computer's local IP address.

## Finding Your Local IP Address

### macOS:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
Look for something like `192.168.1.100` or `10.0.0.5`

### Windows:
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually Wi-Fi or Ethernet)

### Linux:
```bash
hostname -I
```
or
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

## Updating the API URL

1. Open `client/common/constants/api.ts`
2. Replace `localhost` with your local IP address:
   ```typescript
   export const API_BASE_URL = __DEV__ 
     ? 'http://192.168.1.100:5001' // Your local IP here (port 5001, not 5000)
     : 'https://api.example.com';
   ```

## Important Notes

- Make sure your phone and computer are on the **same Wi-Fi network**
- Make sure your Flask server is running and accessible
- Some firewalls may block incoming connections - you may need to allow port 5000
- After changing the IP, restart your Expo app

## Quick Test

You can test if your API is accessible by opening this URL in your phone's browser:
`http://YOUR_IP:5001/api`

If you see "Hello, World!" or a response, it's working!

