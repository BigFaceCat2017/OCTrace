#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# ============================
# Created By  : BigFaceCat
# Created Date: 2020-01-11
# ============================

import frida
import sys



global session

def on_message(message, data):
    print("[{}] => {}".format(message, data))

def trace(target_process, is_usb=False):
    if is_usb:
        device = frida.get_usb_device()
        session = device.attach(target_process)
    else:
        session = frida.attach(target_process)
    # session1 = frida.spawn(target_process)
    name = "octrace.js"
    with open(name) as f:
        content = f.read()
        script = session.create_script(content)
    script.on("message", on_message)
    script.load()
    print("[!] Ctrl+D or Ctrl+Z to detach from instrumented program.\n\n")
    try:
        sys.stdin.read()
        session.detach()
    except KeyboardInterrupt:
        print("Stoped")
        if session:
            session.detach()
            sys.exit()
        else:
            pass
    finally:
        pass

if __name__ == "__main__":
    trace("微信")
