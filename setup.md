# Wyse 5070 Kiosk Setup Handoff

This document captures the current state of the Dell Wyse 5070 Ubuntu kiosk setup for RHC POS.

## Device

- Hardware: Dell Wyse 5070 thin client
- OS: Ubuntu Server 24.04.4 LTS
- Hostname: `rhc-kiosk-01`
- Linux user: `rhc`
- Direct Ethernet during home setup: Windows ICS on `192.168.137.0/24`
- Last known direct Ethernet IP: `192.168.137.165`
- Tailscale IP: `100.119.238.59`

Passwordless sudo was configured for the `rhc` user during setup.

---

## Remote Access & Management

Everything you need to get into this machine or manage it from anywhere.

### SSH

The SSH private key lives at:

```text
C:\Users\calvi\.ssh\codex_rhc_wyse_ed25519
```

**From Windows (PowerShell or CMD):**

```powershell
ssh -i C:\Users\calvi\.ssh\codex_rhc_wyse_ed25519 rhc@100.119.238.59
```

**From Git Bash / WSL / Mac / Linux:**

```bash
ssh -i ~/.ssh/codex_rhc_wyse_ed25519 rhc@100.119.238.59
```

The Tailscale IP `100.119.238.59` works from any device that is also on your Tailscale network, regardless of physical location or what Wi-Fi/Ethernet the Wyse is on.

If you ever lose the key, you would need physical access or another existing SSH session to add a new public key to `/home/rhc/.ssh/authorized_keys`.

### Tailscale

Tailscale keeps the Wyse reachable across any network. It starts automatically on boot (`tailscaled` service).

- **Admin console:** https://login.tailscale.com/admin/machines
  - Device shows as `rhc-kiosk-01`
  - Tailscale IP: `100.119.238.59`
  - From here you can see if the device is online, revoke access, or manage ACLs.

**Check Tailscale status on the Wyse:**

```bash
sudo tailscale status
```

**If Tailscale is offline after a network change:**

```bash
sudo systemctl restart tailscaled
sudo tailscale up
```

### GitHub — Source Code

Repository: https://github.com/Menziesii1/RHC-POS

This is where all kiosk, backend, and shared code lives. To pull the latest code onto the Wyse:

```bash
cd /home/rhc/rhc-pos
git pull
```

Then rebuild whichever workspace changed (see **Useful Commands** below).

### Railway — Backend & PIN Management

Railway hosts the production API and Postgres database.

- **Dashboard:** https://railway.app (log in with your account)
- **API base URL:** `https://rhc-posapi-production.up.railway.app/v1`
- **Lock-screen PIN** is set as an environment variable in the Railway service. Current PIN: `3388`. Change it in Railway → service → Variables.
- Redeploying on Railway does not affect the Wyse kiosk directly; the kiosk pulls from the live Railway URL at runtime.

### Deploying Code Changes to the Wyse

The Wyse does not auto-deploy. After pushing code to GitHub, SSH in and run the appropriate rebuild (see **Useful Commands**). The steps are:

1. SSH into the Wyse.
2. `cd /home/rhc/rhc-pos && git pull`
3. Run the relevant rebuild command.
4. The new build is live immediately — no reboot needed.

---

## Installed On Wyse

- Node.js `v24.14.1`
- npm `11.11.0`
- nginx
- Xorg / xinit / openbox
- Google Chrome stable `147.0.7727.55`
- Tailscale `1.96.4`
- `wpa_supplicant`
- Wi-Fi diagnostic tools: `iw`, `rfkill`

The POS repo was deployed to:

```text
/home/rhc/rhc-pos
```

The built frontend is served from:

```text
/var/www/rhc-pos
```

Local sync SQLite database path:

```text
/var/lib/rhc-pos/kiosk-sync.sqlite
```

## Services

These services are enabled:

- `nginx`
- `rhc-pos-kiosk-sync.service`
- `rhc-pos-kiosk.service`
- `tailscaled`

