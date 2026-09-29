/**
 * Lifetime of the GPU resources the kit shares between views. Materials and
 * geometries are created once and reused by every part, then disposed when
 * the last Stage unmounts.
 *
 * Disposal waits one tick. On a route change React unmounts the old stage
 * before it mounts the new one, and the new tree has already rendered with
 * the cached objects, so an immediate dispose would throw away exactly what
 * the incoming stage is about to draw.
 */
type Disposer = () => void;

const disposers = new Set<Disposer>();
let users = 0;
let pending: ReturnType<typeof setTimeout> | null = null;

/** Caches call this once so they are emptied with everything else. */
export function registerDisposer(dispose: Disposer) {
  disposers.add(dispose);
}

/** Called by each Stage on mount. */
export function retainResources() {
  users += 1;
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
}

/** Called by each Stage on unmount. The last one out frees the GPU memory. */
export function releaseResources() {
  users = Math.max(0, users - 1);
  if (users > 0 || pending) return;
  pending = setTimeout(() => {
    pending = null;
    if (users === 0) disposers.forEach((dispose) => dispose());
  }, 0);
}
