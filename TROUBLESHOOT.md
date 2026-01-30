# 🔧 prAIvacy Extension Troubleshooting Guide

## 🚨 **Current Issue: Service Worker Registration Failed**

The error **"Service worker registration failed. Status code: 15"** indicates that Chrome can't load the background script as a service worker.

## ✅ **What's Already Fixed:**

### 🔧 **File Structure:**
```
prAIvacy/
├── ✅ manifest.json         # Fixed manifest (removed "type": "module")
├── ✅ background.js         # Service worker (simplified)
├── ✅ rules.json           # 100+ blocking rules  
├── ✅ popup.html           # Extension popup
├── ✅ popup.js             # Popup logic
├── ✅ popup.css             # Popup styles
├── ✅ dashboard.html        # Statistics dashboard
├── ✅ dashboard.js          # Dashboard logic
├── ✅ dashboard.css          # Dashboard styles
├── ✅ tracker.html          # Tracker detection page
├── ✅ tracker.js            # Tracker detection logic
├── ✅ package.json           # Cleaned dependencies
├── ✅ .env                  # Cleaned config
└── ✅ icons/               # Extension icons
```

### 📋 **Permissions Fixed:**
- ✅ Removed problematic `"type": "module"`
- ✅ Fixed `"ruleset_1"` syntax issue  
- ✅ Cleaned up declarativeNetRequest usage
- ✅ Removed unused dependencies

## 🔍 **Manual Steps to Fix:**

### **1. Force Reload Extension:**
1. Open Chrome → `chrome://extensions/`
2. Find prAIvacy extension
3. Click **"Remove"** button
4. Click **"Load unpacked"**
5. Select the prAIvacy folder
6. Click **"Select folder"**

### **2. Clear Browser Cache:**
1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Find **Storage** → **Clear storage**
4. Click **"Clear site data"**
5. Restart Chrome

### **3. Test with Fresh Profile:**
1. Open Chrome → **Settings** → **People** → **Manage other people**
2. **Add person** → Create new profile
3. **Switch to new profile** for testing
4. Load extension in new profile

## 🔧 **Common Solutions for Status Code 15:**

### **Solution A: Ensure File Integrity:**
```bash
# Check that all files exist
ls -la C:\Users\nuxat\OneDrive\Desktop\prAIvacy\

# Check file permissions
icacls "C:\Users\nuxat\OneDrive\Desktop\prAIvacy\background.js"

# Recreate manifest if corrupted
# Delete manifest.json and recreate with proper JSON structure
```

### **Solution B: Remove Chrome Extension Cache:**
```bash
# Chrome extension data location (Windows)
del /F /Q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions\prAIvacy*" /S

# Clear all Chrome data
del /F /Q /S "%LOCALAPPDATA%\Google\Chrome\User Data\Default\*"
```

### **Solution C: Use Simple Manifest:**
```json
{
  "manifest_version": 3,
  "name": "prAIvacy Ad Blocker",
  "version": "3.0.1",
  "permissions": [
    "storage",
    "declarativeNetRequest"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

## 🧪 **Debugging Commands:**

### **Check Extension in Console:**
1. Open Chrome → `chrome://extensions/`
2. Click on "prAIvacy" → **"Inspect views: service worker"**
3. Look for errors in Console tab

### **Manual Script Testing:**
```bash
# Test background script syntax
node "C:\Users\nuxat\OneDrive\Desktop\prAIvacy\background.js"

# Test manifest JSON validity
python -m json.tool "C:\Users\nuxat\OneDrive\Desktop\prAIvacy\manifest.json"
```

## 🎯 **Final Verification:**

### **Signs of Success:**
✅ Extension loads without console errors
✅ "prAIvacy Ad Blocker" appears in extension list
✅ Service worker shows as "Status: active"
✅ Network tab shows blocked requests (when visiting ad-heavy sites)

### **Expected Console Messages:**
```
🚀 prAIvacy Ad Blocker starting...
✅ Extension storage initialized
✅ Added 10 core blocking rules
🔄 Service worker activated
✅ Extension storage initialized
✅ Blocking rules activated on startup
🚫 Request blocked: doubleclick.net Full URL: https://...
📊 Stats updated: 1 total blocked (1 ads, 0 trackers)
```

### **Error Messages to Look For:**
```
❌ chrome.declarativeNetRequest not available
❌ Service worker registration failed. Status code: 15
❌ Error setting up blocking rules
❌ Manifest JSON parsing error
⚠️ Could not initialize extension storage
⚠️ Tab not accessible
```

## 📞 **Still Having Issues?**

### **Send Error Report:**
1. Open Chrome DevTools Console
2. Reproduce the error
3. Take screenshot of error message
4. Copy full console log (Ctrl+A, Ctrl+C)
5. Include:
   - Chrome version
   - Operating system
   - Extension files present

### **Quick Fix Option:**
If the extension still fails, try loading only the **manifest.json** and **background.js** with no other files - this tests if the core service worker can load.

---

**🎉 After following these steps, your extension should load successfully and start blocking ads immediately!**