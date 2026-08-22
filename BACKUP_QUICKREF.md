# ☁️ Cloud Backup - Quick Reference

## Automatic Local Snapshots (On by Default)

Writingway automatically saves a full copy of your database every 3 minutes
(and when you close the app) to:

```
project-backups/all/
```

These snapshots are independent of your browser. If the browser ever clears
your site data (incognito, "clear on exit", cleanup tools), the next launch
will ask: **"Your browser data was cleared — restore from snapshot?"**

Click **OK** and your projects, chapters, scenes, compendium, and chats come back.
The newest 50 snapshots are kept automatically.

> ⚠️ Do not delete the `project-backups` folder — it is your data's safety net.

## Setup (One-time)

1. Main Menu (☰) → **☁️ Cloud Backup**
2. Get token: https://github.com/settings/tokens
   - Generate new token (classic)
   - Check only: **gist**
3. Paste token → **Save Settings**
4. Check **Enable automatic backup**

✅ Done! Auto-backup every 5 minutes.

## Usage

### Backup Now
Main Menu → Cloud Backup → **Backup Now**

### Restore
Main Menu → Cloud Backup → **📥 Restore from Backup** → Select version → **Restore**

### View Backups
Visit: https://gist.github.com/

## Status

**Sidebar:** Shows "☁️ Auto-backup active" when enabled
**Last Backup:** Shown in settings panel

## What's Backed Up

✓ All chapters
✓ All scenes  
✓ All content (text)
✓ Compendium entries
✓ Custom prompts

## Features

- **Private** - Only you can see your backups
- **Unlimited** - No storage limits
- **Versioned** - Keep all history forever
- **Automatic** - Every 5 minutes
- **Secure** - Token stays in your browser

## Troubleshooting

**Not working?**
- Check token has `gist` permission
- Verify auto-backup is enabled
- Look for errors in browser console (F12)

**Can't restore?**
- Make sure project was backed up at least once
- Check Gist exists at https://gist.github.com/

## Security

- Token requires minimal permissions (gist only)
- All backups are private
- Revoke token anytime: https://github.com/settings/tokens

---

**Need help?** See `BACKUP_TESTING.md` for detailed testing guide.
