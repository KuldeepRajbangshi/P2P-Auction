# P2P-Auction
This project is a Peer-to-Peer (P2P) auction system utilizing Hyperswarm and Hyperbee. It enables multiple peers to join a shared network, create auctions, place bids, and broadcast updates to all connected peers.
The project is not completed, Partial code is there in the master branch which can be improved upon
## Features

- **Open Auction**: Peers can start a new auction by specifying an item and a starting price.
- **Place Bid**: Peers can place bids on existing auctions.
- **Close Auction**: Auction owners can close their auctions and notify all peers of the final bid.
- **View Auction Details**: Peers can retrieve details of an auction, including current bids.

## Technologies Used

- [Hyperswarm](https://www.npmjs.com/package/hyperswarm): A networking library for P2P applications.
- [Hypercore](https://www.npmjs.com/package/hypercore): A foundational append-only log for storing data.
- [Hyperbee](https://www.npmjs.com/package/hyperbee): A key/value store built on top of Hypercore.
- [Node.js](https://nodejs.org/): A JavaScript runtime built on Chrome's V8 JavaScript engine.

## Installation

1. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd <repository-name>

## Steps:
- 1.npm i
- 2. node src/actionService.js
- 3.Go to a different terminal to open a client and do node src/cli.js
