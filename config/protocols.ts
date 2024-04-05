import { HardhatRuntimeEnvironment } from 'hardhat/types';
import {
  NETWORK_HARDHAT,
  NETWORK_LOCALFORK,
  NETWORK_LOCALHOST,
  NETWORK_MAINNET_AVAX,
  NETWORK_MAINNET_ETH,
} from '../utils/networks';
import { ZeroAddress } from 'ethers';

type ContractData = {
  address: string;
  abi?: any;
};

type ExternalOwnedAccountData = {
  address: string;
};

export type ProtocolConfig = {
  contracts: {
    celer: {
      cbridge: ContractData;
      messagebus: ContractData;
    };
    degenx: {
      router: ContractData;
      platform?: ContractData;
      baseToken?: ContractData;
      marketing?: ContractData;
      nativeWrapper: ContractData;
      lpTokenReceiver: ContractData;
      liquidityBacking?: ContractData;
    };
  };
  accounts: {
    operator: ExternalOwnedAccountData;
    development: ExternalOwnedAccountData;
  };
};

const baseData: ProtocolConfig = {
  contracts: {
    celer: {
      cbridge: { address: ZeroAddress },
      messagebus: { address: ZeroAddress },
    },
    degenx: {
      router: { address: ZeroAddress },
      platform: { address: ZeroAddress },
      baseToken: { address: ZeroAddress },
      marketing: { address: ZeroAddress },
      nativeWrapper: { address: ZeroAddress },
      lpTokenReceiver: { address: ZeroAddress },
      liquidityBacking: { address: ZeroAddress },
    },
  },
  accounts: {
    operator: { address: ZeroAddress },
    development: { address: ZeroAddress },
  },
};

const protocols: { [network: string]: ProtocolConfig } = {
  [NETWORK_MAINNET_AVAX]: {
    contracts: {
      celer: {
        cbridge: { address: '0xef3c714c9425a8F3697A9C969Dc1af30ba82e5d4' },
        messagebus: { address: '0x5a926eeeAFc4D217ADd17e9641e8cE23Cd01Ad57' },
      },
      degenx: {
        router: { address: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4' },
        platform: { address: '0xcA01A9d36F47561F03226B6b697B14B9274b1B10' },
        baseToken: { address: '0x51e48670098173025C477D9AA3f0efF7BF9f7812' },
        marketing: { address: '0x16eF18E42A7d72E52E9B213D7eABA269B90A4643' },
        nativeWrapper: { address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7' },
        lpTokenReceiver: { address: '0xcA01A9d36F47561F03226B6b697B14B9274b1B10' },
        liquidityBacking: { address: '0x62320b483C422112DE64f3F621A3f57B993029C9' },
      },
    },
    accounts: {
      operator: { address: '0x9999999b3234cdd43fd52e51c579595ee0799999' },
      development: { address: '0xdF090f6675034Fde637031c6590FD1bBeBc4fa45' },
    },
  },
  [NETWORK_MAINNET_ETH]: {
    contracts: {
      celer: {
        cbridge: { address: '0x5427FEFA711Eff984124bFBB1AB6fbf5E3DA1820' },
        messagebus: { address: '0x4066D196A423b2b3B8B054f4F40efB47a74E200C' },
      },
      degenx: {
        router: { address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' },
        baseToken: { address: '0x0000000000300dd8B0230efcfEf136eCdF6ABCDE' }, // TODO automatisch ermitteln auf Basis von den deployten Contracts
        nativeWrapper: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
        lpTokenReceiver: { address: '0x9cC48448ba8276640c8a77eeAE29063B697474d1' },
      },
    },
    accounts: {
      operator: { address: '0x9999999b3234cdd43fd52e51c579595ee0799999' },
      development: { address: '0xdF090f6675034Fde637031c6590FD1bBeBc4fa45' },
    },
  },
  [NETWORK_LOCALHOST]: { ...baseData },
  [NETWORK_HARDHAT]: { ...baseData },
  [NETWORK_LOCALFORK]: { ...baseData },
};

export default async function (hre: HardhatRuntimeEnvironment) {
  return protocols[hre.network.name];
}
