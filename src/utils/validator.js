const validateAuction = (item, price) => {
    if (!item || price <= 0) throw new Error("Invalid auction parameters.");
};

const validateBid = (amount) => {
    if (amount <= 0) throw new Error("Invalid bid amount.");
};

module.exports = { validateAuction, validateBid };
