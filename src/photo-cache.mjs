/** Memory-only cache owned by one gallery; released when its view closes. */
export function createPhotoCache() {
  const entries = new Map();
  let disposed = false, leases = 0;
  function load(url) {
    if (disposed) return Promise.reject(new Error('Gallery closed'));
    if (entries.has(url)) return entries.get(url).promise;
    const controller = new AbortController();
    const entry = {controller, objectUrl: null, promise: null};
    const timer = setTimeout(() => controller.abort(), 15000);
    entry.promise = (async () => {
      const local = new URL(url, location.href).origin === location.origin;
      let source = url;
      if (local) {
        const response = await fetch(url, {signal: controller.signal});
        if (!response.ok) throw new Error('Photo unavailable');
        const blob = await response.blob();
        if (!blob.type.startsWith('image/') || blob.size > 12000000) throw new Error('Invalid photograph');
        if (disposed || controller.signal.aborted) throw new Error('Gallery closed');
        source = entry.objectUrl = URL.createObjectURL(blob);
      }
      const image = new Image();
      image.decoding = 'async';
      image.src = source;
      await new Promise((resolve, reject) => {
        const abort = () => {image.src = ''; reject(new Error('Photo timeout'));};
        if (controller.signal.aborted) {abort(); return;}
        controller.signal.addEventListener('abort', abort, {once: true});
        image.decode().then(resolve, reject).finally(() => controller.signal.removeEventListener('abort', abort));
      });
      if (disposed || controller.signal.aborted) throw new Error('Gallery closed');
      return source;
    })().catch(error => {
      if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
      if (entries.get(url) === entry) entries.delete(url);
      throw error;
    }).finally(() => clearTimeout(timer));
    entries.set(url, entry);
    return entry.promise;
  }
  const api = {load, retain() {
    leases++;
    return () => {leases--; queueMicrotask(() => {if (!leases) api.dispose();});};
  }, dispose() {
    disposed = true;
    for (const entry of entries.values()) {
      entry.controller.abort();
      if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
    }
    entries.clear();
  }};
  return api;
}
