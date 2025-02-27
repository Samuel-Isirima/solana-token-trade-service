const Token = require('../models/Token');
const { default: buyMemeToken } = require('./buyController');
const { default: sellMemeToken } = require('./sellController');

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


const updateTokenAfterSell = async (tokenMint, sellTxSignature, solBalanceAfterSell, sellMarketCap) => {
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


const buyToken = async (queueMessage) => {
    var tokenObject = JSON.parse(queue_message)
    const tokenMint = tokenObject.tokenMint
    const transaction = buyMemeToken(tokenMint)
    if(transaction)
    {
        writeTokenToDatabase(tokenObject.name, tokenMint, tokenObject.marketcap, tokenObject.age, transaction.amount, transaction.txid, transaction.solBalanceBeforeBuy)
    }
}


const sellToken = async (queueMessage) => {
    var tokenObject = JSON.parse(queue_message)
    const tokenMint = tokenObject.tokenMint
    const transaction = sellMemeToken(tokenMint, tokenObject.amount)
    if(transaction)
    {
        writeTokenToDatabase(tokenObject.name, tokenMint, tokenObject.marketcap, tokenObject.age, transaction.amount, transaction.txid, transaction.solBalanceBeforeBuy)
    }
}

module.exports.buyToken = buyToken