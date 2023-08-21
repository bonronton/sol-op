import {clusterApiUrl, Keypair} from "@solana/web3.js";
import {ValidDepthSizePair} from "@solana/spl-account-compression";
import {MetadataArgs, TokenProgramVersion, TokenStandard,} from "@metaplex-foundation/mpl-bubblegum";
import {CreateMetadataAccountArgsV3} from "@metaplex-foundation/mpl-token-metadata";
import {loadKeypairFromFile, loadOrGenerateKeypair} from "@/utils/helpers";
import {createCollection, createTree, mintCompressedNFT} from "@/utils/compression";
import {WrapperConnection} from "@/ReadApi/WrapperConnection";
import dotenv from "dotenv";
