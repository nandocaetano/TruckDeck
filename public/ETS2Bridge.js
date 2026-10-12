/* =====================================================================
   ETS2Bridge — talks to the PC bridge (bridge/server.js) over plain HTTP + SSE.
     PC -> app : GET  <url>/api/events?pin=…   Server-Sent Events (telemetry + media)
     app -> PC : POST <url>/api/key            {action:'tap'|'down'|'up', keys:[…]}
   No dependencies. COMMAND names (PARK_BRAKE…) are translated to key names with `keymap`.

   Events:  on('status', s)     s = 'connecting' | 'online' | 'offline'
            on('telemetry', t)  latest telemetry object ({sdk:false} while offline)
            on('media', m)      {running, playing, artist, track}
            on('latency', ms)   round-trip of the last key POST (for testing the link)
            on('error', msg)
   Commands: press(cmd) / release(cmd) / tap(cmd)
   ===================================================================== */
class ETS2Bridge {
  constructor(opts = {}) {
    this.opts = Object.assign({
      url: 'http://localhost:8765',      // the PC bridge; on a tablet use http://<PC-IP>:8765
      pin: '',
      keymap: {},                        // COMMAND -> ['key', ...]
      backoff: { min: 500, max: 15000, factor: 2, jitter: 0.3 },
      EventSourceImpl: typeof EventSource !== 'undefined' ? EventSource : null,
      fetchImpl: typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null,
    }, opts);
    this._h = {};                        // event handlers
    this._status = 'offline';
    this._tel = { sdk: false };
    this._media = null;
    this._attempt = 0;
    this._timer = null;
    this._es = null;                     // current EventSource
    this._closed = true;                 // true until connect() is called
    this._chain = Promise.resolve();     // keeps key POSTs in order: a press can never overtake its release
    this._wake = () => { if (!this._closed && this._status === 'offline') this._retryNow(); };
  }

  /* ---------- public API ---------- */
  get status() { return this._status; }
  get telemetry() { return this._tel; }
  get media() { return this._media; }

  on(evt, fn) {                          // returns an unsubscribe function
    (this._h[evt] = this._h[evt] || new Set()).add(fn);
    return () => this._h[evt].delete(fn);
  }

  connect(url) {
    if (url) this.opts.url = url;
    this._teardown();
    this._closed = false;
    this._attempt = 0;
    if (typeof window !== 'undefined') {           // retry at once when the network returns or the tab wakes up
      window.addEventListener('online', this._wake);
      document.addEventListener('visibilitychange', this._wake);
    }
    this._open();
  }

  close() {
    this._closed = true;
    this._teardown();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this._wake);
      document.removeEventListener('visibilitychange', this._wake);
    }
    this._setStatus('offline');
    this._setTel({ sdk: false });
  }

  press(command)   { return this._key(command, 'down'); }
  release(command) { return this._key(command, 'up'); }
  tap(command)     { return this._key(command, 'tap'); }   // the server holds the key for its own TAP_MS

  /* ---------- connection ---------- */
  _base() { return this.opts.url.replace(/\/+$/, ''); }

  _open() {
    if (this._closed) return;
    this._setStatus('connecting');
    let es;
    try { es = new this.opts.EventSourceImpl(this._base() + '/api/events?pin=' + encodeURIComponent(this.opts.pin || '')); }
    catch (e) { this._lost(); return; }
    this._es = es;
    es.onopen = () => { if (this._es === es) { this._attempt = 0; this._setStatus('online'); } };
    es.onmessage = (e) => this._onMessage(e.data);
    es.onerror = () => {
      // EventSource would retry every ~3 s with no backoff: close it and schedule our own retry.
      if (this._es !== es) return;
      es.close(); this._es = null; this._lost();
    };
  }

  _lost() {
    if (this._closed) return;
    this._setStatus('offline');
    this._setTel({ sdk: false });                  // stale lamps would lie: fall back to "no telemetry"
    const b = this.opts.backoff;
    const base = Math.min(b.max, b.min * Math.pow(b.factor, this._attempt++));
    const delay = Math.round(base * (1 + (Math.random() * 2 - 1) * b.jitter));   // jitter avoids reconnect storms
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this._open(), delay);
  }

  _retryNow() { clearTimeout(this._timer); this._attempt = 0; this._open(); }

  _teardown() {
    clearTimeout(this._timer);
    const es = this._es; this._es = null;
    if (es) { try { es.close(); } catch (e) { /* already closed */ } }
  }

  /* ---------- outgoing ---------- */
  _key(command, action) {
    if (this._status !== 'online') return false;   // never queue key presses: a late "down" would be dangerous
    const keys = this.opts.keymap[command];
    if (!keys) { this._emit('error', 'No key bound to ' + command); return false; }
    this._chain = this._chain.then(() => {
      const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
      return this.opts.fetchImpl(this._base() + '/api/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Pin': this.opts.pin || '' },
        body: JSON.stringify({ action, keys }),
      }).then((r) => {
        if (r.status === 401) this._emit('error', 'Wrong PIN');
        else this._emit('latency', Math.round((typeof performance !== 'undefined' ? performance : Date).now() - t0));
      }, () => { /* network drop: the event stream notices and reconnects */ });
    });
    return true;
  }

  /* ---------- incoming ---------- */
  _onMessage(raw) {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.type === 'tel') this._setTel(m);
    else if (m.type === 'media') { this._media = m; this._emit('media', m); }
    else if (m.type === 'error') this._emit('error', m.msg || 'bridge error');
  }

  _setTel(t) { this._tel = t; this._emit('telemetry', t); }
  _setStatus(s) { if (s !== this._status) { this._status = s; this._emit('status', s); } }
  _emit(evt, arg) { (this._h[evt] || []).forEach((fn) => { try { fn(arg); } catch (e) { console.error(e); } }); }
}
if (typeof module !== 'undefined' && module.exports) module.exports = ETS2Bridge;
