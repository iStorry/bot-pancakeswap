import ethers from 'ethers';
import fs from 'fs';

const addresses = {
    WBNB: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    recipient: '0x9B2c803f8847EfFf325583C09EC50bDf1B48FAd2'
};

const amountIn = ethers.utils.parseUnits('0.001', 'ether'); //buying amount 0.001 BNB

const mnemonic = 'ece3c6b4c5bf161a00c45ee7f7aed1a00ed5a74bdd81320eeac1627362e32c58';
const wss = 'wss://apis.ankr.com/wss/ee01b8df310841d59303429b7579b5da/7fabeabb390c7b75d07b8e8cf9fcb68c/binance/full/main'; // wss://bsc-ws-node.nariox.org:443
const provider = new ethers.providers.WebSocketProvider(wss);
const wallet = new ethers.Wallet(mnemonic);
const account = wallet.connect(provider);

const factory = new ethers.Contract(
    addresses.factory,
    [
        'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
        'function getPair(address tokenA, address tokenB) external view returns (address pair)'
    ],
    account
);



const router = new ethers.Contract(
    addresses.router,
    [
        'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
        'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
        'function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint256 deadline) external returns (uint[] memory amounts)'
    ],
    account
);


console.log('BOT STARTED - Semoga opit');
factory.on('PairCreated', async (token0, token1, pairAddress) => {

    let tokenIn, tokenOut;
    if (token0 === addresses.WBNB) {
        tokenIn = token0;
        tokenOut = token1;
    }

    if (token1 == addresses.WBNB) {
        tokenIn = token1;
        tokenOut = token0;
    }

    if (typeof tokenIn === 'undefined') {
        return;
    }


    try {
        console.log(amountIn);
        
        console.log(tokenOut);
        console.log(tokenIn);
        
        console.log(addresses.recipient);
        console.log(pairAddress);

        // fs.appendFileSync("data.csv", '\n' + [tokenOut, pairAddress].join(","));
        const tx = await router.swapExactETHForTokens(
            amountIn,
            [tokenIn, tokenOut],
            addresses.recipient,
            Date.now() + 1000 * 60 * 10, //10m,
            {
                'gasLimit': 300000,
                'gasPrice': ethers.utils.parseUnits('5.102', 'gwei'),
                'value': amountIn
            }
        );

        const receipt = await tx.wait();
        console.log(`tx: https://www.bscscan.com/tx/${receipt.logs[1].transactionHash}`);
        console.log('next');
        process.exit(); // Remove slash to stop buying new tokens

    } catch (error) {
        //console.log(error);
    }
});