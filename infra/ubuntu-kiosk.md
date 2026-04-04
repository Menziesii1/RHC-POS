# Ubuntu Kiosk Baseline

Use a restricted auto-login user that launches Chromium in kiosk mode against the locally hosted frontend.

## Required Behavior

- Auto-login into the kiosk account on boot
- Disable screen sleep and screen blanking
- Launch Chromium fullscreen on startup
- Re-launch Chromium if it crashes
- Prevent volunteer access to the desktop shell or package manager

## Example Chromium Launch

```bash
chromium-browser \
  --kiosk \
  --incognito \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --check-for-update-interval=31536000 \
  http://localhost:4173
```

## Operational Notes

- Serve the built kiosk frontend locally on the Ubuntu machine.
- Point the kiosk frontend at the Railway API URL over HTTPS.
- Keep a maintenance user separate from the volunteer kiosk user.
