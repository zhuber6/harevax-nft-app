import * as Sentry from "@sentry/react";
import { useWeb3React, Web3ReactProvider } from "@web3-react/core";
import { BigNumber, Contract, ethers, getDefaultProvider } from "ethers";
import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { NftProvider } from "use-nft";

import Sneaker_ERC721_Artifacts from "./artifacts/contracts/Sneaker_ERC721.sol/Sneaker_ERC721.json";
import {getMetaDataToPin} from "./utils/getMetaDataToPin";
import AddItemModal from "./components/AddItemModal";
import Demo from "./components/Demo";
import { getLibrary } from "./components/Demo";
import { Nft } from "./components/Nft";
import { Pagination } from "./components/Pagination";
import logger from "./logger";
import { networkName, CHAIN_ID } from "./networkName";
import { Sneaker_ERC721 } from "./types";

export const CONTRACT_DEPLOYED_ADDRESS = import.meta.env.VITE_NFT_DEPLOYED_ADDRESS;

declare global {
  interface Window {
    ethereum: ethers.providers.ExternalProvider;
  }
}

async function requestAccount() {
  if (window.ethereum?.request) return window.ethereum.request({ method: "eth_requestAccounts" });

  throw new Error("Missing install Metamask. Please access https://metamask.io/ to install extension on your browser");
}

const API_URL = import.meta.env.VITE_API_URL;
const VITE_PINATA_API_URL = import.meta.env.VITE_PINATA_API_URL;
const JWT = import.meta.env.VITE_PINATA_JWT;

function NFTApp() {
  const { library, account } = useWeb3React();
  const [total, setTotal] = useState(0);
  const [blockNumMint, setBlockNumMint] = useState(0);
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const limit = 12;

  const fetchTotal = () => {
    logger.warn("fetchTotal");
    const provider = library || new ethers.providers.Web3Provider(window.ethereum);
    const providerContract = new ethers.Contract(
      CONTRACT_DEPLOYED_ADDRESS,
      Sneaker_ERC721_Artifacts.abi,
      provider
    ) as Sneaker_ERC721;
    providerContract?.totalSupply()
      .then((result) => {
        if (total != result.toNumber()) {
          setTotal(BigNumber.from(result).toNumber());
        }
      })
      .catch(logger.error);
  };

  useEffect(() => {
    try {
      fetchTotal();
    } catch (error) {
      logger.error(error);
    }
  }, [library]);
  
  useEffect(() => {
    // try {
      const provider = library || new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const signerContract = new ethers.Contract(
        CONTRACT_DEPLOYED_ADDRESS,
        Sneaker_ERC721_Artifacts.abi,
        signer
      ) as Sneaker_ERC721;
      // provider.once("block", () => {
        // factoryContract.on('TokenCreated', newToken);
        // signerContract?.on('Mint', async (owner: string, tokenId: number, event) => {
        
        const onMintEvent = async (owner: string, tokenId: number) => { 
        const json = await getMetaDataToPin(signerContract, tokenId);
        const ipfsHash =  await pinJsonToPinata(json);
        const tx = await signerContract?.setTokenURI(tokenId, "https://ipfs.io/ipfs/" + ipfsHash);
        toast.promise(tx.wait(), {
          loading: `Transaction submitted. Wait for confirmation...`,
          success: <b>Transaction confirmed!</b>,
          error: <b>Transaction failed!.</b>,
        });
      }

      // ***************************************************************
      // ***** FIXME: This is getting called twice for some reason *****
      // ***************************************************************
      signerContract?.on('Mint', onMintEvent);
      
      return () => {
        library?.off('Mint')
      }
    // } catch (error) {
    //   logger.error(error);
    // }
  }, []);

  const pinJsonToPinata = async (json: string) => {
    toast("Pinning JSON... Please wait for a moment!");
    const headersdata = new Headers();
    headersdata.append('Content-Type', 'application/json');
    headersdata.append("Authorization", "Bearer " + JWT);
    const jsonData = json;

    setIsOpen(false);
    const response = await fetch(VITE_PINATA_API_URL ? VITE_PINATA_API_URL + "/pinning/pinJSONToIPFS" : "/api/nft/upload", {
      method: "POST",
      headers: headersdata,
      body: jsonData,
    });
    const result = await response.json();
    console.log(result);
    if (result.error) {
      toast.error(result.message);
    }
    return result.IpfsHash;
  }

  const onMintNftTokeN = async () => {
    const provider = library || new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const signerContract = new ethers.Contract(
      CONTRACT_DEPLOYED_ADDRESS,
      Sneaker_ERC721_Artifacts.abi,
      signer
    ) as Sneaker_ERC721;
    // get current account
    try {
      if (!account) {
        await requestAccount();
        // TODO: support retry after account is selected
        return;
      }
      const transaction = await signerContract.mint(account);
      // signerContract.removeAllListeners('Mint');
      toast.promise(transaction.wait(), {
        loading: `Transaction submitted. Wait for confirmation...`,
        success: <b>Transaction confirmed!</b>,
        error: <b>Transaction failed!.</b>,
      });

      // refetch total token after processing
      transaction
        .wait()
        .then(() => fetchTotal())
        .catch(logger.error);
    } catch (error) {
      logger.error(error);
    }
  };

  return (
    <div>
      <h2 className="my-4 text-4xl font-bold">
        NFT Items
        <button
          type="button"
          // onClick={() => setIsOpen(true)}
          onClick={() => onMintNftTokeN()}
          className="ml-2 btn btn-lg hover:btn-active hover:text-green-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Mint NFT
        </button>
      </h2>

      {/* <AddItemModal
        isOpen={isOpen}
        onAdd={(formData) => {
          onUpload({
            name: formData.name,
            description: formData.description
          })
            .then((result) => {
              if (result.url) {
                // TODO: mit a token
                toast.success(`Uploaded ${result.url}`);
                return onMintNftTokeN(result.url);
              }
            })
            .catch(logger.error);
        }}
        onClose={() => setIsOpen(false)}
      /> */}



      <div className="container grid gap-2 xl:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
        {Array.from(Array(limit).keys())
          .filter((i) => i + 1 + (page - 1) * limit < total)
          .map((i) => (
            <Nft key={i} tokenId={String(i + 1 + (page - 1) * limit)} />
          ))}
      </div>
      <Pagination currentPage={page} totalPage={Math.ceil(total / limit)} onChange={setPage} />
    </div>
  );
}