Main service files:

```text
/etc/systemd/system/rhc-pos-kiosk-sync.service
/etc/systemd/system/rhc-pos-kiosk.service
/usr/local/bin/rhc-kiosk-session
/etc/nginx/sites-available/rhc-pos
```

Expected service checks:

```bash
systemctl is-active nginx rhc-pos-kiosk-sync.service rhc-pos-kiosk.service tailscaled
systemctl is-enabled nginx rhc-pos-kiosk-sync.service rhc-pos-kiosk.service tailscaled
```

## Boot Behavior

On boot, the Wyse should:

1. Start Ubuntu Server.
2. Bring up networking.
3. Start Tailscale.
4. Start nginx.
5. Start the local kiosk sync service.
6. Start Xorg/Openbox.
7. Launch Chrome in kiosk mode.
8. Open `http://127.0.0.1/` full screen.

The physical display should show the RHC POS lock screen. The lock-screen PIN is configured in Railway; at time of setup it was set to `3388`.

The lock screen now supports physical keyboard input:

- Number keys enter PIN digits.
- `Enter` submits.
- `Backspace` / `Delete` removes a digit.
- `Escape` clears the PIN.

## Current Frontend Mode

The Wyse frontend was changed to mimic the known-good Docker Railway setup.

Current Wyse frontend env:

```text
VITE_API_BASE_URL=https://rhc-posapi-production.up.railway.app/v1
VITE_DEV_API_PROXY_TARGET=https://rhc-posapi-production.up.railway.app
VITE_REGISTER_ID=kiosk-register-1
VITE_ENABLE_CARD=true
VITE_ENABLE_ADMIN=true
```

This means the kiosk frontend currently talks directly to Railway for live operation. Card tender, split tender, admin tools, Stripe status, and reader status are expected to work the same as the Docker Railway setup.

## Local Sync Service State

The local sync service is still installed and running at:

```text
http://127.0.0.1:4100
```

nginx also has `/v1` proxy rules to the local sync service, but the deployed frontend currently bypasses that by using the full Railway URL.

Recent code changes added:

- `POST /v1/verify-lock-pin` pass-through in `apps/kiosk-sync`
- Remote API error status preservation via `HttpError`
- Live Railway bootstrap status pass-through so `reader` and `stripe` are not forced offline when Railway reports them as healthy
- Tests covering lock PIN forwarding and live status pass-through

Important limitation: the local sync service is not yet the final desired online-first backup architecture. It can cache bootstrap data and create/sync local cash orders, but the live frontend is currently using Railway directly.

## Desired Architecture

Target architecture:

```text
Wyse Chrome kiosk
  |
  | live POS API calls
  v
Railway API + Railway Postgres

Wyse local sync service
  |
  | local backup/cache only
  v
SQLite on Wyse

Wyse local sync service
  |
  | background sync/retry
  v
Railway API
```

The intended behavior is:

- Normal online use should hit Railway and support cards/admin.
- Local SQLite should retain enough data for backup/resilience.
- Offline card payments should not be attempted.
- Cash/local backup behavior should be explicit and safe.
- When internet returns, local records should sync back to Railway.

## What Has Been Done

- Installed Ubuntu Server on the Wyse.
- Fixed networking from the original bond/netplan issue.
- Set up SSH key access.
- Set up passwordless sudo for remote management.
- Installed Node/npm/nginx/Xorg/Openbox/Chrome/Tailscale.
- Deployed the POS repo to `/home/rhc/rhc-pos`.
- Built and deployed kiosk frontend to `/var/www/rhc-pos`.
- Configured nginx to serve the frontend.
- Configured systemd services for kiosk sync and physical kiosk browser.
- Set up Tailscale for remote access across changing networks.
- Set lock-screen PIN to `3388` through Railway.
- Restored card/admin frontend behavior by matching Docker Railway config.
- Fixed local sync service route/status issues in repo and deployed them to the Wyse.
- Added keyboard input support to the lock screen.
- Pushed code changes to GitHub.

