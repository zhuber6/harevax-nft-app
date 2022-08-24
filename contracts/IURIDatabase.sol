// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IURIDatabase {
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function setTokenURI(uint256 tokenId, string calldata _tokenURI) external;
}