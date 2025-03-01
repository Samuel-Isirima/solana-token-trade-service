import axios from 'axios';
import rabbitMQService from '../services/rabbitMQ.service.js'; // Assuming you have a RabbitMQ service


import Token from "../models/Token.js";
import buyMemeToken from "./buyController.js";
import sellMemeToken from "./sellController.js";

const SOLANA_TRACKER_API = 'https://your-api-endpoint.com/price/multi';
const API_KEY = process.env.SOLANA_TRACKER_API_KEY;

async function writeTokenToDatabase(name, token_mint, buy_marketcap, age, quantity_bought, buytxsignature, solbalancebeforebuy) {
  try {
    const token = await Token.create({
      name,
      token_mint,
      buy_marketcap,
      age,
      quantity_bought,
      sold: false,
      pnl: 0,
      buytxsignature,
      solbalancebeforebuy
    });

    console.log(`Token ${token.name} added successfully.`);
    return true
  } 
  catch (error) 
  {
    console.error('Error adding token:', error);
  }
}


const updateTokenAfterSell = async (tokenMint, sellTxSignature, solBalanceAfterSell, solBalanceBeforeSell, sellMarketCap) => {
    try {
      // Find the token by its mint address
      const token = await Token.findOne({ where: { token_mint: tokenMint } });
  
      if (!token) {
        throw new Error(`Token with mint ${tokenMint} not found`);
      }
  
      // Calculate Profit & Loss (PnL)
      const pnl = solBalanceAfterSell - token.solbalancebeforebuy;
  
      // Update the token fields
      await token.update({
        selltxsignature: sellTxSignature,
        solbalanceaftersell: solBalanceAfterSell,
        solbalancebeforeSell: solBalanceBeforeSell,
        sell_marketcap: sellMarketCap,
        sold: true,
        pnl: pnl, // Store profit/loss
      });
  
      console.log(`Token ${tokenMint} updated successfully after selling.`);
    } catch (error) {
      console.error(`Error updating token after sell: ${error.message}`);
    }
  };
  

async function getUnsoldTokens() {
    try {
      const unsoldTokens = await Token.findAll({ where: { sold: false } });
      return unsoldTokens
    } 
    catch (error) 
    {
      console.error('Error fetching unsold tokens:', error);
    }
}



export const checkForTokensToSell = async (unsoldTokens) => {
    if (!unsoldTokens || unsoldTokens.length === 0) return;
    
    try {
        // Extract token mints from unsold tokens
        const tokenMints = unsoldTokens.map(token => token.token_mint);
        
        // Make API request to get market cap data
        const response = await axios.post(SOLANA_TRACKER_API, 
            { tokens: tokenMints }, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                }
            }
        );
        
        const marketCapData = response.data;
        
        // Iterate through tokens and check if market cap increased by 15%
        for (const token of unsoldTokens) {
            const tokenMarketCap = marketCapData[token.tokenMint]?.marketCap;
            if (!tokenMarketCap) continue; // Skip if no market cap data
            
            const buyMarketCap = token.buy_marketcap;
            const priceIncrease = ((tokenMarketCap - buyMarketCap) / buyMarketCap) * 100;
            
            if (priceIncrease >= 15) {
                const message = { tokenMint: token.tokenMint, marketCap: tokenMarketCap, priceIncrease: priceIncrease };
                rabbitMQService.sendToQueue("SELL", JSON.stringify(message));
                console.log(`✅ Sent ${token.tokenMint} to SELL queue. Up ${priceIncrease.toFixed(2)}%`);
            }
        }
    } catch (error) {
        console.error('Error fetching market cap data:', error);
    }
};


export const buyToken = async (queueMessage) => {
    var tokenObject = JSON.parse(queueMessage)
    const tokenMint = tokenObject.tokenMint
    const transaction = buyMemeToken(tokenMint)
    if(transaction)
    {
        writeTokenToDatabase("no-name", tokenMint, tokenObject.filters.marketCapFilter.data.marketcap, "few mins", transaction.amount, transaction.txid, transaction.solBalanceBeforeBuy)
    }
}


export const sellToken = async (queueMessage) => {
    var tokenObject = JSON.parse(queueMessage)
    const tokenMint = tokenObject.tokenMint
    const transaction = sellMemeToken(tokenMint, tokenObject.amount)
    if(transaction)
    {
        updateTokenAfterSell(tokenMint, transaction.txid, transaction.solBalanceAfterSell, tokenObject.marketCap)
    }
}


