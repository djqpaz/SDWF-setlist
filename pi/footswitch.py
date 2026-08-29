#!/usr/bin/env python3
"""
Footswitch bridge for the stage prompter.

Reads three momentary switches on the Pi's GPIO header and emits keyboard
events, so the browser-based prompter needs no special drivers:

    SWITCH 1 (GPIO 17) -> Left Arrow    (BACK)
    SWITCH 2 (GPIO 27) -> Enter         (SELECT)
    SWITCH 3 (GPIO 22) -> Right Arrow   (NEXT)

Long presses are handled inside the app itself (it measures key down/up),
so this script just needs to hold the key down while the switch is held.

Wiring: each switch connects its GPIO pin to any GND pin. No resistors
needed - the internal pull-ups are enabled below. Use shielded cable or
keep the run short; a 100nF cap across each switch helps on long cables.

Install:
    sudo apt install python3-gpiozero python3-evdev
    sudo usermod -aG input,gpio $USER      # then log out and back in
"""

import signal
import sys
import time

from gpiozero import Button
from evdev import UInput, ecodes as e

PINS = {17: e.KEY_LEFT, 27: e.KEY_ENTER, 22: e.KEY_RIGHT}
DEBOUNCE_S = 0.025

ui = UInput({e.EV_KEY: list(PINS.values())}, name="prompter-footswitch")


def press(code):
    ui.write(e.EV_KEY, code, 1)
    ui.syn()


def release(code):
    ui.write(e.EV_KEY, code, 0)
    ui.syn()


buttons = []
for pin, code in PINS.items():
    b = Button(pin, pull_up=True, bounce_time=DEBOUNCE_S)
    b.when_pressed = (lambda c: lambda: press(c))(code)
    b.when_released = (lambda c: lambda: release(c))(code)
    buttons.append(b)


def shutdown(*_):
    for code in PINS.values():
        release(code)
    ui.close()
    sys.exit(0)


signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)

print("footswitch bridge running: GPIO 17/27/22 -> LEFT/ENTER/RIGHT")
while True:
    time.sleep(1)
