import styles from "@/styles/Home.module.css";
import Head from "next/head";
import { useRouter } from "next/router";
import { FormEventHandler } from "react";

export default function Home() {
  const router = useRouter();

  const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const contractAddress = data.get("contractAddress");
    const tokenId = data.get("tokenId");
    router.push(`/contract/${contractAddress}/${tokenId}`);
  };

  return (
    <>
      <Head>
        <title>nft metadata checker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <h1>nft metadata checker</h1>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="contractAddress">contract address</label>
          <input
            name="contractAddress"
            autoCapitalize="false"
            autoComplete="false"
            autoCorrect="false"
            type="text"
          />
          <label htmlFor="tokenId">token id</label>
          <input
            name="tokenId"
            autoCapitalize="false"
            autoComplete="false"
            autoCorrect="false"
            type="text"
          />
          <button type="submit">check</button>
        </form>
      </main>
    </>
  );
}
