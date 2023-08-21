import dotenv from "dotenv";
import {loadKeypairFromFile, loadOrGenerateKeypair} from "@/utils/helpers";
import {clusterApiUrl, Keypair, PublicKey, TransactionResponse, VersionedTransactionResponse} from "@solana/web3.js";
import {WrapperConnection} from "@/ReadApi/WrapperConnection";
import {
  ChangeLogEventV1,
  deserializeChangeLogEventV1,
  SPL_NOOP_PROGRAM_ID,
  ValidDepthSizePair
} from "@solana/spl-account-compression";
import {createCollection, createTree, mintCompressedNFT} from "@/utils/compression";
import {CreateMetadataAccountArgsV3} from "@metaplex-foundation/mpl-token-metadata";
import {getLeafAssetId, MetadataArgs, TokenProgramVersion, TokenStandard} from "@metaplex-foundation/mpl-bubblegum";
import {bs58} from "@project-serum/anchor/dist/cjs/utils/bytes";
import BN from "bn.js";

const express = require('express');
const app = express();

dotenv.config();

/**
 * Helper function to extract the all ChangeLogEventV1 emitted in a transaction
 * @param txResponse - Transaction response from `@solana/web3.js`
 * @param noopProgramId - program id of the noop program used (default: `SPL_NOOP_PROGRAM_ID`)
 * @returns
 */
export function getAllChangeLogEventV1FromTransaction(
  txResponse: TransactionResponse | VersionedTransactionResponse,
  noopProgramId: PublicKey = SPL_NOOP_PROGRAM_ID
): ChangeLogEventV1[] {
  // ensure a transaction response was provided
  if (!txResponse) throw Error("No txResponse provided");

  // flatten the array of all account keys (e.g. static, readonly, writable)
  const accountKeys = txResponse.transaction.message
    .getAccountKeys()
    .keySegments()
    .flat();

  let changeLogEvents: ChangeLogEventV1[] = [];

  // locate and parse noop instruction calls via cpi (aka inner instructions)
  txResponse!.meta?.innerInstructions?.forEach((compiledIx) => {
    compiledIx.instructions.forEach((innerIx) => {
      // only attempt to parse noop instructions
      if (
        noopProgramId.toBase58() !==
        accountKeys[innerIx.programIdIndex].toBase58()
      )
        return;

      try {
        // try to deserialize the cpi data as a changelog event
        changeLogEvents.push(
          deserializeChangeLogEventV1(Buffer.from(bs58.decode(innerIx.data)))
        );
      } catch (__) {
        // this noop cpi is not a changelog event. do nothing with it.
      }
    });
  });

  return changeLogEvents;
}

const payer = process.env?.LOCAL_PAYER_JSON_ABSPATH
  ? loadKeypairFromFile(process.env?.LOCAL_PAYER_JSON_ABSPATH)
  : loadOrGenerateKeypair("payer");


const CLUSTER_URL = process.env.RPC_URL ?? clusterApiUrl("devnet");

const connection = new WrapperConnection(CLUSTER_URL, "confirmed");
const maxDepthSizePair: ValidDepthSizePair = {
  maxDepth: 14,
  maxBufferSize: 64,
};
const canopyDepth = maxDepthSizePair.maxDepth - 5;

const treeKeypair = Keypair.generate();

let collection, collectionMetadataV3: CreateMetadataAccountArgsV3;

app.locals.hashMap = {};

app.get('/initializeDatastore', async function () {
  await createTree(connection, payer, treeKeypair, maxDepthSizePair, canopyDepth);
  app.locals.collectionMetadataV3 = {
    data: {
      name: "OP Rollup Data",
      symbol: "RD",
      uri: "",
      sellerFeeBasisPoints: 0,
      creators: [
        {
          address: payer.publicKey,
          verified: false,
          share: 100,
        },
      ],
      collection: null,
      uses: null,
    },
    isMutable: false,
    collectionDetails: null,
  };

  app.locals.collection = await createCollection(connection, payer, collectionMetadataV3);
});

app.get('/postData', async function (req, res) {


  let data = req.query.data;
  const compressedNFTMetadata: MetadataArgs = {
    name: "OP Rollup Data",
    symbol: collectionMetadataV3.data.symbol,
    uri: data.toString(),
    creators: [
      {
        address: payer.publicKey,
        verified: false,
        share: 100,
      }
    ],
    editionNonce: 0,
    uses: null,
    collection: null,
    primarySaleHappened: false,
    sellerFeeBasisPoints: 0,
    isMutable: false,
    tokenProgramVersion: TokenProgramVersion.Original,
    tokenStandard: TokenStandard.NonFungible,
  };

 const sig =  await mintCompressedNFT(
    connection,
    payer,
    treeKeypair.publicKey,
    collection.mint,
    collection.metadataAccount,
    collection.masterEditionAccount,
    compressedNFTMetadata,
    payer.publicKey,
  );
  const tx = await connection.getTransaction(sig, {
    maxSupportedTransactionVersion: 0,
  });
  const events = getAllChangeLogEventV1FromTransaction(tx);
  const assetId = await getLeafAssetId(events[0].treeId, new BN(events[0].index));
  app.locals.hashMap[assetId.toString()] = data;
  res.send(assetId.toString());
});

app.get('/getTransaction', function (req, res) {
  const hash = req.query.hash;
  res.send(app.locals.hashMap[hash])
});

app.listen(3000, function () {
  console.log('server started')
});
