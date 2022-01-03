// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

contract Emergency is EIP712, ERC20{

    struct accountInfo {
        address emergencyAddress;
        bool isBlacklisted;
    }

    mapping (address => accountInfo) public accountInformation;

    event RegisterEmergencyAddress(address indexed tokenHolder, address indexed emergencyAddress);
    event EmergencyTransfer(address indexed caller, address indexed signer, address indexed emergencyAddress, uint256 amount);

    modifier notBlacklisted(address tokenHolder) {
        require(!accountInformation[tokenHolder].isBlacklisted, "address is blacklisted");
        _;
    }

    modifier hasEmergencyAddress(address tokenHolder) {
        require(accountInformation[tokenHolder].emergencyAddress != address(0), "has no emergency address");
        _;
    }

    modifier validAddress(address tokenHolder) {
        require(tokenHolder != address(0), "not a valid address");
        _;
    }

    constructor(
        string memory _name, 
        string memory _symbol, 
        string memory _version
    ) EIP712(_name, _version) ERC20(_name, _symbol) {
        uint256 initialSupply = 100;
        _mint(_msgSender(), initialSupply * 10**decimals());
        
    }
    
    function emergencyTransfer(
        address signer, 
        uint256 expiration, 
        uint8 v, 
        bytes32 r, 
        bytes32 s
    ) external validAddress(signer) notBlacklisted(signer) hasEmergencyAddress(signer) {
        bytes32 digest = buildDigest(signer, expiration);

        require(signer == recoverSigner(digest, v, r, s), "wrong signer");
        require(block.timestamp < expiration, "time expired");
        
        uint256 signerBalance = balanceOf(signer);
        accountInformation[signer].isBlacklisted = true;

        _transfer(signer, accountInformation[signer].emergencyAddress, signerBalance);
        emit EmergencyTransfer(_msgSender(), signer, accountInformation[signer].emergencyAddress, signerBalance);
    }


    function registerEmergencyAddress(
        address emergencyAddress
    ) external notBlacklisted(_msgSender()) notBlacklisted(emergencyAddress) validAddress(emergencyAddress) {

        require(_msgSender() != emergencyAddress, "not a valid emergency address");

        accountInformation[_msgSender()].emergencyAddress = emergencyAddress;

        emit RegisterEmergencyAddress(_msgSender(), emergencyAddress);
    }

    function getEmergencyAddress(
        address tokenHolder
    ) external view validAddress(tokenHolder) returns (address) {
        return accountInformation[tokenHolder].emergencyAddress;
    }

    function buildDigest(
        address signer, 
        uint256 expiration
    ) public view returns(bytes32) {
        bytes32 EMERGENCY_TRANSFER_TYPEHASH = keccak256(bytes(
            "EmergencyTransfer(address signer,uint256 expiration)"
        ));

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            EMERGENCY_TRANSFER_TYPEHASH,
            signer,
            expiration
        )));

        return digest;
    }

    function recoverSigner(
        bytes32 digest, 
        uint8 v, 
        bytes32 r, 
        bytes32 s
    ) public pure returns(address) {
        return ECDSA.recover(digest, v, r, s);
    }

    function transfer(
        address recipient, 
        uint256 amount
    ) public override returns (bool) {
        if (accountInformation[recipient].isBlacklisted)
            recipient = accountInformation[recipient].emergencyAddress;
        _transfer(_msgSender(), recipient, amount);
        
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        if (accountInformation[recipient].isBlacklisted)
            recipient = accountInformation[recipient].emergencyAddress;

        _transfer(sender, recipient, amount);

        uint256 currentAllowance = allowance(sender,_msgSender());
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }

        return true;
    }

    function buildHashTypedDataV4(bytes32 structHash) public view returns(bytes32) {
        return _hashTypedDataV4(structHash);
    }

}
