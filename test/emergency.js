const Emergency = artifacts.require("Emergency");

// /*
//  * uncomment accounts to access the test accounts made available by the
//  * Ethereum client
//  * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
//  */
// contract("Emergency", function (accounts) {
//   it("should assert true", async function () {
//     await Emergency.deployed();
//     return assert.isTrue(true);
//   });
//   it("prints out accounts", async () => {
//     console.log("accounts[0] : " + accounts[0])
//     console.log("accounts.length : " + accounts.length)
//   })
// });

const { expect } = require("chai")
const ethers = require("ethers")
const {
    keccak256,
    toUtf8Bytes,
    defaultAbiCoder
} = require("ethers").utils;
const ethUtil = require("ethereumjs-util")

contract('Emergency', (accounts) => {
    
    const CONTRACT_NAME = "Emergency"
    const CONTRACT_SYMBOL = "ET"
    const CONTRACT_VERSION = "1"
    const MAX_EXPIRATION = ethers.constants.MaxUint256;
    const JOHN_EMERGENCY_ADDRESS = accounts[9].toLowerCase()
    const JOHN_ADDRESS = accounts[0].toLowerCase()
    // (from accounts[0])
    const JOHN_PRIVATE_KEY =
      "0xc4a64ffd93634d827dc442ee64284d403944765b143f0948cf68e20a5b4b7a73"

    before(async() => {
        // EmergencyTransferContract = await ethers.ContractFactory("Emergency")
        // emergencyTransferContract = await EmergencyTransferContract.deploy(
        //   CONTRACT_NAME,
        //   CONTRACT_SYMBOL,
        //   CONTRACT_VERSION
        // )
        // await emergencyTransferContract.deployed()

        emergencyTransferContract = await Emergency.deployed();
        ethers.Signer.
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
            signedMsg = ethUtil.ecsign(
                ethUtil.toBuffer(digest), 
                ethUtil.toBuffer(JOHN_PRIVATE_KEY)
            )
            
            // Recover the signer and check if the signer is John
            expect((await emergencyTransferContract.recoverSigner(
                digest,
                signedMsg.v, 
                signedMsg.r, 
                signedMsg.s)).toLowerCase()
            ).to.equal(JOHN_ADDRESS)
        })

        it("registers emergency address for John", async() => {
            await emergencyTransferContract.registerEmergencyAddress(JOHN_EMERGENCY_ADDRESS)

            // Check if emergency address matches
            expect(
                (await emergencyTransferContract.getEmergencyAddress(JOHN_ADDRESS)).toLowerCase()
            ).to.equal(JOHN_EMERGENCY_ADDRESS)
        })

        it("transfers all John's tokens (100 tokens) to his emergency address, then his address is blacklisted", async() => {
            await emergencyTransferContract.emergencyTransfer(
                JOHN_ADDRESS,
                MAX_EXPIRATION,
                signedMsg.v, 
                signedMsg.r, 
                signedMsg.s
            )

            const isBlacklisted = (await emergencyTransferContract.accountInformation(JOHN_ADDRESS))[1]

            expect(isBlacklisted).to.equal(true)
        })

        it("has 0 token in John's address after the emergency transfer", async() => {
            expect(await emergencyTransferContract.balanceOf(JOHN_ADDRESS)).to.equal(0)
        })

        it("has 100 tokens in John's emergency address after the emergency transfer", async() => {
            expect(await emergencyTransferContract.balanceOf(JOHN_EMERGENCY_ADDRESS))
                .to.equal(web3.utils.toWei('100', 'Ether'))
        })

        it("tries to transfer 100 tokens to the previously blacklisted John's address, but it is transferred to it's emergency address", async() => {
            const signers = await ethers.getSigners()
            const someTokenHolder = emergencyTransferContract.connect(signers[9])
            // Try to transfer 100 tokens to John's address (from John's emergency address)
            await someTokenHolder.transfer(JOHN_ADDRESS, 100)
            // Because the address is blacklisted, it cannot receive any tokens. Thus the balance should be 0.
            // On the other hand, token is transfered to it's emergency address. So, the emergency address' balance should be 100.
            expect(await emergencyTransferContract.balanceOf(JOHN_ADDRESS)).to.equal(0)
            expect(await emergencyTransferContract.balanceOf(JOHN_EMERGENCY_ADDRESS)).to.equal(web3.utils.toWei("100", 'Ether'))
        })
      })
})



