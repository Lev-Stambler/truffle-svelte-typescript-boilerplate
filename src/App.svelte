<script lang="ts">
  import loadWeb3 from "./utils/web3";
  import { onMount } from "svelte";
  import { initAPI } from "./utils/api";
  import type { SimpleStorage } from "./types/SimpleStorage";
  import SimpleStorageContract from "../build/contracts/SimpleStorage.json";

  let storageValue: any;
  let simpleStorage: SimpleStorage;
  let connected = false;
  let web3;
  let address: string;

  onMount(async () => {
    const instance = await loadWeb3();
    window["web3"] = web3 = instance;
    const ret = await initAPI<SimpleStorage>(web3, SimpleStorageContract);
    simpleStorage = ret.Contract;
    address = ret.address;
    await setDefaultVal();
    storageValue = await simpleStorage.methods.get().call();
  });

  async function setDefaultVal() {
    await simpleStorage.methods.setStore(5).send({ from: address });
  }
</script>

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

<style>
  .masthead {
    margin-top: 3em;
  }
</style>
