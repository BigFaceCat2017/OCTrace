#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# ============================
# Created By  : BigFaceCat
# Created Date: 2020-01-11
# ============================

import frida
import threading
import time
import sys
import argparse
import codecs
import subprocess
import os



global session

def on_message(message, data):
    print("[{}] => {}".format(message, data))

def main(target_process):
    frida.get_remote_device()
    session = frida.attach(target_process)
    jscript = "octrace.js"
    with open(jscript) as f:
        script = session.create_script(f.read())

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
    main("微信")
