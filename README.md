We see optimistic rollups left and right, but all of them are way more expensive than solana, and have much lower bandwidth. People are promising new DA layers, but even then it's hard to imagine a new network to scale to solana's level without sacrificing decentralization this early

That's why we have sol-op. Sol-op is optimism based rollup which settles transactions on solana as compressed nfts. Which unlocks an insane improvement over existing solutions and drastically reduces cost.

Solution is similar to bitcoin-da implementation for optimistic rollups:
https://github.com/rollkit/bitcoin-da/blob/main/go.mod

https://github.com/celestiaorg/optimism/tree/bitcoin-da

To run the solution, you just need to run everything like a regular optimistic rollup + solana node.js rest api server within this repository which handles compressed nfts.


It requires a lot of work on testing, setting up better deployment etc. And especially it needs a lot of work on up time, but afterwards sol-op can become the fastest&cheapest optimistic rollup in existence. 
