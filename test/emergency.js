const BN = require('bn.js');
const chai = require('chai');
const expect = chai.expect;
chai.should();
chai.use(require('chai-bn')(BN));
const {
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');
const ethers = require("ethers")
const {
    keccak256,
    toUtf8Bytes,
    defaultAbiCoder,
    SigningKey
} = require("ethers").utils;

const Emergency = artifacts.require("Emergency");

contract('Emergency', (accounts) => {
    
    const CONTRACT_NAME = "Emergency"
    const CONTRACT_SYMBOL = "ET"
    const CONTRACT_VERSION = "1"
    const MAX_EXPIRATION = ethers.constants.MaxUint256;
    const JOHN_EMERGENCY_ADDRESS = accounts[9]
    const JOHN_ADDRESS = accounts[0]
    // (from accounts[0])
    const JOHN_PRIVATE_KEY =
      "0xc4a64ffd93634d827dc442ee64284d403944765b143f0948cf68e20a5b4b7a73"

    before(async() => {
        emergencyTransferContract = await Emergency.deployed();
    })

    describe("about John(hypothetical user) using the emergency transfer contract", async () => {

        it("builds the emergency transfer digest correctly", async() => {
            // Build message type hash
            const EMERGENCY_TRANSFER_TYPEHASH = keccak256(
                toUtf8Bytes("EmergencyTransfer(address signer,uint256 expiration)")
            );

            // Build struct hash
            const EMERGENCY_TRANSFER_STRUCTHASH = keccak256(
                defaultAbiCoder.encode(
                  ["bytes32", "address", "uint256"],
                  [EMERGENCY_TRANSFER_TYPEHASH, JOHN_ADDRESS, MAX_EXPIRATION]
                )
            );

            // Build the digest
            digest = await emergencyTransferContract.buildHashTypedDataV4(
                EMERGENCY_TRANSFER_STRUCTHASH
            )
            
            // Check if the digest matches
            expect(await emergencyTransferContract.buildDigest(
                JOHN_ADDRESS,
                MAX_EXPIRATION  
            )).to.equal(digest)
        })

        it("recovers the signer(John), who signed the digest", async() => {
            // Sign the digest
            signature = (new SigningKey(JOHN_PRIVATE_KEY)).signDigest(digest)
            
            // Recover the signer and check if the signer is John
            expect((await emergencyTransferContract.recoverSigner(
                digest,
                signature.v, 
                signature.r, 
                signature.s))
            ).to.equal(JOHN_ADDRESS)
        })

        it("registers emergency address for John", async() => {
            const receipt = await emergencyTransferContract.registerEmergencyAddress(JOHN_EMERGENCY_ADDRESS)

            // Check if emergency address matches
            expect(
                (await emergencyTransferContract.getEmergencyAddress(JOHN_ADDRESS))
            ).to.equal(JOHN_EMERGENCY_ADDRESS)

            expectEvent(
              receipt, 
              'RegisterEmergencyAddress', 
              { 
                tokenHolder: JOHN_ADDRESS, 
                emergencyAddress: JOHN_EMERGENCY_ADDRESS 
              }
            )
        })

        it("transfers all John's tokens (100 tokens) to his emergency address, then his address is blacklisted", async() => {
            const receipt = await emergencyTransferContract.emergencyTransfer(
                JOHN_ADDRESS,
                MAX_EXPIRATION,
                signature.v, 
                signature.r, 
                signature.s
            )
            const isBlacklisted = (await emergencyTransferContract.accountInformation(JOHN_ADDRESS))[1]

            expect(isBlacklisted).to.equal(true)

            expectEvent(
              receipt, 
              'EmergencyTransfer', 
              { 
                caller: JOHN_ADDRESS, 
                signer: JOHN_ADDRESS, 
                emergencyAddress:  JOHN_EMERGENCY_ADDRESS,
                amount: web3.utils.toWei('100', 'Ether')
              }
            )
        })

        it("has 0 token in John's address after the emergency transfer", async() => {
            expect(await emergencyTransferContract.balanceOf(JOHN_ADDRESS))
              .to.be.bignumber.equal(new BN(0))
        })

        it("has 100 tokens in John's emergency address after the emergency transfer", async() => {
            expect(await emergencyTransferContract.balanceOf(JOHN_EMERGENCY_ADDRESS))
              .to.be.bignumber.equal(new BN(web3.utils.toWei('100', 'Ether')))
        })

        it("tries to transfer 100 tokens to the previously blacklisted John's address, but it is transferred to it's emergency address", async() => {
            // Try to transfer 100 tokens to John's address (from John's emergency address)
            await emergencyTransferContract.transfer(JOHN_ADDRESS, 100, {from: accounts[9]})
            
            // Because the address is blacklisted, it cannot receive any tokens. Thus the balance should be 0.            
            expect(await emergencyTransferContract.balanceOf(JOHN_ADDRESS))
              .to.be.bignumber.equal(new BN(0))

            // On the other hand, token is transfered to it's emergency address. So, the emergency address' balance should be 100.
            expect(await emergencyTransferContract.balanceOf(JOHN_EMERGENCY_ADDRESS))
              .to.be.bignumber.equal(new BN(web3.utils.toWei("100", 'Ether')))
        })
      })
})



