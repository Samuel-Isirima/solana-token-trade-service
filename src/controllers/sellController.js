import {
  Connection,
  Keypair,
  VersionedTransaction,
  sendAndConfirmRawTransaction,
} from "@solana/web3.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
import getKeypairFromMnemonic from "../helpers/keypair";


dotenv.config();

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL;
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

// Load wallet from environment variable
const WALLET_PRIVATE_KEY = getKeypairFromMnemonic();
const wallet = Keypair.fromSecretKey(new Uint8Array(WALLET_PRIVATE_KEY));


async function getWalletBalance(publicKey) {
  try {
    const balanceLamports = await connection.getBalance(publicKey);
    return balanceLamports / 1_000_000_000; // Convert lamports to SOL
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return 0;
  }
}

const sellMemeToken = async (tokenMint, tokenAmount) => {
  try {
    console.log("🔍 Checking balance before selling...");

    // Check wallet balance before proceeding
    const balance = await getWalletBalance(wallet.publicKey);
    console.log(`Wallet Balance: ${balance} SOL`);

    console.log("✅ Proceeding with the swap...");

    // Fetch the best swap route from Jupiter
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${tokenMint}&outputMint=So11111111111111111111111111111111111111112&amount=${tokenAmount}&slippageBps=50`;
    const quoteResponse = await fetch(quoteUrl);
    const quote = await quoteResponse.json();

    if (!quote || !quote.routePlan) {
      throw new Error("Failed to get swap route");
    }

    console.log("Best Route:", quote.routePlan);

    // Build the swap transaction
    const swapUrl = "https://quote-api.jup.ag/v6/swap";
    const swapResponse = await fetch(swapUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPublicKey: wallet.publicKey.toString(),
        quoteResponse: quote,
        wrapAndUnwrapSol: true,
      }),
    });

    const { swapTransaction } = await swapResponse.json();

    if (!swapTransaction) {
      throw new Error("Failed to create swap transaction");
    }

    console.log("Swap Transaction Fetched");

    // Decode transaction
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(swapTransaction, "base64")
    );

    // Sign the transaction
    transaction.sign([wallet]);

    // Send the signed transaction
    const txid = await sendAndConfirmRawTransaction(
      connection,
      transaction.serialize()
    );
    console.log(`✅ Swap successful! Transaction ID: ${txid}`);
    return txid

  } catch (error) {
    console.error("Error selling meme token:", error);
    return null
  }
}

export default sellMemeToken;
