---
title: ogGIT
tagline: Git the way it started, peer to peer, with no server in the middle.
year: "2026"
kind: Decentralized Git
stack: [Rust, Tokio, Iroh, QUIC, gitoxide, Ed25519, BLAKE3]
order: 10
---
A Rust daemon and a Git remote helper that replicate ordinary Git repositories between peers. There are no accounts and no central server: every developer is a key, and every peer writes only to its own signed namespace.

- Plain git just works: git clone p2p://, push and fetch
- A push is signed locally and announced over gossip, then peers pull the difference
- Maintainers and a signature threshold live in a signed identity document, so the main branch is agreed on, not owned
- Issues and patches travel with the code and work offline
