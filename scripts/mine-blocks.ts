import { mine } from '@nomicfoundation/hardhat-network-helpers';

const main = async () => {
  await mine(2, { interval: 30 * 24 * 60 * 60 });
};

main().catch(console.log);