const ethersConfig = {
  provider: getDefaultProvider(networkName[Number(CHAIN_ID)] || "homestead"),
};

function App() {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Toaster position="top-right" />
      <NftProvider fetcher={["ethers", ethersConfig]}>
        <div className="container mx-auto">
          <Demo />
          <NFTApp />
          <footer className="p-10 footer bg-base-200 text-base-content">
            <div>
              <p>
                ProductsWay
                <br />
                Built with love from{" "}
                <a className="link" href="https://github.com/jellydn">
                  jellydn
                </a>
              </p>
            </div>
            <div>
              <span className="footer-title">Document</span>
              <a
                href="https://vitejs.dev/guide/features.html"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-hover"
              >
                Vite Docs
              </a>
              <a href="https://hardhat.org/" target="_blank" rel="noopener noreferrer" className="link link-hover">
                Hardhat
              </a>
              <a href="https://daisyui.com/" target="_blank" rel="noopener noreferrer" className="link link-hover">
                daisyUI
              </a>
              <a
                href="https://github.com/NoahZinsmeister/web3-react"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-hover"
              >
                Web3 React
              </a>
            </div>
            <div>
              <span className="footer-title">1-click Deployment</span>
              <a
                className="pl-2"
                href="https://vercel.com/new/git/external?repository-url=https://github.com/jellydn/nft-app/"
              >
                <img src="https://vercel.com/button" alt="Deploy with Vercel" />
              </a>
            </div>
          </footer>
        </div>
      </NftProvider>
    </Web3ReactProvider>
  );
}

export default Sentry.withErrorBoundary(App, { fallback: <p>an error has occurred</p> });
