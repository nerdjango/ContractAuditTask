# Contracts Audit Report
Task to audit the contracts the following contracts:
1. MGGovToken: https://github.com/Quillhash/Audit_mocks/blob/main/MGGovToken.sol

2. MockAccessControl: https://github.com/Quillhash/Audit_mocks/blob/main/MockAccessControl.sol

## Stack Tool
* solidity
* truffle
* ganache
* mocha
* chai
* truffle-assertions
* ethers.js
* web3.js
* slither
* mythril
* remix

## MGGovToken Audit Report
### Bugs Found
* require(nonce == nonces[signatory]++, "MGToken::delegateBySig: invalid nonce"); this line is invalid
* No check for signature expiry in delegateBySig()
* No increment for account nonces in delegateBySig()
* returns _delegate(signatory, delegatee); in delegateBySig()

### Recommendations
* require(nonce == nonces[signatory], "MGToken::delegateBySig: invalid nonce");
* Check signature validity, ie: require(now <= expiry, "MGToken::delegateBySig: signature expired")
* increment nonce after the signatory is confirm i.e: nonces[signatory]++
* there's no need to return _delegate(...) as we're trying to call the delegate function

### Exploitation Scenerios
* Without a check for signature expiry we could have users signing expired signatures
* Without nonces increment signatures can be reused

### TestSuite
* The following tests were conducted using Truffle Suite:
1. contract should allow only contract owner to mint tokens.
2. contract should allow users delegate votes to delegatees.
3. contract should allow only contract owner to mint and burn votes to and from delegatees respectively
4. contract should allow users access prior votes.
5. contract should allow users delegate by signature.
6. contract should not allow users delegate by signature if signature is expired.

### Automated Testing Results from Slither and Mythril


## MockAccessControl Audit Report
### Bugs Found
* Using the isContract function instead of a modifier.
* require(tx.origin != msg.sender, "Well we are not allowing EOAs, sorry"): To check that an account is not an EOA the tx.origin must be equal to msg.sender. Otherwise its an EOA.

### Recommendations
* Replace isContract function with modifier.
* Use more modifiers.
* Add more comments

### Exploitation Scenerios
* A contract can exploit the isContract function.

### TestSuite
#### The following tests were conducted using Truffle Suite:
1. contract should confirm that contract owner is equal to account 0
2. contract should only allow users contribute amounts between 0.1 to 0.2 ether to the contract for 1 minute after every minute from the first minute of the hour
3. contract should pwn users with contributions of 1 ether and above
4. should only allow contract owner to retrieve ETH from the contract

### Automated Testing Results from Slither and Mythril