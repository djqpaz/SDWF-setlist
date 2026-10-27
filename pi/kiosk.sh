#!/usr/bin/env bash
# Launch the prompter full-screen in Chromium kiosk mode.
# Called from the desktop autostart (see SETUP-PI.md).

APP="/home/sdwf/prompter/prompter.html"
PROFILE="/home/sdwf/.prompter-chrome"
LIBRARY="/home/sdwf/prompter/library.json"
LIBRARY_URL="https://djqpaz.github.io/SDWF-setlist/library.json"

# Pull the latest setlist from the website (fail silently — use cached copy if offline).
wget -q --timeout=10 -O "$LIBRARY.tmp" "$LIBRARY_URL" \
  && mv "$LIBRARY.tmp" "$LIBRARY" \
  || { echo "library sync skipped (offline or failed)"; rm -f "$LIBRARY.tmp"; }

# Keep the screen awake.
if command -v wlr-randr >/dev/null 2>&1; then
  :  # Wayland: blanking is handled by the compositor config
else
  xset s off; xset -dpms; xset s noblank
fi

# Suppress the "restore pages?" bar after a hard power-off.
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/; s/"exited_cleanly":false/"exited_cleanly":true/' \
  "$PROFILE/Default/Preferences" 2>/dev/null || true

CHROMIUM=$(command -v chromium || command -v chromium-browser)
exec "$CHROMIUM" \
  --kiosk \
  --user-data-dir="$PROFILE" \
  --start-fullscreen \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --autoplay-policy=no-user-gesture-required \
  --overscroll-history-navigation=0 \
  "file://$APP"
