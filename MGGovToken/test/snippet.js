signData = async() => {
    const { web3, accounts, contract } = this.state;
    var signer = accounts[0];
    var deadline = Date.now() + 100000;
    console.log(deadline);
    var x = 157;

    web3.currentProvider.sendAsync({
        method: 'net_version',
        params: [],
        jsonrpc: "2.0"
    }, function(err, result) {
        const netId = result.result;
        console.log("netId", netId);
        const msgParams = JSON.stringify({
            types: {
                EIP712Domain: [
                    { name: "name", type: "string" },
                    { name: "chainId", type: "uint256" },
                    { name: "verifyingContract", type: "address" }
                ],
                set: [
                    { name: "sender", type: "address" },
                    { name: "x", type: "uint" },
                    { name: "deadline", type: "uint" }
                ]
            },
            //make sure to replace verifyingContract with address of deployed contract
            primaryType: "set",
            domain: { name: "SetTest", version: "1", chainId: netId, verifyingContract: "0x803B558Fd23967F9d37BaFe2764329327f45e89E" },
            message: {
                sender: signer,
                x: x,
                deadline: deadline
            }
        })

        var from = signer;

        console.log('CLICKED, SENDING PERSONAL SIGN REQ', 'from', from, msgParams)
        var params = [from, msgParams]
        console.dir(params)
        var method = 'eth_signTypedData_v3'

        web3.currentProvider.sendAsync({
            method,
            params,
            from,
        }, async function(err, result) {
            if (err) return console.dir(err)
            if (result.error) {
                alert(result.error.message)
            }
            if (result.error) return console.error('ERROR', result)
            console.log('TYPED SIGNED:' + JSON.stringify(result.result))

            const recovered = sigUtil.recoverTypedSignature({ data: JSON.parse(msgParams), sig: result.result })

            if (ethUtil.toChecksumAddress(recovered) === ethUtil.toChecksumAddress(from)) {
                alert('Successfully ecRecovered signer as ' + from)
            } else {
                alert('Failed to verify signer when comparing ' + result + ' to ' + from)
            }

            //getting r s v from a signature
            const signature = result.result.substring(2);
            const r = "0x" + signature.substring(0, 64);
            const s = "0x" + signature.substring(64, 128);
            const v = parseInt(signature.substring(128, 130), 16);
            console.log("r:", r);
            console.log("s:", s);
            console.log("v:", v);

            await contract.methods.executeSetIfSignatureMatch(v, r, s, signer, deadline, x).send({ from: accounts[0] });
        })
    })
}


const msgParamsOg = {
    domain: {
        chainId: 1,
        name: "Crypto World Test",
    },
    message: {
        name: "Translation",
        start: {
            x: 200,
            y: 600,
        },
        end: {
            x: 300,
            y: 350,
        },
        cost: 50,
    },
    primaryType: "WeightedVector",
    types: {
        EIP712Domain: [
            { name: "name", type: "string" },
            { name: "chainId", type: "uint256" },
        ],
        WeightedVector: [
            { name: "name", type: "string" },
            { name: "start", type: "Point" },
            { name: "end", type: "Point" },
            { name: "cost", type: "uint256" },
        ],
        Point: [
            { name: "x", type: "uint256" },
            { name: "y", type: "uint256" },
        ],
    },
};