import styles from "@/styles/Contract.module.css";
import getMetadata from "@/utils/getMetadata";
import resolveURI from "@/utils/resolveURI";
import { Inter } from "@next/font/google";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

const inter = Inter({ subsets: ["latin"] });

type Data =
  | {
      type:
        | "onchain-encoded"
        | "ipns"
        | "ipfs"
        | "arweave"
        | "onchain"
        | "offchain";
      data: object;
    }
  | { error: string };

export const getServerSideProps: GetServerSideProps<
  { data: Data },
  { contractAddress: string; tokenId: string }
> = async ({ params }) => {
  if (!params) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  const data = await getMetadata(
    params.contractAddress as `0x${string}`,
    params.tokenId
  );

  return {
    props: {
      data,
    },
  };
};

const DataItem = ({ trait, value }: { trait: string; value: any }) => {
  const resolvedURI = typeof value === "string" ? resolveURI(value) : null;

  if (trait === "image" && resolvedURI) {
    return (
      <div>
        <p>
          {trait} - <a href={resolvedURI.uri}>from: {resolvedURI.type}</a>
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img
          style={{ maxWidth: "min(80vw, 200px)" }}
          src={resolvedURI.data || resolvedURI.uri}
        />
      </div>
    );
  }

  return (
    <div>
      {!resolvedURI?.type ||
      resolvedURI.type === "onchain" ||
      !resolvedURI.uri?.startsWith("http") ? (
        <p>{trait}</p>
      ) : (
        <p>
          {trait} - <a href={resolvedURI.uri}>from: {resolvedURI.type}</a>
        </p>
      )}
      <p>{JSON.stringify(value)}</p>
    </div>
  );
};

export default function Home({
  data,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const contractAddress = router.query.contractAddress;
  const tokenId = router.query.tokenId;

  return (
    <>
      <Head>
        <title>nft metadata checker</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <h1>nft metadata checker</h1>
        <div>
          <p>contract address / token id</p>
          <p>
            {contractAddress} / {tokenId}
          </p>
          <Link href="/">
            <button>change</button>
          </Link>
        </div>
        {"error" in data ? (
          <div>there was an error fetching results: {data.error}</div>
        ) : (
          <>
            <div>
              <p>metadata location</p>
              <p>{data.type}</p>
            </div>
            {Object.entries(data.data).map(([key, value]) => (
              <DataItem key={key} trait={key} value={value} />
            ))}
          </>
        )}
      </main>
    </>
  );
}
