import { keccak256, toUtf8Bytes } from 'ethers';

export const ERC20_MARKETING_FEE = keccak256(toUtf8Bytes('ERC20_MARKETING_FEE'));
export const ERC20_REWARD_FEE = keccak256(toUtf8Bytes('ERC20_REWARD_FEE'));
export const ERC20_PLATFORM_FEE = keccak256(toUtf8Bytes('ERC20_PLATFORM_FEE'));
export const ERC20_DEVELOPER_FEE = keccak256(toUtf8Bytes('ERC20_DEVELOPER_FEE'));
export const DEPLOYER_STAKEX_FEE = keccak256(toUtf8Bytes('DEPLOYER_STAKEX_FEE'));
