// const Web3 = require("web3")
declare global {
  interface Window {
    ethereum: any;
    web3: any;
    Web3: any
  }
}

export default async function() {
  // window.Web3 = Web3
  if (window.ethereum) {
    window.web3 = new window.Web3((window as any).ethereum);
    // await window.ethereum.enable()
  } else if ((window as any).web3) {
    window.web3 = new window.Web3((window as any).web3.currentProvider);
  } else {
    window.alert(
      "Non-Ethereum browser detected. You should consider trying MetaMask!"
    );
  }
  return (window as any).web3;
}