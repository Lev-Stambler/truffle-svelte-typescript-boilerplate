// const SiteStore = artifacts.require("./SiteStore.sol");

// contract("SiteStore", (accounts) => {
//   it("should put some domains onto the DNS and then remove them", async () => {
//     const siteStore = await SiteStore.new();
//     await siteStore.addSiteToDNS("DDDD", "AAAA");
//     let res = await siteStore.dnsInUse("DDDD");
//     assert.equal(res.toString(), "true");
//     res = await siteStore.ipfsDNS("DDDD");
//     assert.equal(res.toString(), "AAAA");
//     await siteStore.deleteSiteDNS("DDDD");
//     res = await siteStore.dnsInUse("DDDD");
//     assert.equal(res.toString(), "false");
//   });
// });
