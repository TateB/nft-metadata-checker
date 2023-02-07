import resolveURI from "@/utils/resolveURI";
import {
  createPublicClient,
  decodeFunctionResult,
  encodeFunctionData,
  http,
  readContract,
} from "viem";
import { mainnet } from "viem/chains";

export const config = {
  runtime: "edge",
};

const client = createPublicClient({
  chain: {
    ...mainnet,
    rpcUrls: {
      ...mainnet.rpcUrls,
      default: {
        ...mainnet.rpcUrls.default,
        http: ["https://mainnet.infura.io/v3/fb056f5f6e304fd59aa054196f601d3a"],
      },
    },
  },
  transport: http(),
});

const MULTICALL_ABI = [
  {
    inputs: [
      {
        internalType: "bool",
        name: "requireSuccess",
        type: "bool",
      },
      {
        components: [
          {
            internalType: "address",
            name: "target",
            type: "address",
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes",
          },
        ],
        internalType: "struct Multicall3.Call[]",
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "tryAggregate",
    outputs: [
      {
        components: [
          {
            internalType: "bool",
            name: "success",
            type: "bool",
          },
          {
            internalType: "bytes",
            name: "returnData",
            type: "bytes",
          },
        ],
        internalType: "struct Multicall3.Result[]",
        name: "returnData",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ERC165_ABI = [
  {
    inputs: [
      {
        internalType: "bytes4",
        name: "interfaceId",
        type: "bytes4",
      },
    ],
    name: "supportsInterface",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ERC721_INTERFACE_ID = "0x80ac58cd";

const ERC721_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "tokenURI",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ERC1155_INTERFACE_ID = "0xd9b67a26";

const ERC1155_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "uri",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const getTokenMetadata = async (uri: string) => {
  const { type, uri: _uri, data } = resolveURI(uri);
  let resolvedData: Record<string, any> = data;
  if (_uri) {
    const response = await fetch(_uri).then((res) => res.json());
    resolvedData = response;
  }

  return {
    type,
    data: resolvedData,
  };
};

export default async function getMetadata(
  contractAddress: `0x${string}`,
  _tokenId: string
): Promise<
  | {
      type:
        | "onchain-encoded"
        | "ipns"
        | "ipfs"
        | "arweave"
        | "onchain"
        | "offchain";
      data: any;
    }
  | { error: string }
> {
  if (!contractAddress) {
    return { error: "contractAddress is required" };
  }

  if (!_tokenId) {
    return { error: "tokenId is required" };
  }

  const tokenId = BigInt(_tokenId);

  const isERC721Data = encodeFunctionData({
    abi: ERC165_ABI,
    functionName: "supportsInterface",
    args: [ERC721_INTERFACE_ID],
  });

  const isERC1155Data = encodeFunctionData({
    abi: ERC165_ABI,
    functionName: "supportsInterface",
    args: [ERC1155_INTERFACE_ID],
  });

  const uriForERC721Data = encodeFunctionData({
    abi: ERC721_ABI,
    functionName: "tokenURI",
    args: [tokenId],
  });

  const uriForERC1155Data = encodeFunctionData({
    abi: ERC1155_ABI,
    functionName: "uri",
    args: [tokenId],
  });

  const data = await readContract(client, {
    address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    abi: MULTICALL_ABI,
    functionName: "tryAggregate",
    args: [
      false,
      [
        { target: contractAddress, callData: isERC721Data },
        { target: contractAddress, callData: isERC1155Data },
        { target: contractAddress, callData: uriForERC721Data },
        { target: contractAddress, callData: uriForERC1155Data },
      ],
    ],
  });

  console.log("after");

  const isERC721Result = data[0].success
    ? decodeFunctionResult({
        abi: ERC165_ABI,
        functionName: "supportsInterface",
        data: data[0].returnData,
      })
    : false;

  if (isERC721Result) {
    const uriForERC721Result = data[2].success
      ? decodeFunctionResult({
          abi: ERC721_ABI,
          functionName: "tokenURI",
          data: data[2].returnData,
        })
      : null;
    if (!uriForERC721Result) {
      return { error: "tokenURI not found" };
    }
    const metadata = await getTokenMetadata(uriForERC721Result);
    if (!metadata) {
      return { error: "metadata returned undefined" };
    }
    return metadata;
  }

  const isERC1155Result = data[1].success
    ? decodeFunctionResult({
        abi: ERC165_ABI,
        functionName: "supportsInterface",
        data: data[1].returnData,
      })
    : false;

  if (!isERC1155Result) {
    return { error: "token was neither ERC721 or ERC1155" };
  }

  const uriForERC1155Result = data[3].success
    ? decodeFunctionResult({
        abi: ERC1155_ABI,
        functionName: "uri",
        data: data[3].returnData,
      })
    : null;
  if (!uriForERC1155Result) {
    return { error: "tokenURI not found" };
  }
  const metadata = await getTokenMetadata(
    uriForERC1155Result.replace("{id}", tokenId.toString())
  );
  if (!metadata) {
    return { error: "metadata returned undefined" };
  }
  return metadata;
}
