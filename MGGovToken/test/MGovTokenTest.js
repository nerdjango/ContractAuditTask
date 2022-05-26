const Token = artifacts.require("MockGovToken");

const truffleAssert = require("truffle-assertions");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:7545"))

const { ethers } = require('ethers')
const { verifyTypedData } = require('ethers/lib/utils')

// using ethereumjs-util 7.1.3
const ethUtil = require('ethereumjs-util');

const bip39 = require('bip39');
const { hdkey } = require('ethereumjs-wallet');

require('dotenv').config();

const { assert } = require("chai");

const advanceBlock = () => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: "2.0",
            method: "evm_mine",
            id: new Date().getTime()
        }, (err, result) => {
            if (err) { return reject(err) }
            const newBlockHash = web3.eth.getBlock('latest').hash

            return resolve(newBlockHash)
        })
    })
}

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

contract("MockGovToken", (accounts) => {
    it("should allow only contract owner to mint tokens", async() => {
        const token = await Token.deployed();

        await truffleAssert.reverts(token.mint(web3.utils.toWei("3", "ether"), { from: accounts[1] })); // not owner
        await truffleAssert.passes(token.mint(web3.utils.toWei("3", "ether"), { from: accounts[0] })); // owner

        const balance = await token.balanceOf(accounts[0]);
        assert.equal(balance.toString(), web3.utils.toWei("3", "ether"));

        //transfer 1 token each to accounts[1] and accounts[2]
        await token.transfer(accounts[1], web3.utils.toWei("1", "ether"), { from: accounts[0] });
        await token.transfer(accounts[2], web3.utils.toWei("1", "ether"), { from: accounts[0] });
        await token.transfer(accounts[3], web3.utils.toWei("1", "ether"), { from: accounts[0] });
    });
    it("should allow users delegate votes to delegatees", async() => {
        const token = await Token.deployed();

        await truffleAssert.passes(token.delegate(accounts[4], { from: accounts[1] }));
        await truffleAssert.passes(token.delegate(accounts[5], { from: accounts[2] }));
        await truffleAssert.passes(token.delegate(accounts[6], { from: accounts[3] }));

        // all delegatees should have 1000000000000000000 votes
        assert.equal((await token.getCurrentVotes(accounts[4])).toString(), web3.utils.toWei("1", "ether"));
        assert.equal((await token.getCurrentVotes(accounts[5])).toString(), web3.utils.toWei("1", "ether"));
        assert.equal((await token.getCurrentVotes(accounts[6])).toString(), web3.utils.toWei("1", "ether"));

        // ascertain that accounts[4], accounts[5] and accounts[6] are delegatees of accounts[1], accounts[2] and accounts[3] respectively
        assert.equal((await token.delegates(accounts[1])), accounts[4]);
        assert.equal((await token.delegates(accounts[2])), accounts[5]);
        assert.equal((await token.delegates(accounts[3])), accounts[6]);
    });
    it("should allow only contract owner to mint and burn votes to and from delegatees respectively", async() => {
        const token = await Token.deployed();

        await truffleAssert.reverts(token.mintTo(accounts[2], web3.utils.toWei("0.5", "ether"), { from: accounts[1] })); // not owner
        await truffleAssert.reverts(token.burn(accounts[2], web3.utils.toWei("0.5", "ether"), { from: accounts[1] })); // not owner
        await truffleAssert.passes(token.mintTo(accounts[3], web3.utils.toWei("0.5", "ether"), { from: accounts[0] })); // owner added 500000000000000000 votes to the delegatee of accounts[3]
        await truffleAssert.passes(token.burn(accounts[1], web3.utils.toWei("0.5", "ether"), { from: accounts[0] })); // owner subtracted 500000000000000000 votes from the delegatee of accounts[1]

        assert.equal((await token.getCurrentVotes(accounts[4])).toString(), web3.utils.toWei("0.5", "ether"));
        assert.equal((await token.getCurrentVotes(accounts[5])).toString(), web3.utils.toWei("1", "ether"));
        assert.equal((await token.getCurrentVotes(accounts[6])).toString(), web3.utils.toWei("1.5", "ether"));
    });
    it("should allow users access prior votes", async() => {
        const token = await Token.deployed();

        let numCheckpointsAccount4 = await token.numCheckpoints(accounts[4]);
        let numCheckpointsAccount5 = await token.numCheckpoints(accounts[5]);
        let numCheckpointsAccount6 = await token.numCheckpoints(accounts[6]);
        //let priorVotes = await token.getPriorVotes(accounts[4], parseInt(checkpoint.fromBlock.toString()));

        await advanceBlock() //advance block to get new block hash

        let Account4PriorVotesList = [];
        for (let i = 0; i < numCheckpointsAccount4; i++) {
            let checkpoint = await token.checkpoints(accounts[4], i);
            let priorVotes = await token.getPriorVotes(accounts[4], parseInt(checkpoint.fromBlock.toString()));
            Account4PriorVotesList.push(priorVotes);
        }

        let Account5PriorVotesList = [];
        for (let i = 0; i < numCheckpointsAccount5; i++) {
            let checkpoint = await token.checkpoints(accounts[5], i);
            let priorVotes = await token.getPriorVotes(accounts[5], parseInt(checkpoint.fromBlock.toString()));
            Account5PriorVotesList.push(priorVotes);
        }

        let Account6PriorVotesList = [];
        for (let i = 0; i < numCheckpointsAccount6; i++) {
            let checkpoint = await token.checkpoints(accounts[6], i);
            let priorVotes = await token.getPriorVotes(accounts[6], parseInt(checkpoint.fromBlock.toString()));
            Account6PriorVotesList.push(priorVotes);
        }

        assert.equal(Account4PriorVotesList[0].toString(), web3.utils.toWei("1", "ether")); // first checkpoint for accounts[4]
        assert.equal(Account4PriorVotesList[1].toString(), web3.utils.toWei("0.5", "ether")); // second checkpoint for accounts[4] after burn

        assert.equal(Account5PriorVotesList[0].toString(), web3.utils.toWei("1", "ether")); // initial checkpoint for accounts[5]

        assert.equal(Account6PriorVotesList[0].toString(), web3.utils.toWei("1", "ether")); // first checkpoint for accounts[6]
        assert.equal(Account6PriorVotesList[1].toString(), web3.utils.toWei("1.5", "ether")); // second checkpoint for accounts[6] after addition
    });
    it("should allow users delegate by signature", async() => {
        const token = await Token.deployed();
        const _delegatee = accounts[7];
        const _nonce = parseInt(await token.nonces(accounts[2]));

        const currentTimestamp = parseInt(await token.getCurrentTimestamp());
        const _expiry = (currentTimestamp) + 86400; // 1 day from now

        let tokenName = await token.name();
        let tokenContractAddress = await token.address;

        let chainId = 1 //parseInt(await web3.eth.getChainId()); we use 1 because the getChainId() in the contract returns 1

        const message = {
            delegatee: _delegatee,
            nonce: _nonce,
            expiry: _expiry,
        };
        // Our domain will include details about our app
        const domain = {
            name: tokenName,
            chainId: chainId,
            verifyingContract: tokenContractAddress,
        }

        // Here we define the different types our message uses
        const types = {
            Delegation: [
                { name: 'delegatee', type: 'address' },
                { name: 'nonce', type: 'uint256' },
                { name: 'expiry', type: 'uint256' },
            ],
        }

        let mnemonic = process.env.MNEMONICS; //Ganache generated mnemonics

        const seed = await bip39.mnemonicToSeed(mnemonic); // mnemonic from ganache local blockchain server

        const hdk = hdkey.fromMasterSeed(seed);
        const addr_node = hdk.derivePath("m/44'/60'/0'/0/2"); //m/44'/60'/0'/0/account_index is derivation path for the accounts[account_index].
        const addr = addr_node.getWallet().getAddressString();

        assert.equal(addr, accounts[2].toLowerCase()); //check that addr is the same with accounts[2] on ganache list to make sure the derivation is correct
        const private_key = addr_node.getWallet().getPrivateKey();

        let privateKey = ethUtil.bufferToHex(private_key);

        const wallet = new ethers.Wallet(privateKey);

        let signature = await wallet._signTypedData(
            domain, types, message,
        )

        const getSignatory = (signature, message, address) => {
            return verifyTypedData(
                domain, types, message, signature,
            ).toLowerCase()
        }

        let signatory = getSignatory(signature, message, wallet.address);
        assert.equal(signatory, wallet.address.toLowerCase());

        var split = ethers.utils.splitSignature(signature);

        await truffleAssert.passes(token.delegateBySig(_delegatee, _nonce, _expiry, split.v, split.r, split.s, { from: accounts[0] }));

        assert.equal((await token.getCurrentVotes(accounts[5])).toString(), web3.utils.toWei("0", "ether")); // removed vote from accounts[5]
        assert.equal((await token.getCurrentVotes(accounts[7])).toString(), web3.utils.toWei("1", "ether")); // added vote to accounts[7]
    });
    it("should not allow users delegate by signature if signature is expired", async() => {
        const token = await Token.deployed();
        const _delegatee = accounts[8];
        const _nonce = parseInt(await token.nonces(accounts[2]));

        const currentTimestamp = parseInt(await token.getCurrentTimestamp());
        const _expiry = (currentTimestamp) + 86400; // 1 day from now

        let tokenName = await token.name();
        let tokenContractAddress = await token.address;

        let chainId = 1 //parseInt(await web3.eth.getChainId()); we use 1 because the getChainId() in the contract returns 1

        const message = {
            delegatee: _delegatee,
            nonce: _nonce,
            expiry: _expiry,
        };
        // Our domain will include details about our app
        const domain = {
            name: tokenName,
            chainId: chainId,
            verifyingContract: tokenContractAddress,
        }

        // Here we define the different types our message uses
        const types = {
            Delegation: [
                { name: 'delegatee', type: 'address' },
                { name: 'nonce', type: 'uint256' },
                { name: 'expiry', type: 'uint256' },
            ],
        }

        let mnemonic = process.env.MNEMONICS; //Ganache generated mnemonics

        const seed = await bip39.mnemonicToSeed(mnemonic); // mnemonic from ganache local blockchain server

        const hdk = hdkey.fromMasterSeed(seed);
        const addr_node = hdk.derivePath("m/44'/60'/0'/0/2"); //m/44'/60'/0'/0/account_index is derivation path for the accounts[account_index].
        const addr = addr_node.getWallet().getAddressString();

        assert.equal(addr, accounts[2].toLowerCase()); //check that addr is the same with accounts[2] on ganache list to make sure the derivation is correct
        const private_key = addr_node.getWallet().getPrivateKey();

        let privateKey = ethUtil.bufferToHex(private_key);

        const wallet = new ethers.Wallet(privateKey);

        let signature = await wallet._signTypedData(
            domain, types, message,
        )

        const getSignatory = (signature, message, address) => {
            return verifyTypedData(
                domain, types, message, signature,
            ).toLowerCase()
        }

        let signatory = getSignatory(signature, message, wallet.address);
        assert.equal(signatory, wallet.address.toLowerCase());

        var split = ethers.utils.splitSignature(signature);

        await timeTravel(129600); // travel 1.5 days ahead (works with ganache) expiring the signature

        await truffleAssert.reverts(token.delegateBySig(_delegatee, _nonce, _expiry, split.v, split.r, split.s, { from: accounts[0] }));

        //check that transfer was unsuccessful
        assert.equal((await token.getCurrentVotes(accounts[8])).toString(), web3.utils.toWei("0", "ether"));
        assert.equal((await token.getCurrentVotes(accounts[7])).toString(), web3.utils.toWei("1", "ether"));
    })
});