import axios from 'axios';
import rabbitMQService from '../services/rabbitMQ.service.js'; // Assuming you have a RabbitMQ service


import Token from "../models/Token.js";
import buyMemeToken from "./buyController.js";
import sellMemeToken from "./sellController.js";

const SOLANA_TRACKER_API = 'https://data.solanatracker.io/price/multi';
const API_KEY = process.env.SOLANA_TRACKER_API_KEY;

async function writeTokenToDatabase(name, token_mint, buy_marketcap, age, buy_quantity, buytxsignature, solbalancebeforebuy) {
  try {
    const token = await Token.create({
      name,
      token_mint,
      buy_marketcap,
      age,
      buy_quantity,
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
      const pnl = solBalanceAfterSell - solBalanceBeforeSell;
  
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



export const checkForTokensToSell = async () => {
    const unsoldTokens = await getUnsoldTokens()

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
                    'x-api-key': `${API_KEY}`
                }
            }
        );
        
        const marketCapData = response.data;
        console.log('data fetched from sol tracker')
        console.log(marketCapData)
        
        // Iterate through tokens and check if market cap increased by 15%
        for (const token of unsoldTokens) {
            const tokenMarketCap = parseFloat(marketCapData[token.token_mint]?.marketCap);
            if (!tokenMarketCap) continue; // Skip if no market cap data
            
            const buyMarketCap = parseFloat(token.buy_marketcap);
            const priceIncrease = ((tokenMarketCap - buyMarketCap) / buyMarketCap) * 100;
            
            if (priceIncrease >= 15) {
                const message = { tokenMint: token.token_mint, marketCap: tokenMarketCap, priceIncrease: priceIncrease };
                rabbitMQService.sendToQueue("SELL", JSON.stringify(message));
                console.log(`✅ Sent ${token.token_mint} to SELL queue. Up ${priceIncrease.toFixed(2)}%`);
            }

            if (priceIncrease <= -30) {     //Sell if token is dying to avoid 100% loss
                const message = { tokenMint: token.token_mint, marketCap: tokenMarketCap, priceIncrease: priceIncrease };
                rabbitMQService.sendToQueue("SELL", JSON.stringify(message));
                console.log(`✅ Sent ${token.token_mint} to SELL queue. Down ${priceIncrease.toFixed(2)}%`);
            }

            console.log('PRICE INCREASE ', priceIncrease)
        }
    } catch (error) {
        console.error('Error fetching market cap data:', error);
    }
};


export const buyToken = async (queueMessage) => {
    var tokenObject = JSON.parse(queueMessage)
    const tokenMint = tokenObject.tokenMint

    //Check if we had already traded this token before
    const trade = await Token.find({ where: { token_mint: tokenMint } })
    if(trade)
        return    //Dont buy again
    /*
    const transaction = await buyMemeToken(tokenMint)
    if(transaction)
    {
        console.log('BUY MEMECOIN SUCCESSFUL')
        console.log(transaction)
        await writeTokenToDatabase("no-name", tokenMint, parseFloat(tokenObject.filters.marketCapFilter.data.marketCap), 2, transaction.amount, transaction.txid, transaction.solBalanceBeforeBuy)
    }
    */

    // process.exit(0);
    //For testing
    await writeTokenToDatabase("no-name", tokenMint, parseFloat(tokenObject.filters.marketCapFilter.data.marketCap), 2, 1000, "4subasieowihsioaava", 110)

}


export const sellToken = async (queueMessage) => {
    var tokenObject = JSON.parse(queueMessage)
    const tokenMint = tokenObject.tokenMint
    /*
    const transaction = await sellMemeToken(tokenMint, tokenObject.amount)
    if(transaction)
    {
        await updateTokenAfterSell(tokenMint, transaction.txid, transaction.solBalanceAfterSell, transaction.solBalanceBeforeSell, tokenObject.marketCap)
    }
    */
    //For testing
    await updateTokenAfterSell(tokenMint, "tid", 110, 120, tokenObject.marketCap)

}


