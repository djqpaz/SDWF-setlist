# Stage Prompter — Raspberry Pi setup

Goal: Pi boots straight into the prompter, portrait, full screen, footswitch working, no keyboard needed.

Tested target: Raspberry Pi 4 or 5, Raspberry Pi OS (Bookworm) with desktop. A Pi 3B+ works but is slower to boot.

## Files in this folder

| File | What it is |
| --- | --- |
| `prompter.html` | The whole app in one self-contained file. No internet needed — fonts are embedded. |
| `footswitch.py` | Reads the three switches on the GPIO header and emits keystrokes. |
| `footswitch.service` | systemd unit so the bridge starts at boot. |
| `kiosk.sh` | Launches Chromium full-screen on the app. |

## 1. Copy the files onto the Pi

From your laptop:

```
scp -r pi/ pi@raspberrypi.local:/home/pi/prompter
```

Or put them on a USB stick and copy to `/home/pi/prompter`.

Then on the Pi:

```
chmod +x /home/pi/prompter/kiosk.sh
```

## 2. Wire the footswitch

Three momentary (normally-open) switches. Each one connects a GPIO pin to any ground pin — that's it, no resistors, the script enables the internal pull-ups.

| Switch | GPIO (BCM) | Physical pin | Action |
| --- | --- | --- | --- |
| 1 — BACK | 17 | 11 | previous section |
| 2 — SELECT | 27 | 13 | set list / menu |
| 3 — NEXT | 22 | 15 | next section |

Ground: physical pin 9, 14, 20, 25, 30, 34 or 39 — any of them.

Most 3-button pedals terminate in a TRS jack or a DB9. Break it out so each switch gets its own GPIO and they share the common ground. If your pedal is momentary-latching (stays down), it won't work — you need momentary.

Long press (hold ~0.7s) is handled in the app: BACK = top of song, SELECT = main menu, NEXT = skip song.

## 3. Install the bridge

```
sudo apt update
sudo apt install -y python3-gpiozero python3-evdev
sudo usermod -aG input,gpio pi
sudo cp /home/pi/prompter/footswitch.service /etc/systemd/system/
sudo systemctl enable --now footswitch
systemctl status footswitch
```

Test before going further: open a text editor on the Pi and stomp the switches. You should see the cursor move left/right and Enter fire. If nothing happens, check `journalctl -u footswitch -f`.

## 4. Rotate the display to portrait

The app is designed for a portrait screen (it also scales to landscape, just with wasted space).

**Bookworm / Wayland (default):**

```
wlr-randr --output HDMI-A-1 --transform 90
```

Make it permanent in `~/.config/labwc/autostart` (add the same line), or use *Preferences → Screen Configuration* in the desktop and set the orientation there.

**Older X11 / Legacy:** add to `/boot/firmware/config.txt`:

```
display_rotate=1
```

Also worth setting in `raspi-config`: *System → Boot* → **Desktop autologin**.

## 5. Autostart the app

Create `~/.config/autostart/prompter.desktop`:

```
[Desktop Entry]
Type=Application
Name=Prompter
Exec=/home/pi/prompter/kiosk.sh
X-GNOME-Autostart-enabled=true
```

Reboot. You should land in the prompter's main menu with no cursor and no browser chrome.

To get out during setup: plug in a keyboard, `Alt+F4`, or SSH in and `pkill chromium`.

## 6. Stage checklist

- Hide the mouse cursor: `sudo apt install unclutter` then add `unclutter -idle 0 &` to the autostart file.
- Disable screen blanking: `raspi-config → Display Options → Screen Blanking → off`.
- Turn the desktop wallpaper black so any flash between boot and app launch is invisible.
- Boot time to prompter is roughly 25–35s on a Pi 4. Power it up before doors.
- The library and all settings live in the browser's local storage on the Pi. Use **Storage → Export Library** to pull a JSON backup onto a USB stick.

## Known limits of this build

- Editing lyrics on the Pi needs a keyboard. Fine for setup, awkward at soundcheck.
- One screen only. Multi-screen sync for the other players is the next piece of work.
- Auto-advance is a fixed timer per section, not tempo-locked.
- No MIDI or Ableton sync.
