export interface State {
  get(key: string): string;
  set(key: string, value: any): void;
}

export interface RegistryArgs {
  handle: string;
  publicKey: string;
}

export default class BlueskyRegistry {
  state: State;

  constructor(state: State) {
    this.state = state;
  }

  /**
   * Register a Bluesky handle -> publicKey mapping.
   * Throws an error if this handle is already registered.
   */
  registerBlueskyHandle({ handle, publicKey }: RegistryArgs): string {
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
  getPublicKeyForHandle({ handle }: { handle: string }): string {
    const storedPk = this.state.get(`bluesky/${handle}`);
    if (!storedPk) {
      throw Error(`No public key found for handle: ${handle}`);
    }
    return storedPk;
  }
}
