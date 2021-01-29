export async function initAPI<T>(web3, Contract) {
  return await loadBlockchainData<T>(web3, Contract);
}

async function loadBlockchainData<T>(web3, Contract) {
  const accounts = (await window.ethereum.send("eth_requestAccounts")).result;
  let accountIdx = 0;
  if (accounts.length > 1) {
    accountIdx =
      parseInt(
        prompt(
          `Looks like you have ${accounts.length} number accounts connected. From 1 to ${accounts.length}, which account would you like to connect?`,
          "1"
        )
      ) - 1;
  }
  const address = accounts[0];
  const networkId = await window.web3.eth.net.getId();
  
  const contractData = Contract.networks[networkId];
  if (contractData) {
    const contract: T = (new web3.eth.Contract(
      Contract.abi,
      contractData.address
    ) as any) as T;
    return {
      Contract: contract,
      address,
    };
  } else {
    alert(
      "Please use a web3.js enabled browser and make sure that the contract is loaded"
    );
    throw "Please use a web3.js enabled browser and make sure that the contract is loaded";
  }
}
