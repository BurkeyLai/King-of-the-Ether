const Web3 = require('web3');
const html = require('nanohtml');
const csjs = require('csjs-inject');
const morphdom = require('morphdom');

//if (typeof web3 !== 'undefined') {
  //web3 = new Web3(web3.currentProvider);
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://127.0.0.1:7545'));
//} else {
//  alert('initial failed');
//}

const ABI = require('./abi.json');
const DEFAULT_ADDRESS = '0x16E572331ad6973eC35618ea9CFFE529F78Ec23c';
const contractAddress = localStorage.constract || DEFAULT_ADDRESS;
const myContract = new web3.eth.Contract(ABI, contractAddress);


const css = csjs `
  .box {
    margin: 10px;
  }
  .input {
    margin-top: 10px;
    margin-right: 10px;
    width: 500px;
    font-size: 20px;
  }
  .button {
    margin-top: 10px;
    margin-right: 10px;
    font-size: 20px;
    width: 180px;
    background-color: #4CAF50;
    color: white;
  }
  .result {
    padding: 10px;
    font-size: 40px;
    color: red;
  }
  .amount {
    padding: 10px;
    font-size: 40px;
    color: blue;
  }
  img {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 5px;
    width: 150px;
  }
`

// ===== DOM element =====

const resultElement = html `<div></div>`
const withdrawalAmountElement = html `<div></div>`
const inputName = html `<input class=${css.input} type="text" placeholder="input your name"/>`;
const inputAmount = html `<input class=${css.input} type="number" placeholder="input ether amount"/>`;

// ===== utils =====
function getNetworkName(networkId) {
  if (networkId == 1) return "Main";
  else if (networkId == 3) return "Ropsten";
  else if (networkId == 42) return "Kovan";
  else if (networkId == 4) return "Rinkeby";
  else return "";
}

// ===== listening smart contract event =====

// Generate filter options
const options = {
  // filter: {
  //   _from: process.env.WALLET_FROM,
  //   _to: process.env.WALLET_TO,
  //   _value: process.env.AMOUNT
  // },
  fromBlock: 'latest'
}

myContract.events.NoticeNewKing(options, async (error, event) => {
  if (error) {
    console.log(error)
    return
  }
  console.log('event:', event);
  const ether = web3.utils.fromWei(event.returnValues.amount, "ether");
  const newElement = html `<div class="${css.result}">The king's name is ${event.returnValues.name}, amount is ${ether} Ether</div>`
  morphdom.default(resultElement, newElement);
  return
})

myContract.events.NoticePlayerWithdrawal(options, async (error, event) => {
  if (error) {
    console.log(error)
    return
  }
  console.log('event:', event);
  const ether = web3.utils.fromWei(event.returnValues.amount, "ether");
  const newElement = html `<div class="${css.amount}">The player's name is ${event.returnValues.name}, amount is ${ether} Ether</div>`
  morphdom.default(withdrawalAmountElement, newElement);
  return
})

myContract.events.NoticeOwnerWithdrawal(options, async (error, event) => {
  if (error) {
    console.log(error)
    return
  }
  console.log('event:', event);
  const ether = web3.utils.fromWei(event.returnValues.amount, "ether");
  const newElement = html `<div class="${css.amount}">The owner's name is ${event.returnValues.name}, amount is ${ether} Ether</div>`
  morphdom.default(withdrawalAmountElement, newElement);
  return
})

// ===== Click Event =====

function replaceKing(event) {
  let account = web3.eth.defaultAccount;
  let balance = web3.eth.getBalance(account);
  console.log('account: ', account);
  console.log('balance: ', balance);
  myContract.methods.replaceKing(inputName.value).send({
    from: account,
    gas:3000000,
    value: web3.utils.toWei(inputAmount.value, "ether")
  }, (err, data) => {
    if (err) return console.error(err);
    console.log('>>> replaceKing ok.');
  });
}

function playerWithdrawal(event) {
  let account = web3.eth.defaultAccount;
  myContract.methods.playerWithdrawal().send({
    from: account
  }, (err, data) => {
    if (err) return console.error(err);
    console.log('>>> playerWithdrawal ok.');
  });
}

// ===== Preload =====

function start() {
  console.log('=== start ===');
  getNetworkId({});
}

function getNetworkId(result) {
  console.log('>>> 1');
  web3.eth.net.getId(function (err, networkId) {
    result.networkId = networkId;
    getAccounts(result);
  });
}

function getAccounts(result) {
  console.log('>>> 2');
  web3.eth.getAccounts(function (err, addresses) {
    const address = addresses[1]; // With experiment, set index for changing different accounts
    web3.eth.defaultAccount = address;
    result.account = address;
    getKingInfo(result);
  });
}

function getKingInfo(result) {
  console.log('>>> 3');
  myContract.methods.kingInfo().call((err, data) => {
    if (err) return console.error(err);
    if (data.amount != "0") {
      const ether = web3.utils.fromWei(data.amount, "ether");
      const newElement = html `<div class="${css.result}">The king's name is ${data.name}, amount is ${ether} Ether</div>`
      morphdom.default(resultElement, newElement);
    }
    render(result);
  })
}

function render(result) {
  console.log('>>> result:', result);
  document.body.appendChild(html `
  <div class=${css.box} id="app">
    <h2>King of the Ether - ${getNetworkName(result.networkId)} Network</h2>
    <h3>Your account: ${result.account}</h3>
    <div>If you put more money here, you could be a King, too.</div>
    Name： ${inputName}<br>
    Amount： ${inputAmount}<br>
    <button class=${css.button} onclick=${replaceKing}>replace king</button>
    <button class=${css.button} onclick=${playerWithdrawal}>withdrawal</button>
    ${resultElement}
    ${withdrawalAmountElement}
  </div>
 `)
}

if (typeof web3 !== 'undefined') start();