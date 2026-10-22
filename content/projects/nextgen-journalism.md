---
title: nextGENjournalism
tagline: A news platform where journalists stake their reputation on what they claim.
year: "2026"
kind: Decentralized news
stack: [Rust, Next.js, TypeScript, CometBFT, IPFS, OrbitDB, PostgreSQL, WebAuthn]
order: 20
---
A decentralized news platform for independent journalists. Articles are immutable and link into a graph, and every journalist is ranked by an open, content-neutral reputation score built from verified reads, citations and the claims they choose to stake on.

- Claims are judged by Proof-of-Reputation: a random committee votes in secret, with one open appeal to every eligible user
- A claim proven false turns its article red: it stops counting and can no longer be cited
- One account per real person, proven with blind credentials so nobody can link a person to an account
- No token and no gas: a signed log run by Rust nodes, designed to migrate to its own chain
