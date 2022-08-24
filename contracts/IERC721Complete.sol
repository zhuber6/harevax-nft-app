// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IERC721Complete
{
    /**
     * @dev See {IERC721Enumerable-tokenOfOwnerByIndex}.
     */
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);

    /**
     * @dev See {IERC721Enumerable-totalSupply}.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev See {IERC721Enumerable-tokenByIndex}.
     */
    function tokenByIndex(uint256 index) external view returns (uint256);

    function tokensOfOwner(address _owner) external view returns(uint256[] memory );
}