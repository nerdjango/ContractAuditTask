const Token = artifacts.require("MockGovToken");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(Token);
};