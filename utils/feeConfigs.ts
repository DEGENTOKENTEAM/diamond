import { keccak256, toUtf8Bytes } from 'ethers';

export const ERC20_MARKETING_FEE = keccak256(toUtf8Bytes('ERC20_MARKETING_FEE'));
export const ERC20_REWARD_FEE = keccak256(toUtf8Bytes('ERC20_REWARD_FEE'));
export const ERC20_PLATFORM_FEE = keccak256(toUtf8Bytes('ERC20_PLATFORM_FEE'));
export const ERC20_DEVELOPER_FEE = keccak256(toUtf8Bytes('ERC20_DEVELOPER_FEE'));

// needs to be added because there are breaking changes in the fee calculation
export const ERC20_MARKETING_FEE_V2 = keccak256(toUtf8Bytes('ERC20_MARKETING_FEE_V2')); // 0x9613ee95a7f8b57c4773108cd46d076271db89b25fede6e7ba97f60f2ac3b141
export const ERC20_REWARD_FEE_V2 = keccak256(toUtf8Bytes('ERC20_REWARD_FEE_V2')); // 0x6d01d9ea6e6a0240c52d1a22f607ce92e83626395b8dbbdb9a1a57f9da9f834e
export const ERC20_PLATFORM_FEE_V2 = keccak256(toUtf8Bytes('ERC20_PLATFORM_FEE_V2')); // 0x38320ddaa2b9200b700fe8f79bd1836f49203e2d91eb82209ee6074eacfb30c6
export const ERC20_DEVELOPER_FEE_V2 = keccak256(toUtf8Bytes('ERC20_DEVELOPER_FEE_V2')); // 0xdec995fc864fc294e4f214d2bd6cd54c4cf505e5d8a060b785ea57726145d495

// STAKEX deploter fee
export const DEPLOYER_STAKEX_FEE = keccak256(toUtf8Bytes('DEPLOYER_STAKEX_FEE')); // 0xab8d8363edfd91d86b49dd0600c50594ab035a0f9bedec83c266a36254ec8684
