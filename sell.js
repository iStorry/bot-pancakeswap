import ethers from 'ethers';

const addresses = {
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    factory: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
    router: "0x10ed43c718714eb63d5aa57b78b54704e256024e",
    recipient: "0x9B2c803f8847EfFf325583C09EC50bDf1B48FAd2",
    // ??
    originAddress: "0x7e2aE31b0E6b68D029Aed98Fd8564DDD233b63E9",
    targetAddress: "0x2b86C32C9422329DF1289AeEdC8EbcD772b4CD4b",
};

const mnemonic = 'ece3c6b4c5bf161a00c45ee7f7aed1a00ed5a74bdd81320eeac1627362e32c58';
const wss = 'wss://apis.ankr.com/wss/ee01b8df310841d59303429b7579b5da/7fabeabb390c7b75d07b8e8cf9fcb68c/binance/full/main'; // wss://bsc-ws-node.nariox.org:443
const provider = new ethers.providers.WebSocketProvider(wss);
const wallet = new ethers.Wallet(mnemonic);
const account = wallet.connect(provider);
const myGasPrice = ethers.utils.parseUnits("5", "gwei");


const router = new ethers.Contract(
    addresses.router,
    [
        'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
    ],
    account
);

const originContract = new ethers.Contract(
    addresses.originAddress,
    [
        'function approve(address spender, uint amount) public returns(bool)',
    ],
    account
);

const testTx = async () => {
    console.log('after testtx');
    const tokenIn = addresses.originAddress , tokenOut = addresses.targetAddress;
    const amountIn = ethers.utils.parseUnits('0.001', 'ether'); //buying amount 0.001 BNB
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    //Our execution price will be a bit different, we need some flexbility
    const amountOutMin = amounts[1].sub(amounts[1].div(2));
    console.log(`
        Buying new token
        =================
        tokenIn: ${amountIn} ${tokenIn}
        tokenOut: ${amountOutMin} ${tokenOut}
    `);

    const tx = await router.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        [tokenIn, tokenOut],
        addresses.recipient,
        Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
        {
            "gasPrice": myGasPrice,
            "gasLimit": 300000
        }
    );
    console.log('line 115');
    const receipt = await tx.wait();
    console.log('Transaction receipt');
    console.log(receipt);
    console.log('Transaction amounts');
    console.log(amounts);
};

console.log('Before Approve');
const valueToApprove = ethers.utils.parseUnits('0.001', 'ether');

const init = async () => {
    const tx = await originContract.approve(
        account.address,
        valueToApprove,
        {
            gasPrice: myGasPrice,
            gasLimit: 300000
        }
    );
    console.log('After Approve');
    const receipt = await tx.wait();
    console.log('Transaction receipt');
    console.log(receipt);
    console.log('Run TEST-TX');
    testTx();
}

testTx();