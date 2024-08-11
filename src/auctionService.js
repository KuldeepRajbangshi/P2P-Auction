// src/auctionService.js
const RPC = require('@hyperswarm/rpc');
const Hyperswarm = require('hyperswarm');
const Hypercore = require('hypercore');
const Hyperbee = require('hyperbee');
const crypto = require('hypercore-crypto');
const logger = require('./utils/logger');
const { validateAuction, validateBid } = require('./utils/validator');
const b4a = require('b4a');

let rpc, hbee, swarm, serverPublicKey;

// Function to initialize the service
async function startService() {
    try {
        const hcore = new Hypercore(`./data/${crypto.randomBytes(4).toString('hex')}`, { valueEncoding: 'json' });
        hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'json' });
        await hbee.ready();

        // Initialize the Hyperswarm instance
        swarm = new Hyperswarm();

        // Generate a discovery key for the auction topic
        const topic = b4a.from('auction-room', 'hex')
        // Keep track of all connections and console.log incoming data
        const conns = []
        swarm.on('connection', conn => {
            const name = b4a.toString(conn.remotePublicKey, 'hex')
            console.log('* got a connection from:', name, '*')
            conns.push(conn)
            conn.once('close', () => conns.splice(conns.indexOf(conn), 1))
            conn.on('data', data => console.log(`${name}: ${data}`))
            conn.on('error', e => console.log(`Connection error: ${e}`))
        })


        // Join the swarm with the generated topic
        swarm.join(topic, {
            client: false,
            server: true
        });

        // Wait for the swarm to fully announce the topic to the DHT
        await swarm.flush();
        logger.info('Joined the swarm, topic:', topic.toString('hex'));

        // Create an RPC server connected to the swarm
        rpc = new RPC(swarm);
        const server = rpc.createServer();
        await server.listen();
        serverPublicKey = server.publicKey;

        // Handle incoming requests for auction actions
        server.respond('auction/open', async (reqRaw) => {
            logger.info("Received auction/open request");
            const { item, price } = JSON.parse(reqRaw.toString('utf-8'));
            const result = await openAuction(item, price);
            return Buffer.from(JSON.stringify(result), 'utf-8');
        });

        server.respond('auction/bid', async (reqRaw) => {
            logger.info("Received auction/bid request");
            const { auctionId, amount, bidderPublicKey } = JSON.parse(reqRaw.toString('utf-8'));
            const result = await placeBid(auctionId, amount, bidderPublicKey);
            return Buffer.from(JSON.stringify(result), 'utf-8');
        });

        server.respond('auction/close', async (reqRaw) => {
            logger.info("Received auction/close request");
            const { auctionId } = JSON.parse(reqRaw.toString('utf-8'));
            const result = await closeAuction(auctionId);
            return Buffer.from(JSON.stringify(result), 'utf-8');
        });

        server.respond('auction/details', async (reqRaw) => {
            logger.info("Received auction/details request");
            const { auctionId } = JSON.parse(reqRaw.toString('utf-8'));
            const result = await getAuctionDetails(auctionId);
            return Buffer.from(JSON.stringify(result), 'utf-8');
        });

        logger.info(`RPC server started, public key: ${serverPublicKey.toString('hex')}`);
    } catch (error) {
        console.log(error);
    }
}

// Function to open an auction
async function openAuction(item, price) {
    validateAuction(item, price);
    const auctionId = crypto.randomBytes(16).toString('hex');
    await hbee.put(auctionId, { item, price, status: 'open', bids: [] });
    await broadcast('auction/open', { auctionId, item, price });
    return { status: 'success', auctionId };
}

// Function to place a bid on an auction
async function placeBid(auctionId, amount, bidderPublicKey) {
    validateBid(amount);
    const auction = await hbee.get(auctionId);
    if (!auction || auction.value.status !== 'open') {
        throw new Error('Auction not found or not open');
    }
    auction.value.bids.push({ amount, bidder: bidderPublicKey });
    await hbee.put(auctionId, auction.value);
    console.log("Total swarm conenctions:::" + JSON.stringify(swarm.connections))
    await broadcast('auction/bid', { auctionId, amount, bidder: bidderPublicKey });
    return { status: 'success' };
}

// Function to close an auction
async function closeAuction(auctionId) {
    const auction = await hbee.get(auctionId);
    if (!auction || auction.value.status !== 'open') {
        throw new Error('Auction not found or not open');
    }
    auction.value.status = 'closed';
    await hbee.put(auctionId, auction.value);
    await broadcast('auction/close', { auctionId });
    return { status: 'success' };
}

// Function to get the details of an auction
async function getAuctionDetails(auctionId) {
    const auction = await hbee.get(auctionId);
    if (!auction) {
        throw new Error('Auction not found');
    }
    return { status: 'success', auction: auction.value };
}

// Broadcast a message to all connected peers
async function broadcast(event, data) {
    console.log(`Inside the broadcast method, event: ${event}, data: ${data}, swarm: ${JSON.stringify(swarm.connections)}`)
    swarm.connections.forEach(async (conn) => {
        console.log(`The conenction is: ${conn} and remotePublic Key is ${conn.remotePublicKey}`);
        const rpcClient = new RPC(conn);
        try {
            const payloadRaw = Buffer.from(JSON.stringify(data), 'utf-8');
            await rpcClient.request(serverPublicKey, event, payloadRaw);
        } catch (err) {
            logger.error(`Error broadcasting to peer: ${err.message}`);
        }
    });
}
startService();
module.exports = {
    startService,
    getServerPublicKey: () => serverPublicKey.toString('hex')
};
