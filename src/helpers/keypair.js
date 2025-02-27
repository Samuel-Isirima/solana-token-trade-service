import {
    Keypair
  } from "@solana/web3.js";
  import bs58 from "bs58";
  import dotenv from "dotenv";
  import * as bip39 from 'bip39';
  import { derivePath } from 'ed25519-hd-key';

  dotenv.config();
  
const getKeypairFromMnemonic = () => {
    const mnemonic = process.env.PHANTOM_RECOVERY_PHRASE; 
    const seed = bip39.mnemonicToSeedSync(mnemonic);
      // Phantom uses the standard BIP44 derivation path for Solana
      const derivedPath = "m/44'/501'/0'/0'";
      const derivedSeed = derivePath(derivedPath, seed.toString('hex')).key;
      const keypair = Keypair.fromSeed(derivedSeed);
      
      // The array format needed for your buying script
      const privateKeyArray = Array.from(keypair.secretKey);
      
      // You can also get it in base58 format (for reference)
      const privateKeyBase58 = bs58.encode(keypair.secretKey);
      
      const details =  {
        publicKey: keypair.publicKey.toString(),
        privateKeyArray: privateKeyArray,
        privateKeyBase58: privateKeyBase58
      };
    
     return privateKeyArray
    }
    
export default getKeypairFromMnemonic;
