const HDWalletProvider = require('truffle-hdwallet-provider-privkey');

let privateKey = process.env.PRIVATE_KEY
let endpointUrl = "YOUR_END_POINT_HERE"

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 7545,
      network_id: "*", // Match any network id
    },
    kovan: {
      provider: function() {
        return new HDWalletProvider(
          //private keys array
          [privateKey],
          //url to ethereum node
          endpointUrl
        )
      },
  },
  compilers: {
    solc: {
      version: "0.7.0",
    },
  },
};
