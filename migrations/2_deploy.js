const Emergency = artifacts.require('Emergency')

module.exports = function(deployer) {
    deployer.deploy(Emergency,  'EmergencyTransfer', 'ET', '1')
}
