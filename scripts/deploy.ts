import { ethers, upgrades } from "hardhat";
import { DegenX } from "../typechain-types";

async function main() {
  const [deployer] = await ethers.getSigners();

  const dgnxToken = await (
    (await upgrades.deployProxy(
      await ethers.getContractFactory("DegenX")
    )) as DegenX
  ).deployed();

  const bridgeManager = await ethers.getContractFactory("BridgeManager");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
