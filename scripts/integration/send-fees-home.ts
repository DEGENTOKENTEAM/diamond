import { parseEther } from 'ethers';
import { ethers } from 'hardhat';
import fetch from 'node-fetch';

(async () => {
  const diamond = await ethers.getContract('Diamond');
  const storeFacet = await ethers.getContractAt('FeeStoreFacet', await diamond.getAddress());

  // @todo use RelayerCeler exposed relayerHome
  const protocol = 'https';
  const host = 'cbridge-v2-test.celer.network';
  //const host = 'cbridge-prod2.celer.app';
  const slippage = 50000;
  const receivingRelayerAddress = '0xE83EA92b5AB384A1534CD3174271c32ED3a1088a';
  const amount = (await storeFacet.getCollectedFeesTotal()).toString();
  const celerEstimate = `${protocol}://${host}/v2/estimateAmt?src_chain_id=5&dst_chain_id=97&token_symbol=USDC&amt=${amount}&usr_addr=${receivingRelayerAddress}&slippage_tolerance=${slippage}`;
  const celerTransferConfig = `${protocol}://${host}/v2/getTransferConfigs`;

  console.log(`Call: ${celerEstimate}`);
  const response = await fetch(celerEstimate);
  // console.log(`Call: ${celerTransferConfig}`);
  // const response = await fetch(celerTransferConfig);
  console.log(await response.json());
})();
