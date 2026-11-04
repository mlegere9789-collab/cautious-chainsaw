#!/usr/bin/env python3
"""Page group PG-zfix (Release 1 round 4, acceptance attempt 2): fixes of defects the acceptance runs found.

/watch-together never closes a Live Sync connection that is still being opened.

Found by the acceptance run (check 4, phone /watch-together, "input-console-warning"): the input matrix activates "Host a session" more than once (click, then Enter).  startHost() and startJoin() destroyed the previous
peer at once; when that peer's WebSocket to the public broker was still connecting (a broker answer slower than the gap between the two activations, 1 s or more here), the browser logged
"WebSocket connection to 'wss://0.peerjs.com/...' failed: WebSocket is closed before the connection is established".  A visitor who double-clicks Host gets the same console warning.
Fix: a peer that has not opened yet is retired (destroyed) when it opens or fails, never while it is connecting, and the handlers of a retired peer do nothing to the page (they test that the peer is still the current one).
Everything else (status texts, codes, order of events) is as before.

    python tools/t0/r1f/gen_zfix.py            write tools/t0/patches-next/PG-zfix.json
    python tools/t0/r1f/gen_zfix.py --check    exit 1 when the written file differs from what this script generates
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'patches-next', 'PG-zfix.json')
T = 'watch-together.html'

P = []


def add(pid, find, repl, note):
    P.append({'id': pid, 'target': T, 'find': find, 'repl': repl, 'expect': 1, 'note': note})


def add2(pid, target, find, repl, note):
    P.append({'id': pid, 'target': target, 'find': find, 'repl': repl, 'expect': 1, 'note': note})


add('R1F-wt-retire-fn',
    "  document.getElementById('host-btn').addEventListener('click', () => {\n    setSyncStatus('connecting…', 'connecting');\n    withPeerJs(startHost);",
    "  // R1F: a peer whose connection to the broker is still being opened is destroyed once it has opened or failed, not while it connects (closing a connecting WebSocket makes the browser log a warning)\n"
    "  function retirePeer(p) {\n"
    "    if (!p) return;\n"
    "    if (p.open || p.destroyed || p.disconnected) { p.destroy(); return; }\n"
    "    const settle = () => { try { p.destroy(); } catch (e) {} };\n"
    "    p.on('open', settle); p.on('error', settle); p.on('disconnected', settle);\n"
    "  }\n\n"
    "  document.getElementById('host-btn').addEventListener('click', () => {\n    setSyncStatus('connecting…', 'connecting');\n    withPeerJs(startHost);",
    'the helper, placed before the Host handler')
add('R1F-wt-host-retire',
    "    if (peer) peer.destroy();\n    isHost = true; connections = [];",
    "    retirePeer(peer);\n    isHost = true; connections = [];",
    'startHost retires the previous peer without closing a connecting socket')
add('R1F-wt-host-me',
    "    peer = new Peer('gtbg-wt-' + code);\n    peer.on('open', () => {\n      setSyncStatus('hosting",
    "    const me = peer = new Peer('gtbg-wt-' + code);\n    peer.on('open', () => {\n      if (peer !== me) return;\n      setSyncStatus('hosting",
    'the handlers of a retired host peer do not touch the page')
add('R1F-wt-host-error',
    "    peer.on('error', (err) => setSyncStatus('connection error — try again', 'error'));",
    "    peer.on('error', (err) => { if (peer === me) setSyncStatus('connection error — try again', 'error'); });",
    'a retired host peer reports no error')
add('R1F-wt-join-retire',
    "    if (peer) peer.destroy();\n    isHost = false; connections = [];",
    "    retirePeer(peer);\n    isHost = false; connections = [];",
    'startJoin retires the previous peer without closing a connecting socket')
add('R1F-wt-join-me',
    "    peer = new Peer();\n    peer.on('open', () => {\n      const conn = peer.connect(",
    "    const me = peer = new Peer();\n    peer.on('open', () => {\n      if (peer !== me) return;\n      const conn = peer.connect(",
    'the handlers of a retired joining peer do not touch the page')
add('R1F-wt-join-error',
    "    peer.on('error', () => setSyncStatus('could not connect — check the code', 'error'));\n  }",
    "    peer.on('error', () => { if (peer === me) setSyncStatus('could not connect — check the code', 'error'); });\n  }",
    'a retired joining peer reports no error')

OBJ = {
    'group': 'PG-zfix',
    'description': 'Release 1 round 4 acceptance fixes: /watch-together does not close a Live Sync connection while it is still being opened (no console warning on a repeated Host or Join); sorts after PG-zperf5',
    'train': 'R1f',
    'patches': P,
}


def main(argv):
    text = json.dumps(OBJ, indent=1, ensure_ascii=False) + '\n'
    if '--check' in argv:
        cur = open(OUT, encoding='utf-8', newline='').read() if os.path.isfile(OUT) else None
        print('differs' if cur != text else 'differs: (nothing)')
        return 1 if cur != text else 0
    open(OUT, 'w', encoding='utf-8', newline='').write(text)
    print('wrote', os.path.relpath(OUT), len(P), 'patches')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