## Wi-Fi State

The Wyse has Wi-Fi hardware:

```text
Interface: wlp0s12f0
Driver: iwlwifi
Hardware: Intel Gemini Lake PCH CNVi WiFi
MAC: e0:d4:e8:d7:03:ca
```

`wpa_supplicant`, `iw`, and `rfkill` are installed.

A netplan Wi-Fi config was added on the Wyse for the home SSID. Do not commit Wi-Fi passwords to the repo. The exact home SSID was corrected from the initial typo to:

```text
Ziply-2990
```

**Wi-Fi is not functional on this unit.** The internal antenna cables are not connected to the Wi-Fi card's antenna terminals. Without antennas, the card has effectively zero range. The hardware and driver work fine — it just can't hear anything.

The netplan config has the correct SSID (`Ziply-2990`) and password. If antennas are ever added, it should connect automatically.

To add a new network (e.g. at the church):

```bash
sudo nano /etc/netplan/50-cloud-init.yaml
# add another entry under access-points:
#   "ChurchSSID":
#     password: "churchpassword"
sudo netplan apply
```

**Recommended: use Ethernet at the church.** More reliable for a POS and avoids antenna/signal concerns entirely.

Useful Wi-Fi diagnostics:

```bash
rfkill list
ip -br addr show wlp0s12f0
networkctl status wlp0s12f0 --no-pager
journalctl -u netplan-wpa-wlp0s12f0.service -n 120 --no-pager
sudo iw dev wlp0s12f0 scan | awk '/signal:|SSID:/{print}'
```

Current netplan file on the Wyse:

```text
/etc/netplan/50-cloud-init.yaml
```

Backups were created under `/etc/netplan/`.

## Remaining Work

1. ~~Finish Wi-Fi verification~~ — Wi-Fi is not usable (no antenna cables connected). Use Ethernet at the church.

2. Reboot-test after all current changes.
   - Confirm `rhc-pos-kiosk.service` starts automatically.
   - Confirm Chrome opens full-screen.
   - Confirm keyboard PIN entry works on the physical display.
   - Confirm Tailscale returns after reboot.

3. Implement final online-first local backup architecture.
   - Keep card/admin/Railway behavior online.
   - Add local SQLite backup writes without breaking card payments.
   - Sync queued local backup data to Railway.
   - Avoid offline card payments.

4. Decide church network strategy.
   - Preferred: Ethernet if available.
   - Wi-Fi is possible if hardware/signal is stable.
   - Tailscale should remain enabled for remote maintenance.

## Useful Commands

Check services:

```bash
systemctl status rhc-pos-kiosk.service --no-pager -l
systemctl status rhc-pos-kiosk-sync.service --no-pager -l
systemctl status nginx --no-pager -l
```

Restart kiosk browser:

```bash
sudo systemctl restart rhc-pos-kiosk.service
```

Restart local sync:

```bash
sudo systemctl restart rhc-pos-kiosk-sync.service
```

Check local web app:

```bash
curl -fsS http://127.0.0.1/health
curl -fsS https://rhc-posapi-production.up.railway.app/v1/bootstrap
```

Rebuild frontend on Wyse:

```bash
cd /home/rhc/rhc-pos
npm run build --workspace @rhc-pos/kiosk
sudo rm -rf /var/www/rhc-pos/*
sudo cp -r apps/kiosk/dist/. /var/www/rhc-pos/
sudo systemctl reload nginx
sudo systemctl restart rhc-pos-kiosk.service
```

Rebuild local sync service on Wyse:

```bash
cd /home/rhc/rhc-pos
npm run build --workspace @rhc-pos/kiosk-sync
sudo systemctl restart rhc-pos-kiosk-sync.service
```

