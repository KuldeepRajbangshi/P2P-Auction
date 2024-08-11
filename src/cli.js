// src/cli.js
const readline = require('readline');
const RPC = require('@hyperswarm/rpc');
const Hyperswarm = require('hyperswarm');
const crypto = require('hypercore-crypto');
const logger = require('./utils/logger');
const b4a = require('b4a');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    try {
        // await startService();
        const serverPublicKey = Buffer.from("eebd54a595c57fd1a83f05b01e927686920717c96c9ba27777c861d988c1a1b1", 'hex');
        const swarm = new Hyperswarm();

        // Join the same topic to discover peers
        const topic = b4a.from('auction-room', 'hex');

        const conns = []
        swarm.on('connection', conn => {
            const name = b4a.toString(conn.remotePublicKey, 'hex')
            console.log('* got a connection from:', name, '*')
            conns.push(conn)
            conn.once('close', () => conns.splice(conns.indexOf(conn), 1))
            conn.on('data', data => console.log(`${name}: ${data}`))
            conn.on('error', e => console.log(`Connection error: ${e}`))
        })
        const discovery = swarm.join(topic, { client: true, server: false })

        // The flushed promise will resolve when the topic has been fully announced to the DHT
        discovery.flushed().then(() => {
            console.log('joined topic:', b4a.toString(topic, 'hex'));
            console.log('Swarm On Connection..............................:' + JSON.stringify(swarm.connections));
            const rpcClient = new RPC(swarm);

            const displayMenu = () => {
                console.log(`
                Auction Actions:
                1. Open an auction
                2. Place a bid
                3. Close an auction
                4. Get auction details
                5. Exit
            `);

                rl.question('Select an action by number: ', async (option) => {
                    let item, price, auctionId, amount;
                    switch (option) {
                        case '1':
                            rl.question('Enter item name and price (e.g., Artwork 300): ', async (input) => {
                                [item, price] = input.split(' ');
                                logger.info(`Received input, item: ${item}, price: ${parseFloat(price)}`)
                                logger.info("Server public key: " + serverPublicKey);
                                const payload = {
                                    item,
                                    price: parseFloat(price)
                                }
                                const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8')
                                const res = await rpcClient.request(serverPublicKey, 'auction/open', payloadRaw);
                                const parsedResponse = JSON.parse(res.toString('utf-8'))
                                logger.info(`Auction opened: ${JSON.stringify(parsedResponse)}`);
                                displayMenu();
                            });
                            break;
                        case '2':
                            rl.question('Enter auction ID and bid amount (e.g., 1234 250): ', async (input) => {
                                [auctionId, amount] = input.split(' ');
                                console.log(`Received input, auctionId: ${auctionId}, amount: ${amount}`)
                                const payload = {
                                    auctionId,
                                    amount: parseFloat(amount),
                                    bidderPublicKey: "4bf89922375b5ba77462366ad69ee4063a0e263ce896e79a1bc60b23c7484d40"
                                }
                                const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8')
                                const result = await rpcClient.request(serverPublicKey, 'auction/bid', payloadRaw);
                                const parsedResponse = JSON.parse(result.toString('utf-8'))
                                logger.info(`Bid placed: ${JSON.stringify(parsedResponse)}`);
                                displayMenu();
                            });
                            break;
                        case '3':
                            rl.question('Enter auction ID to close: ', async (auctionId) => {
                                console.log(`Received input, auctionId: ${auctionId}`);
                                const payload = {
                                    auctionId
                                }
                                const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8')
                                const result = await rpcClient.request(serverPublicKey, 'auction/close', payloadRaw);
                                const parsedResponse = JSON.parse(result.toString('utf-8'))
                                logger.info(`Auction closed: ${JSON.stringify(parsedResponse)}`);
                                displayMenu();
                            });
                            break;
                        case '4':
                            rl.question('Enter auction ID for details: ', async (auctionId) => {
                                console.log(`Received input, auctionId: ${auctionId}`);
                                const payload = {
                                    auctionId
                                }
                                const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8')
                                const result = await rpcClient.request(serverPublicKey, 'auction/details', payloadRaw);
                                const parsedResponse = JSON.parse(result.toString('utf-8'))
                                logger.info(`Auction details: ${JSON.stringify(parsedResponse)}`);
                                displayMenu();
                            });
                            break;
                        case '5':
                            rpcClient.destroy();
                            rl.close();
                            break;
                        default:
                            console.log('Invalid option. Please try again.');
                            displayMenu();
                    }
                });
            };

            displayMenu();
        });
        console.log('Swarm joined..............................');

    } catch (error) {
        logger.error(`Failed to start CLI: ${error.message}`);
    }
}

main().catch(error => logger.error(`Failed to start CLI: ${error.message}`));
