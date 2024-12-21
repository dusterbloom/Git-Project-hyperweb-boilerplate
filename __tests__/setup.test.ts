import path from 'path';
import { ConfigContext, useRegistry } from 'starshipjs';

beforeAll(async () => {
  const configFile = path.join(__dirname, '..', 'configs', 'local.yaml');
  ConfigContext.setConfigFile(configFile);
  ConfigContext.setRegistry(await useRegistry(configFile));
});
