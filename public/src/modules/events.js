/**
 * Simple Pub/Sub EventBus.
 * Leak-proof: returns an unsubscribe function.
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event).delete(callback);
    };
  }

  emit(event, payload = null) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(payload);
        } catch (e) {
          console.error(`Error in EventBus listener for ${event}:`, e);
        }
      }
    }
  }

  clear() {
    this.listeners.clear();
  }
}

export const events = new EventBus();
