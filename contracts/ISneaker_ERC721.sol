// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ISneaker_ERC721 {
    enum Class {
        Common,
        Uncommon,
        Rare,
        Epic,
        Legendary,
        Mythic
    }

    struct SneakerStats {
        uint32 class;
        uint32 generation;
        uint32 globalPoints;
        uint32 running;
        uint32 walking;
        uint32 biking;
        uint32 factoryUsed;
        uint32 energy;
    }

    function mint(address to) external;
    function batchMint(address to, uint32 amountToMint) external;
    function breed(uint256[] calldata tokenIds, address owner) external;
    function getSneakerStats(uint256 tokenId) external view returns(SneakerStats memory);
    function setCurrentGen(uint256 gen) external;
    function setTokenURI(uint256 tokenId, string calldata uri) external;
}