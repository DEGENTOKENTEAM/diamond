import { ZeroAddress } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { diamondContractName } from '../utils/diamond';
import {
  NETWORK_HARDHAT,
  NETWORK_LOCALFORK,
  NETWORK_LOCALHOST,
  NETWORK_MAINNET_AVAX,
  NETWORK_MAINNET_ETH,
} from '../utils/networks';

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
      nativeWrapper: ContractData;
      lpTokenReceiver: ContractData;
      btcb?: ContractData;
      wethe?: ContractData;
      savax?: ContractData;
      platform?: ContractData;
      baseToken?: ContractData;
      marketing?: ContractData;
      liquidityBacking?: ContractData;
      liquidityBackingVault?: ContractData;
    };
  };
  accounts: {
    operator: ExternalOwnedAccountData;
    development: ExternalOwnedAccountData;
    liquidityBackingDeployer?: ExternalOwnedAccountData;
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
      nativeWrapper: { address: ZeroAddress },
      lpTokenReceiver: { address: ZeroAddress },
      btcb: { address: ZeroAddress },
      wethe: { address: ZeroAddress },
      savax: { address: ZeroAddress },
      platform: { address: ZeroAddress },
      baseToken: { address: ZeroAddress },
      marketing: { address: ZeroAddress },
      liquidityBacking: { address: ZeroAddress },
      liquidityBackingVault: { address: ZeroAddress },
    },
  },
  accounts: {
    operator: { address: ZeroAddress },
    development: { address: ZeroAddress },
    liquidityBackingDeployer: { address: ZeroAddress },
  },
};

const baseDataAvax: ProtocolConfig = {
  contracts: {
    celer: {
      cbridge: { address: '0xef3c714c9425a8F3697A9C969Dc1af30ba82e5d4' },
      messagebus: { address: '0x5a926eeeAFc4D217ADd17e9641e8cE23Cd01Ad57' },
    },
    degenx: {
      router: { address: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4' },
      nativeWrapper: { address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7' },
      lpTokenReceiver: { address: '0xcA01A9d36F47561F03226B6b697B14B9274b1B10' },
      btcb: { address: '0x152b9d0FdC40C096757F570A51E494bd4b943E50' },
      wethe: { address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB' },
      savax: { address: '0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE' },
      platform: { address: '0xcA01A9d36F47561F03226B6b697B14B9274b1B10' },
      baseToken: { address: '0x51e48670098173025C477D9AA3f0efF7BF9f7812' },
      marketing: { address: '0x16eF18E42A7d72E52E9B213D7eABA269B90A4643' },
      liquidityBacking: { address: '0x62320b483C422112DE64f3F621A3f57B993029C9' },
      liquidityBackingVault: { address: '0x878a903310298c73182A91C988b5e8b26A59131A' },
    },
  },
  accounts: {
    operator: { address: '0x9999999b3234cdd43fd52e51c579595ee0799999' },
    development: { address: '0xdF090f6675034Fde637031c6590FD1bBeBc4fa45' },
    liquidityBackingDeployer: { address: '0xbf86bCaf4D396c9927c0b55d9789ecC406309e3b' },
  },
};

const protocols: { [network: string]: ProtocolConfig } = {
  [NETWORK_MAINNET_AVAX]: { ...baseDataAvax },
  [NETWORK_MAINNET_ETH]: {
    contracts: {
      celer: {
        cbridge: { address: '0x5427FEFA711Eff984124bFBB1AB6fbf5E3DA1820' },
        messagebus: { address: '0x4066D196A423b2b3B8B054f4F40efB47a74E200C' },
      },
      degenx: {
        router: { address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' },
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
  [NETWORK_HARDHAT]: { ...baseDataAvax },
  [NETWORK_LOCALFORK]: { ...baseData },
};

export default async function (hre: HardhatRuntimeEnvironment) {
  const protocol = protocols[hre.network.name];

  if (hre.network.name !== NETWORK_MAINNET_AVAX) {
    protocol.contracts = {
      ...protocol.contracts,
      degenx: {
        ...protocol.contracts.degenx,
        baseToken: {
          address: await (await hre.ethers.getContract(diamondContractName())).getAddress(),
        },
      },
    };
  }

  return protocols[hre.network.name];
}
