import ethers from 'ethers';
import express from 'express';
import chalk from 'chalk';
import dotenv from 'dotenv';
import inquirer from 'inquirer';

const app = express();
dotenv.config();

const data = {
    WBNB: process.env.WBNB_CONTRACT, //wbnb
    to_PURCHASE: process.env.TO_PURCHASE, // token that you will purchase = BUSD for test '0xe9e7cea3dedca5984780bafc599bd69add087d56'
    AMOUNT_OF_WBNB: process.env.AMOUNT_OF_WBNB, // how much you want to buy in WBNB
    factory: process.env.FACTORY, //PancakeSwap V2 factory
    router: process.env.ROUTER, //PancakeSwap V2 router
    recipient: process.env.YOUR_ADDRESS, //your wallet address,
    Slippage: process.env.SLIPPAGE, //in Percentage
    gasPrice: ethers.utils.parseUnits(`${process.env.GWEI}`, 'gwei'), //in gwei
    gasLimit: process.env.GAS_LIMIT, //at least 21000
    minBnb: process.env.MIN_LIQUIDITY_ADDED //min liquidity added
}

const bscMainnetUrl = 'https://bsc-dataseed.binance.org/' // https://bsc-dataseed1.defibit.io/ https://bsc-dataseed.binance.org/
const wss = 'wss://apis.ankr.com/wss/ee01b8df310841d59303429b7579b5da/7fabeabb390c7b75d07b8e8cf9fcb68c/binance/full/main'; // wss://bsc-ws-node.nariox.org:443
const mnemonic = process.env.YOUR_MNEMONIC //your memonic;
const tokenIn = data.WBNB;
const tokenOut = data.to_PURCHASE;
// const provider = new ethers.providers.JsonRpcProvider(bscMainnetUrl)
const provider = new ethers.providers.WebSocketProvider(wss);
const wallet = new ethers.Wallet(mnemonic);
const account = wallet.connect(provider);


let is_done = false; 

const factory = new ethers.Contract(
    data.factory,
    [
        'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
        'function getPair(address tokenA, address tokenB) external view returns (address pair)'
    ],
    account
);

const router = new ethers.Contract(
    data.router,
    [
        'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
        'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
    ],
    account
);

const erc = new ethers.Contract(
    data.WBNB,
    [{
        "constant": true,
        "inputs": [{
            "name": "_owner",
            "type": "address"
        }],
        "name": "balanceOf",
        "outputs": [{
            "name": "balance",
            "type": "uint256"
        }],
        "payable": false,
        "type": "function"
    }],
    account
);

/**
 * On New Pair Added 
 */

factory.on('PairCreated', async (token0, token1, pairAddress) => {
    var pair = {};
    pair.token0 = token0;
    pair.token1 = token1;
    pair.address = pairAddress;
    // Run The Prepare Function ...
    await prepare(token0, token1);
});

/**
 * When New Pair Created..
 * @param {Token0} x 
 * @param {Token1} y 
 */
let prepare = async (x, y) => {
    const _pairAddress = await factory.getPair(x, y);
    if (_pairAddress !== null && _pairAddress !== undefined) {
        if (_pairAddress.toString().indexOf('0x0000000000000') > -1) {
            console.log(`Pair Address : ${_pairAddress} Not Detected [Restarting..]`);
        }
    }
    const pbv = await erc.balanceOf(_pairAddress); // Pair BNB Value
    const currentValue = ethers.utils.formatEther(pbv); // Current Value Of Token
    const json = {};
    json.token0 = x;
    json.token1 = y;
    json.address = _pairAddress;
    json.price = currentValue;
    json.url = `https://www.dextools.io/app/pancakeswap/pair-explorer/${_pairAddress}`;
    console.table(json);

    // If Price Less That Mentioned.
    if (currentValue > data.minBnb) {
        // Buy
        setTimeout(() => buy(x, y), 3000);
    } else {
        console.log(`Ignored Pair [${_pairAddress}]`)
    }
};

let buy = async (x, y) => {
    console.log(`Buying..`)
    try {

        if (!is_done) {
            let min_amount = 0;
            const amountIn = ethers.utils.parseUnits(`${data.AMOUNT_OF_WBNB}`, 'ether');
            // if (parseInt(data.Slippage) !== 0) {
            const amounts = await router.getAmountsOut(amountIn, [x, y]);
            const amountOutMin = amounts[1].sub(amounts[1].div(`${data.Slippage}`));
            // }
            const json = {};
            json.action = "Buying Now";
            json.amount_in = `${(amountIn * 1e-18).toString()}`
            json.amount_out = `${amountOutMin.toString()}`
            json.token_in = `${x} [BNB]`
            json.token_out = `${y}`
            json.recipient = `${data.recipient}`
            json.gas_limit = `${data.gasLimit}`
            json.gas_price = `${data.gasPrice}`
            console.table(json);
            console.log('Processing Transaction.....');
            
            is_done = true;

            // // Buy 
            const tx = await router.swapExactTokensForTokens(
                amountIn, amountOutMin, [x, y],
                data.recipient, Date.now() + 1000 * 60 * 5, {
                    "gasLimit": data.gasLimit, "gasPrice": data.gasPrice, "nonce": null
                }
            ); // Date.now() + 1000 * 60 * 5 => Deadline If Transaction Is Stuck It Will Expire After 5min
            const receipt = await tx.wait();
            console.log(`Receipt : https://www.bscscan.com/tx/${receipt.logs[1].transactionHash}`);
            setTimeout(() => {
                process.exit()
            }, 2000);
        }
        else {
            console.log(`Skipping...`);
        }
        // const tx = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens( //uncomment this if you want to buy deflationary token
        //     // const tx = await router.swapExactTokensForTokens( //uncomment here if you want to buy token
        //     amountIn,
        //     amountOutMin,
        //     [tokenIn, tokenOut],
        //     data.recipient,
        //     Date.now() + 1000 * 60 * 5, //5 minutes
        //     {
        //         'gasLimit': data.gasLimit,
        //         'gasPrice': data.gasPrice,
        //         'nonce': null //set you want buy at where position in blocks
        //     });

        // const receipt = await tx.wait();
        // console.log(`Transaction receipt : https://www.bscscan.com/tx/${receipt.logs[1].transactionHash}`);
        // setTimeout(() => {
        //     process.exit()
        // }, 2000);
    } catch (err) {
        let error = JSON.parse(JSON.stringify(err));
        console.log(`Error caused by : {
            reason : ${error.reason},
            transactionHash : ${error.transactionHash}
            message : Please check your BNB/WBNB balance, maybe its due because insufficient balance or approve your token manually on pancakeSwap
        }`);

    }
};

const PORT = 5000;

app.listen(PORT, console.log(chalk.yellow(`Listening for Liquidity Addition to token ${data.to_PURCHASE}`)));