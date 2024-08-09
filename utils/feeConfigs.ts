import { keccak256, toUtf8Bytes } from 'ethers';

export const ERC20_MARKETING_FEE = keccak256(toUtf8Bytes('ERC20_MARKETING_FEE'));
export const ERC20_REWARD_FEE = keccak256(toUtf8Bytes('ERC20_REWARD_FEE'));
export const ERC20_PLATFORM_FEE = keccak256(toUtf8Bytes('ERC20_PLATFORM_FEE'));
export const ERC20_DEVELOPER_FEE = keccak256(toUtf8Bytes('ERC20_DEVELOPER_FEE'));

// needs to be added because there are breaking changes in the fee calculation
export const ERC20_MARKETING_FEE_V2 = keccak256(toUtf8Bytes('ERC20_MARKETING_FEE_V2'));
export const ERC20_REWARD_FEE_V2 = keccak256(toUtf8Bytes('ERC20_REWARD_FEE_V2'));
export const ERC20_PLATFORM_FEE_V2 = keccak256(toUtf8Bytes('ERC20_PLATFORM_FEE_V2'));
export const ERC20_DEVELOPER_FEE_V2 = keccak256(toUtf8Bytes('ERC20_DEVELOPER_FEE_V2'));

// STAKEX deploter fee
export const DEPLOYER_STAKEX_FEE = keccak256(toUtf8Bytes('DEPLOYER_STAKEX_FEE'));
