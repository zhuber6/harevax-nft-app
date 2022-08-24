import { Contract } from "ethers";

export const CONTRACT_DEPLOYED_ADDRESS = import.meta.env.VITE_NFT_DEPLOYED_ADDRESS;

export async function getMetaDataToPin(sneakerContract: Contract, tokenID: number): Promise<string> {

  const ClassDict: string[] = [
    "Common",
    "Uncommon",
    "Rare",
    "Epic",
    "Legendary",
    "Mythic",
  ]

  const sneakerStats = await sneakerContract.getSneakerStats(tokenID);
  const jsonMetadata = JSON.stringify({
    "pinataMetadata": {
      "name": tokenID.toString()
    },
    "pinataContent": {
      "name": "Sneaker #" + tokenID.toString(),
      "description": "Komodo Sneakers",
      "image": "https://ipfs.io/ipfs/QmTiEvedx4NbZmPFnshKuvSv5VVc9CjCYYfYwxpwWcYmDx/" + tokenID % 12,
      "attributes": [
        {
          "trait_type": "Class",
          "value": ClassDict[sneakerStats.class],
        },
        {
          "trait_type": "Generation",
          "value": sneakerStats.generation,
        },
        {
          "trait_type": "Globalpoints",
          "value": sneakerStats.globalPoints,
        },
        {
          "trait_type": "Running",
          "value": sneakerStats.running,
        },
        {
          "trait_type": "Walking",
          "value": sneakerStats.walking,
        },
        {
          "trait_type": "Biking",
          "value": sneakerStats.biking,
        },
        {
          "trait_type": "Factoryused",
          "value": sneakerStats.factoryUsed,
        },
        {
          "trait_type": "Energy",
          "value": sneakerStats.energy,
        },
      ]
    }
  });

  return jsonMetadata;
}