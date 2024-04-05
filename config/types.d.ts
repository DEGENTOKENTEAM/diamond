import { Config } from './config';
import { ProtocolConfig } from './protocols';
declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    diamond: {
      getConfig: () => Promise<Config>;
      getProtocols: () => Promise<ProtocolConfig>;
    };
  }
}
