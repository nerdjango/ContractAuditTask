const MockAccessControl = artifacts.require("Minion");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(MockAccessControl);
};