<script lang="ts">
  // import Information from "./components/Information.svelte";
  import SimpleStorageContract from "../build/contracts/SimpleStorage.json";
  import loadWeb3 from "./utils/web3";
  import { onMount } from "svelte";

  let storageValue : any;
  let connected = false;
  let web3;

  onMount(async () => {
    const instance = await loadWeb3();
    window["web3"] = web3 = instance;
    await loadBlockchainData();
  });

  async function loadBlockchainData() {
    const accounts = (await window.ethereum.send('eth_requestAccounts')).result;
    const networkId = await window.web3.eth.net.getId();
    const simpleStorageData = (SimpleStorageContract).networks[networkId];
    if (simpleStorageData) {
      const simpleStorage = new web3.eth.Contract(
        SimpleStorageContract.abi,
        simpleStorageData.address
      );
      console.log(simpleStorage.methods)
      await simpleStorage.methods.setStore(5).send({from: accounts[0]})
      storageValue = await simpleStorage.methods.storedData().call()
      console.log(storageValue)
      connected = true
    } else {
      window.alert("Simple Storage contract not deployed to detected network.");
    }
  }
</script>

<style>
  .masthead {
    margin-top: 3em;
  }
</style>

<div class="container">
  <div class="row">
    <div class="col-8 offset-2">
      <h1 class="masthead text-center text-dark">Truffle Box</h1>
      <h4 class="text-center text-primary">Skeleton SvelteJS truffle box</h4>

      <!-- <Information {connected} /> -->

      <div class="alert alert-secondary">
        <h4>Smart Contract Example</h4>
        <p>
          If your contracts compiled and migrated successfully, below will show
          a stored value of 5 (by default).
        </p>
        
        <p>The stored value is: {storageValue}</p>
      </div>
    </div>
  </div>
</div>