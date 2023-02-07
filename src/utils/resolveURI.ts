import { base64 } from "rfc4648";
import isCID from "./isCID";
import urlJoin from "./urlJoin";

function decode(s: string): string {
  return new TextDecoder().decode(base64.parse(s, { loose: true }));
}

const networkRegex =
  /(?<protocol>ipfs:\/|ipns:\/|ar:\/)?(?<root>\/)?(?<subpath>ipfs\/|ipns\/)?(?<target>[\w\-.]+)(?<subtarget>\/.*)?/;
const base64Regex = /^data:([a-zA-Z\-/+]*);base64,([^"].*)/;
const dataURIRegex = /^data:([a-zA-Z\-/+]*)?(;[a-zA-Z0-9].*?)?(,)/;

const ipfsGateway = "https://cloudflare-ipfs.com";
const arweaveGateway = "https://arweave.net";

const resolveURI = (
  uri: string
): {
  type:
    | "onchain-encoded"
    | "ipns"
    | "ipfs"
    | "arweave"
    | "onchain"
    | "offchain";
  uri: string | undefined;
  data?: any;
} => {
  const isEncoded = base64Regex.test(uri);
  if (isEncoded) {
    const [, encoded] = uri.split(",");
    const decoded = decode(encoded);
    return {
      type: "onchain-encoded",
      uri: undefined,
      data: JSON.parse(decoded),
    };
  }

  try {
    const parsed = JSON.parse(uri);
    return { type: "onchain", uri: undefined, data: parsed };
  } catch (e) {}

  const ipfsRegexpResult = uri.match(networkRegex);
  const {
    protocol,
    subpath,
    target,
    subtarget = "",
  } = ipfsRegexpResult?.groups || {};

  if ((protocol === "ipns:/" || subpath === "ipns/") && target) {
    return {
      type: "ipns",
      uri: urlJoin(ipfsGateway, "ipns", target, subtarget),
    };
  } else if (isCID(target)) {
    return {
      type: "ipfs",
      uri: urlJoin(ipfsGateway, "ipfs", target, subtarget),
    };
  } else if (protocol === "ar:/" && target && subtarget) {
    return { type: "arweave", uri: urlJoin(arweaveGateway, target, subtarget) };
  }

  return { type: "offchain", uri: uri.replace(dataURIRegex, "") };
};

export default resolveURI;
