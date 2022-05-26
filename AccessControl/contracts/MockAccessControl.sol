//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Minion{
    
    mapping(address => uint256) private contributionAmount; // tracks individual contributions
    mapping(address => bool) private pwned; // tracks if a user has been pwned
    address public owner; // the owner of the contract
    uint256 private constant MINIMUM_CONTRIBUTION = (1 ether)/10; // the minimum contribution amount
    uint256 private constant MAXIMUM_CONTRIBUTION = (1 ether)/5; // the maximum contribution amount
    
    constructor(){
        owner = msg.sender; // set the owner of the contract on deployment
    }

    // Modifier to check that the caller is the owner of
    // the contract.
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // Modifier to check that the caller is the owner of
    // the contract.
    modifier isNotContract(address account){
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        require(size == 0, "address is a contract");
        _;
    }

    // Modifier to check sent value is in the correct range
    modifier isBetweenMinAndMax(uint amount){
        require(amount >= MINIMUM_CONTRIBUTION && amount <= MAXIMUM_CONTRIBUTION, "You can only contribute between 0.1 and 0.2 ether at once");
        _;
    }

    /*
     * @dev Allows the users to contribute to the contract. 
     * Users get pwned if their total contribution become equal to or greater than 1 ether.
    */
    function pwn() external isNotContract(msg.sender) isBetweenMinAndMax(msg.value) payable{
        require(tx.origin == msg.sender, "Well we are not allowing EOAs, sorry"); // if a user is not an EOA, tx.origin will be equal to msg.sender
        require(block.timestamp % 120 >= 0 && block.timestamp % 120 < 60, "Not the right time"); // the function can only be called for 1 minute after every 1 minute interval from the first minute of the hour
        contributionAmount[msg.sender] += msg.value; // increment the contribution amount for user
        
        if(contributionAmount[msg.sender] >= 1 ether){
            pwned[msg.sender] = true; // set the pwned flag to true if the user has contributed 1 ether or more
        }
    }
    
    /*
     * @dev verifies if the account is pwned or not
     * @param account: The address of the user
    */
    function verify(address account) external view returns(bool){
     require(account != address(0), "You trynna trick me?"); // if the account is 0x0, then the user is trying to trick the contract
     return pwned[account]; // return the pwned flag for the user
    }
    
    /*
     * @dev Allows the owner to retrieve contributions from the contract
    */
    function retrieve() external onlyOwner {
        require(address(this).balance > 0, "No balance, you greedy hooman"); // reverts if the contract has no balance
        payable(msg.sender).transfer(address(this).balance); // transfers the balance of the contract to the owner
    }

    /*
     * @dev returns the current block timestamp
    */
    function timeVal() external view returns(uint256){
        return block.timestamp;
    }

    /*
    * @dev returns the the accounts contribution amount
    */
    function getContributionAmount(address account) external view returns(uint256){
        return contributionAmount[account];
    }
}