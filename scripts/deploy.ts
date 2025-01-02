import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import fs from 'fs';
import { getSigningJsdClient, jsd } from 'hyperwebjs';
import path from 'path';
import { ConfigContext, useChain, useRegistry } from 'starshipjs';  // Added useRegistry here

import { sleep } from '../test-utils/sleep';

async function main() {
  try {
    // Set up config context first
    const configFile = path.join(__dirname, '..', 'configs', 'local.yaml');
    ConfigContext.setConfigFile(configFile);
    ConfigContext.setRegistry(await useRegistry(configFile));
    
    // If your private key is a hex string
    const privateKeyHex = "efbe781bcf1a6434b6fda5f9cbc6df7311e1217b9aff21316848e29377199e78";
    const privateKey = new Uint8Array(
      privateKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    // Create wallet from private key
    const wallet = await DirectSecp256k1Wallet.fromKey(privateKey, "hyper");
    console.log('Wallet created');

    // Get chain configuration and faucet
    const { getCoin, getRpcEndpoint, creditFromFaucet } = useChain('hyperweb');
    const denom = (await getCoin()).base;
    const rpcEndpoint = await getRpcEndpoint();
    
    // Get wallet address
    const address = (await wallet.getAccounts())[0].address;
    console.log('Wallet address:', address);

    // Credit tokens from faucet
    console.log('Requesting tokens from faucet...');
    await creditFromFaucet(address);
    await sleep(2000); // Wait for transaction to be processed
    console.log('Tokens received from faucet');

    // Create signing client
    const signingClient = await getSigningJsdClient({
      rpcEndpoint,
      signer: wallet
    });
    console.log('Signing client created');

    // Read the contract bundle
    const contractCode = fs.readFileSync('dist/contracts/blueskyRegistry.js', 'utf8');
    console.log('Contract code loaded');

    // Create deployment message
    const msg = jsd.jsd.MessageComposer.fromPartial.instantiate({
      creator: address,
      code: contractCode,
    });

    // Set fee using the correct denom
    const fee = { 
      amount: [{ denom, amount: '100000' }], 
      gas: '550000' 
    };

    // Deploy
    console.log('Broadcasting transaction...');
    const result = await signingClient.signAndBroadcast(address, [msg], fee);
    
    // Get contract index from response
    const response = jsd.jsd.MsgInstantiateResponse.decode(result.msgResponses[0].value);
    const contractIndex = response.index;
    console.log('Contract deployed successfully!');
    console.log('Contract index:', contractIndex);
    console.log('Contract address:', result.msgResponses[0].value);  // Contract address
    
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

// Execute the main function
main();

// V1
// import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
// import fs from 'fs';
// import { getSigningJsdClient, jsd } from 'hyperwebjs';

// async function main() {
//   try {
//     // If your private key is a hex string
//     const privateKeyHex = "efbe781bcf1a6434b6fda5f9cbc6df7311e1217b9aff21316848e29377199e78";
//     const privateKey = new Uint8Array(
//       privateKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
//     );

//     // Create wallet from private key
//     const wallet = await DirectSecp256k1Wallet.fromKey(privateKey, "hyper");
//     console.log('Wallet created');

//     const rpcEndpoint = "http://localhost:26657";
//     const signingClient = await getSigningJsdClient({
//       rpcEndpoint,
//       signer: wallet
//     });
//     console.log('Signing client created');

//     // Read the contract bundle
//     const contractCode = fs.readFileSync('dist/contracts/blueskyRegistry.js', 'utf8');
//     console.log('Contract code loaded');

//     // Create deployment message
//     const address = (await wallet.getAccounts())[0].address;
//     console.log('Deploying from address:', address);

//     const msg = jsd.jsd.MessageComposer.fromPartial.instantiate({
//       creator: address,
//       code: contractCode,
//     });

//     // Set fee
//     const fee = { 
//       amount: [{ denom: 'token', amount: '100000' }], 
//       gas: '550000' 
//     };

//     // Deploy
//     console.log('Broadcasting transaction...');
//     const result = await signingClient.signAndBroadcast(address, [msg], fee);
    
//     // Get contract index from response
//     const response = jsd.jsd.MsgInstantiateResponse.decode(result.msgResponses[0].value);
//     const contractIndex = response.index;
//     console.log('Contract deployed successfully!');
//     console.log('Contract index:', contractIndex);
    
//   } catch (error) {
//     console.error('Deployment failed:', error);
//     process.exit(1);
//   }
// }

// // Execute the main function
// main();