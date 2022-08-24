// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface ISneakerProbabilities {
    function getBreedProbs(uint256 generation, uint256 class1, uint256 class2) external view returns (uint256[5] memory);
    function getMintProbs() external view returns (uint256[5] memory);
    function getRandClass(uint256 randomNum, uint256[5] calldata probs) external pure returns ( uint32 );
    function NormalRNG(
        uint256 randomNum,
        uint32 _index,
        uint256 _n
    ) external view returns (int256[] memory);
    function expand(uint256 randomValue, uint256 n) external pure returns (uint256[] memory);
}