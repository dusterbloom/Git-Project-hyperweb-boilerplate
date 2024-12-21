// src/bluesky-registry/index.ts
var BlueskyRegistry = class {
  state;
  constructor(state) {
    this.state = state;
  }
  /**
   * Register a Bluesky handle -> publicKey mapping.
   * Throws an error if this handle is already registered.
   */
  registerBlueskyHandle({ handle, publicKey }) {
    if (this.state.get(`bluesky/${handle}`)) {
      throw Error(`Handle "${handle}" is already registered.`);
    }
    this.state.set(`bluesky/${handle}`, publicKey);
    return `Registered handle: ${handle}`;
  }
  /**
   * Query the publicKey for a given Bluesky handle.
   * Throws an error if the handle isn't registered.
   */
  getPublicKeyForHandle({ handle }) {
    const storedPk = this.state.get(`bluesky/${handle}`);
    if (!storedPk) {
      throw Error(`No public key found for handle: ${handle}`);
    }
    return storedPk;
  }
};
export {
  BlueskyRegistry as default
};
//# sourceMappingURL=blueskyRegistry.js.map
