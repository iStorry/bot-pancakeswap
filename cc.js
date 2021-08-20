import ethers from 'ethers';

const data = {
    WBNB: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    recipient: '0x9B2c803f8847EfFf325583C09EC50bDf1B48FAd2'
}

const mnemonic = 'ece3c6b4c5bf161a00c45ee7f7aed1a00ed5a74bdd81320eeac1627362e32c58';
const wss = 'wss://apis.ankr.com/wss/ee01b8df310841d59303429b7579b5da/7fabeabb390c7b75d07b8e8cf9fcb68c/binance/full/main'; // wss://bsc-ws-node.nariox.org:443
const provider = new ethers.providers.WebSocketProvider(wss);
const wallet = new ethers.Wallet(mnemonic);
const account = wallet.connect(provider);

let is_tested = false;

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


factory.on('PairCreated', async (token0, token1, pairAddress) => {

    if (!is_tested) {
        console.log(`
            New pair detected
            =================
            token0: ${token0}
            token1: ${token1}
            pairAddress: ${pairAddress}
        `);
    }

    // let tokenIn, tokenOut;
    // if (token0 === data.WBNB) {
    //     tokenIn = token0;
    //     tokenOut = token1;
    // }

    await prepare(token0, token1);
});

let prepare = async (x, y) => {
    const _pairAddress = await factory.getPair(x, y);

    if (_pairAddress !== null && _pairAddress !== undefined) {
        if (_pairAddress.toString().indexOf('0x0000000000000') > -1) {
            console.log(`Pair Address : ${_pairAddress} Not Detected [Restarting..]`);
        }
    }

    const pbv = await erc.balanceOf(_pairAddress); // Pair BNB Value
    const currentValue = ethers.utils.formatEther(pbv); // Current Value Of Token
    console.log(`Current Value : ${currentValue}`);
    if (!is_tested && currentValue >= 2) {
        setTimeout(() => buy(x, y), 3000);
    } else {
        console.log(`Skipped`);
    }
};



let buy = async(tokenIn, tokenOut) => {
    // 0x9B2c803f8847EfFf325583C09EC50bDf1B48FAd2
    try {
        is_tested = true;
        const amountIn = ethers.utils.parseUnits(`0.002`, 'ether');
        console.log(amountIn);
        const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
        const amountOutMin = amounts[1].sub(amounts[1].div(1));
        const gasPrice = ethers.utils.parseUnits("5", 'gwei')
        console.log(`
            Buying new token
            =================
            tokenIn: ${amountIn.toString()} ${tokenIn} (BNB)
            tokenOut: ${amountOutMin.toString()} ${tokenOut}
        `);

        // let j = {};
        // j.in = amountIn;
        // j.out = amountOutMin;
        // j.tin = tokenIn;
        // j.tout = tokenOut;
        // j.dd = data.recipient;
        // j.date = Date.now() + 1000 * 60 * 10;
        // j.gasLimit = 645684;
        // j.gasPrice = gasPrice
        // console.log(j);

        const tx = await router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            [tokenIn, tokenOut],
            data.recipient,
            Date.now() + 1000 * 60 * 10,
            {
                "gasLimit": "645684",
                "gasPrice": `${gasPrice}`,
                "nonce": null
            }
        ); //10 minutes
        // const receipt = await tx.wait();
        // console.log('Transaction receipt');
        // console.log(receipt);


    } catch(err) {
        console.log(err);
    }
};