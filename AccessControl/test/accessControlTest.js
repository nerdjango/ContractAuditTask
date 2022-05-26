const MockAccessControl = artifacts.require("Minion");

const truffleAssert = require("truffle-assertions");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:7545"))

const timeTravel = function(time) {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: "2.0",
            method: "evm_increaseTime",
            params: [time], // 86400 is the number of seconds in a day
            id: new Date().getTime()
        }, (err, result) => {
            if (err) { return reject(err) }
            return resolve(result)
        })
    })
}

contract("AccessControl", (accounts) => {
    it("should confirm that contract owner is equal to account 0", async() => {
        const accessControl = await MockAccessControl.deployed();
        const owner = await accessControl.owner();
        assert.equal(owner, accounts[0]);
    });
    it("should only allow users contribute amounts between 0.1 to 0.2 ether to the contract for 1 minute after every minute from the first minute of the hour", async() => {
        const accessControl = await MockAccessControl.deployed();
        const timeValAtStart = await accessControl.timeVal();
        let numberOfSecAfterInterval = parseInt(timeValAtStart.toString()) % 120;

        if (numberOfSecAfterInterval >= 0 && numberOfSecAfterInterval < 60) {
            await truffleAssert.reverts(accessControl.pwn({ value: web3.utils.toWei("0.09", "ether"), from: accounts[1] }));
            await truffleAssert.reverts(accessControl.pwn({ value: web3.utils.toWei("0.21", "ether"), from: accounts[1] }));
            await truffleAssert.passes(accessControl.pwn({ value: web3.utils.toWei("0.1", "ether"), from: accounts[1] }));
        } else {
            await truffleAssert.reverts(accessControl.pwn({ value: web3.utils.toWei("0.1", "ether"), from: accounts[1] }));
            await timeTravel(60); // travel 1 minute ahead (works with ganache)
            await truffleAssert.reverts(accessControl.pwn({ value: web3.utils.toWei("0.09", "ether"), from: accounts[1] }));
            await truffleAssert.reverts(accessControl.pwn({ value: web3.utils.toWei("0.21", "ether"), from: accounts[1] }));
            await truffleAssert.passes(accessControl.pwn({ value: web3.utils.toWei("0.1", "ether"), from: accounts[1] }));
        }

        assert.equal(await accessControl.getContributionAmount(accounts[1]), web3.utils.toWei("0.1", "ether"));
    });
    it("should pwn users with contributions of 1 ether and above", async() => {
        const accessControl = await MockAccessControl.deployed();

        const timeValAtStart = await accessControl.timeVal();
        let numberOfSecAfterInterval = parseInt(timeValAtStart.toString()) % 120;
        if (numberOfSecAfterInterval >= 0 && numberOfSecAfterInterval < 60) {
            await truffleAssert.passes(accessControl.pwn({ value: web3.utils.toWei("0.2", "ether"), from: accounts[1] }));
            await truffleAssert.passes(accessControl.pwn({ value: web3.utils.toWei("0.2", "ether"), from: accounts[1] }));
            assert.equal(await accessControl.verify(accounts[1]), false);
            await timeTravel(120); // travel 1 minute ahead (works with ganache)

            await truffleAssert.passes(accessControl.pwn({ value: web3.utils.toWei("0.2", "ether"), from: accounts[1] }));
            await truffleAssert.passes(accessControl.pwn({ value: web3.utils.toWei("0.2", "ether"), from: accounts[1] }));
            assert.equal(await accessControl.verify(accounts[1]), false);
            await timeTravel(120); // travel 1 minute ahead (works with ganache)

            await truffleAssert.passes(accessControl.pwn({ value: web3.utils.toWei("0.2", "ether"), from: accounts[1] }));
            assert.equal(await accessControl.verify(accounts[1]), true);
        } else {
            await timeTravel(60); // travel 1 minute ahead (works with ganache)
            await truffleAssert.passes(accessControl.pwn({ value: web3.utils.toWei("0.2", "ether"), from: accounts[1] }));
            await truffleAssert.passes(accessControl.pwn({ value: web3.utils.toWei("0.2", "ether"), from: accounts[1] }));
            assert.equal(await accessControl.verify(accounts[1]), false);

            await timeTravel(120); // travel 1 minute ahead (works with ganache)
            await truffleAssert.passes(accessControl.pwn({ value: web3.utils.toWei("0.2", "ether"), from: accounts[1] }));
            await truffleAssert.passes(accessControl.pwn({ value: web3.utils.toWei("0.2", "ether"), from: accounts[1] }));
            assert.equal(await accessControl.verify(accounts[1]), false);

            await timeTravel(120); // travel 1 minute ahead (works with ganache)
            await truffleAssert.passes(accessControl.pwn({ value: web3.utils.toWei("0.2", "ether"), from: accounts[1] }));
            assert.equal(await accessControl.verify(accounts[1]), true);
        }
    });
    it("should only allow contract owner to retrieve ETH from the contract", async() => {
        const accessControl = await MockAccessControl.deployed();

        const contractBalance = await web3.eth.getBalance(accessControl.address)
        const ownerBalance = await web3.eth.getBalance(accounts[0])

        await truffleAssert.reverts(accessControl.retrieve({ from: accounts[1] }));
        await truffleAssert.passes(accessControl.retrieve({ from: accounts[0] }));

        assert.equal(await web3.eth.getBalance(accessControl.address), 0);
        assert((await web3.eth.getBalance(accounts[0])) < (parseInt(ownerBalance) + parseInt(contractBalance))); // owner current balance should be increased by the contract balance but will be less than the original balance plus the contract balance because of the transaction fee
    });
});