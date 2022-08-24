// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./ERC721Complete.sol";
import "./ISneaker_ERC721.sol";
import "./ISneakerProbabilities.sol";
import "./IURIDatabase.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Sneaker_ERC721 is 
    ISneaker_ERC721,
    ERC721Complete,
    VRFConsumerBaseV2
{
    using Counters for Counters.Counter;
    Counters.Counter internal _tokenIdTracker;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Errors
    error InvalidAmountToMint();
    error invalidTokenID();
    error zeroAddress();
    error maxTokens();
    error notTokenOwner();
    
    uint32 constant public MAX_TOKENS = 10000;
    
    //For chainlink VRF v2
    VRFCoordinatorV2Interface private COORDINATOR;
    uint64 public s_subscriptionId;
    address private vrfCoordinator;
    bytes32 private keyHash;

    // Depends on the number of requested values that you want sent to the
    // fulfillRandomWords() function. Storing each word costs about 20,000 gas.
    // Max gas limit is 2,500,000
    uint32 private callbackGasLimit = 2500000;

    // The default is 3.
    uint16 private requestConfirmations = 3;

    // URI Database
    IURIDatabase private uriDatabase;

    // NFT Housekeeping and probability arrays set during deployment
    uint256 public currentGen;
    ISneakerProbabilities private sneakerProbs;

    // Mappings
    mapping(uint256 => address) private requestIdToSender;
    mapping(uint256 => uint256) private requestIdToNumMint;
    mapping(uint256 => SneakerStats) public tokenIdToSneakerStats;
    mapping(uint256 => uint256[5]) private requestIdToNumProbs;

    // Events
    event Mint(address indexed owner, uint256 indexed tokenId);

    constructor(
        string memory _name,
        string memory _symbol,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId,
        address _uriDatabase,
        address _sneakerProbs
    )
    VRFConsumerBaseV2(_vrfCoordinator)
    ERC721Complete(_name, _symbol, "")
    {
        // Chainlink VRF Coordinator
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        vrfCoordinator = _vrfCoordinator;

        // Key Hash corresponding to Chainlink VRF gas lane
        keyHash = _keyHash;

        // Subscription ID required for Chainlink VRF V2
        s_subscriptionId = _subscriptionId;
        
        // Set sender as default admin for now
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        
        // Set URI Database used for
        if(_uriDatabase == address(0)) revert zeroAddress();
        uriDatabase = IURIDatabase(_uriDatabase);

        sneakerProbs = ISneakerProbabilities(_sneakerProbs);
    }

    function mint(address to) public {
        // We cannot just use balanceOf to create the new tokenId because tokens
        // can be burned (destroyed), so we need a separate counter.
        if(_tokenIdTracker.current() >= MAX_TOKENS) revert maxTokens();

        // Generate new random number to assign to stats, finish mint in callback function.
        // Will revert if subscription is not set and funded.
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            1
        );

        requestIdToSender[requestId] = to;
        requestIdToNumMint[requestId] = 1;
        requestIdToNumProbs[requestId] = sneakerProbs.getMintProbs();
    }

    function batchMint(address to, uint32 amountToMint) public virtual onlyRole(MINTER_ROLE) {
        if (amountToMint == 0) revert InvalidAmountToMint();
        if (_tokenIdTracker.current() + amountToMint > MAX_TOKENS) revert InvalidAmountToMint();
        
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            21*10**4 * amountToMint + 21*10**4,
            amountToMint
        );
        requestIdToSender[requestId] = to;
        requestIdToNumMint[requestId] = amountToMint;
        requestIdToNumProbs[requestId] = sneakerProbs.getMintProbs();
    }

    function breed(uint256[] calldata tokenIds, address owner) public onlyRole(MINTER_ROLE) {
        // Generate new random number to assign to stats, finish mint in callback function.
        // Will revert if subscription is not set and funded.
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            1
        );

        requestIdToSender[requestId] = owner;
        requestIdToNumMint[requestId] = 1;

        requestIdToNumProbs[requestId] = sneakerProbs.getBreedProbs(
            currentGen == 0 ? 0 : 1,
            tokenIdToSneakerStats[tokenIds[0]].class,
            tokenIdToSneakerStats[tokenIds[1]].class
        );

        tokenIdToSneakerStats[tokenIds[0]].factoryUsed += 1;
        tokenIdToSneakerStats[tokenIds[1]].factoryUsed += 1;
    }

    function getSneakerStats(uint256 tokenId) public view returns(SneakerStats memory) {
        if( !_exists(tokenId)) revert invalidTokenID();
        return tokenIdToSneakerStats[tokenId];
    }

    function setCurrentGen(uint256 gen) external onlyRole(DEFAULT_ADMIN_ROLE) {
        currentGen =  gen;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        if( !_exists(tokenId)) revert invalidTokenID();
        return uriDatabase.tokenURI(tokenId);
    }

    function setUriDatabase(IURIDatabase _uriDatabase) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(_uriDatabase) == address(0)) revert zeroAddress();
        uriDatabase = _uriDatabase;
    }
    
    function setTokenURI(uint256 tokenId, string calldata uri) external {
        if( !_exists(tokenId)) revert invalidTokenID();
        if (ownerOf(tokenId) != msg.sender) revert notTokenOwner();
        uriDatabase.setTokenURI(tokenId, uri);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {

        SneakerStats memory newStats;
        address nftOwner = requestIdToSender[requestId];
        uint256 amountToMint = requestIdToNumMint[requestId];
        uint256[5] memory probs = requestIdToNumProbs[requestId];
        int256[] memory randomNorm = new int256[](3);

        for (uint256 i = 1; i <= amountToMint; i++) {
            // Set sneaker gen
            newStats.generation = uint32(currentGen);

            // Get class from random number
            newStats.class = sneakerProbs.getRandClass( 
                randomWords[i-1],
                probs
            );

            // Get normal values for stats
            randomNorm = sneakerProbs.NormalRNG( randomWords[i-1], newStats.class, 3 );

            // Assign random stats generated and sum up for global points
            newStats.running = uint32(uint256(randomNorm[0] / 3));
            newStats.walking = uint32(uint256(randomNorm[1] / 3));
            newStats.biking = uint32(uint256(randomNorm[2] / 3));
            newStats.globalPoints = newStats.running + newStats.walking + newStats.biking;
            newStats.energy = 100;

            _tokenIdTracker.increment();
            uint256 tokenId = _tokenIdTracker.current();
            tokenIdToSneakerStats[tokenId] = newStats;
            _safeMint(nftOwner, tokenId);
            emit Mint( nftOwner, tokenId );
        }
    }
}