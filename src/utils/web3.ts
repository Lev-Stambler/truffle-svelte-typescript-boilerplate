
export default async function () {

  if ((window as any).ethereum) {
    (window as any).web3 = new window.Web3((window as any).ethereum);
    // await window.ethereum.enable()
  } else if ((window as any).web3) {
    (window as any).web3 = new window.Web3((window as any).web3.currentProvider);
  } else {
    window.alert(
      "Non-Ethereum browser detected. You should consider trying MetaMask!"
    );
  }
  return (window as any).web3;
}
