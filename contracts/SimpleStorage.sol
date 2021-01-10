pragma solidity ^0.7.0;

contract SimpleStorage {
    event StorageSet(string _message);

    uint public storedData;

    function setStore(uint x) public {
        storedData = x;

        emit StorageSet("Data stored successfully!");
    }

    function get() view public returns (uint retVal) {
        return storedData;
    }
}