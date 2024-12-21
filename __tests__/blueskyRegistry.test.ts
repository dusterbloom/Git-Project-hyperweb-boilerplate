import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { assertIsDeliverTxSuccess } from '@cosmjs/stargate';
import { SigningStargateClient } from '@cosmjs/stargate';
import path from "path";
import fs from 'fs';
import { getSigningJsdClient, jsd } from 'hyperwebjs';
import { useChain, generateMnemonic } from 'starshipjs';
import { sleep } from '../test-utils/sleep';
import './setup.test';

interface Fee {
  amount: { denom: string; amount: string; }[];
  gas: string;
}

describe('Bluesky Registry Contract Tests', () => {
  let wallet: DirectSecp256k1HdWallet;
  let denom: string;
  let address: string;
  let queryClient: any;
  let signingClient: SigningStargateClient;
  let chainInfo: any;
  let getCoin: any;
  let getRpcEndpoint: any;
  let creditFromFaucet: any;
  let contractCode: string;
  let contractIndex: bigint;
  let fee: Fee;

  beforeAll(async () => {
    ({
      chainInfo,
      getCoin,
      getRpcEndpoint,
      creditFromFaucet
    } = useChain('hyperweb'));
    denom = (await getCoin()).base;

    // Initialize wallet
    wallet = await DirectSecp256k1HdWallet.fromMnemonic(generateMnemonic(), {
      prefix: chainInfo.chain.bech32_prefix
    });
    address = (await wallet.getAccounts())[0].address;

    // Create custom cosmos interchain client
    queryClient = await jsd.ClientFactory.createRPCQueryClient({
      rpcEndpoint: await getRpcEndpoint()
    });

    signingClient = await getSigningJsdClient({
      rpcEndpoint: await getRpcEndpoint(),
      signer: wallet
    });

    fee = {
      amount: [{ denom, amount: '100000' }],
      gas: '550000'
    };

    await creditFromFaucet(address);
    await sleep(2000);
  });

  it('instantiate contract', async () => {
    const contractPath = path.join(__dirname, '../dist/contracts/blueskyRegistry.js');
    contractCode = fs.readFileSync(contractPath, 'utf8');

    const msg = jsd.jsd.MessageComposer.fromPartial.instantiate({
      creator: address,
      code: contractCode,
    });

    const result = await signingClient.signAndBroadcast(address, [msg], fee);
    assertIsDeliverTxSuccess(result);

    const msgResponse = result.msgResponses[0] as { typeUrl: string; value: Uint8Array };
    const response = jsd.jsd.MsgInstantiateResponse.decode(msgResponse.value);
    contractIndex = response.index;
    expect(Number(contractIndex)).toBeGreaterThan(0);
  });

  it('registers a handle', async () => {
    const msg = jsd.jsd.MessageComposer.fromPartial.eval({
      creator: address,
      index: contractIndex,
      fnName: "registerBlueskyHandle",
      arg: JSON.stringify({
        handle: "alice.bsky.social",
        publicKey: "abcd1234"
      }),
    });

    const result = await signingClient.signAndBroadcast(address, [msg], fee);
    assertIsDeliverTxSuccess(result);

    const msgResponse = result.msgResponses[0] as { typeUrl: string; value: Uint8Array };
    const response = jsd.jsd.MsgEvalResponse.decode(msgResponse.value);
    expect(response.result).toBe("Registered handle: alice.bsky.social");
  });

  it('queries a handle', async () => {
    const msg = jsd.jsd.MessageComposer.fromPartial.eval({
      creator: address,
      index: contractIndex,
      fnName: "getPublicKeyForHandle",
      arg: JSON.stringify({
        handle: "alice.bsky.social"
      }),
    });

    const result = await signingClient.signAndBroadcast(address, [msg], fee);
    assertIsDeliverTxSuccess(result);

    const msgResponse = result.msgResponses[0] as { typeUrl: string; value: Uint8Array };
    const response = jsd.jsd.MsgEvalResponse.decode(msgResponse.value);
    expect(response.result).toBe("abcd1234");
  });

  it('fails to register same handle twice', async () => {
    const msg = jsd.jsd.MessageComposer.fromPartial.eval({
      creator: address,
      index: contractIndex,
      fnName: "registerBlueskyHandle",
      arg: JSON.stringify({
        handle: "alice.bsky.social",
        publicKey: "xyz789"
      }),
    });

    await expect(signingClient.signAndBroadcast(address, [msg], fee))
      .rejects.toThrow();
  });

  it('fails to query non-existent handle', async () => {
    const msg = jsd.jsd.MessageComposer.fromPartial.eval({
      creator: address,
      index: contractIndex,
      fnName: "getPublicKeyForHandle",
      arg: JSON.stringify({
        handle: "nonexistent.bsky.social"
      }),
    });

    await expect(signingClient.signAndBroadcast(address, [msg], fee))
      .rejects.toThrow();
  });
});
