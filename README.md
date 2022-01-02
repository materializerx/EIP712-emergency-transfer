


```
$ mkdir myproject && cd myproject
$ npm init -y // it will create package.json
$ npm i truffle
$ npx truffle init
```

Install dependencies 
```
$ npm install --save-dev @truffle/hdwallet-provider @openzeppelin/contracts ethereumjs-util ethers truffle-plugin-solhint
```

Before running the test, you need to create migrations file first to deploy the contract e.g `2_deploy.js`

Uncomment development part from `truffle-config.js`
```
    development: {
     host: "127.0.0.1",     // Localhost (default: none)
     port: 8547,            // Standard Ethereum port (default: none)
     network_id: "*",       // Any network (default: none)
    },
```

Execute `ganache-cli --port 8547` to run ganache listening on 8547


Last thing I was doing was to edit the test file
I need to update the `private key` to match the one from `ganache-cli`
