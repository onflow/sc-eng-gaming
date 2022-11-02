<script>
    import * as fcl from "@onflow/fcl";

    export let user=null;

    let mainAccountInfo = null;
    let proxyInfo = null;
    let proxyList = null;
    let transactionData = null;
    let id = null;

    async function getAccountInfo() {
        mainAccountInfo = await fcl.query({
            cadence: `
            pub fun main() : AuthAccount {
                return getAuthAccount(0xUserAddress)
            }
        `
        })
    }

    async function getProxyInfo() {
        proxyInfo = await fcl.query({
            cadence: `
            pub fun main() : Type? {
                return getAuthAccount(0xUserAddress).type(at:/storage/ProxyManager)
            }
        `
        })
        await new Promise(r => setTimeout(r, 1000));
        await getProxyList()
    }

    async function getProxyList() {
        proxyList = null
        proxyList = await fcl.query({
            cadence: `
            import AccountProxies from 0xAccountProxiesAddress

            pub fun main(address:Address) : &{Address: AccountProxies.ProxyInfo} {
                let adminRef = getAuthAccount(address).getCapability<&{AccountProxies.ProxyManagerAdminInterface}>(/private/ProxyManager).borrow() ?? panic("cannot borrow admin interface")
                return adminRef.GetProxies()
            }
            `,
            args: (arg, t) => [arg(mainAccountInfo.address, t.Address)]
        })

        Object.keys(proxyList).forEach(address=>{
            let data = fcl.query({
                cadence: `
                    pub fun main(address: Address) : AuthAccount {
                        return getAuthAccount(address)
                    }`,
                args: (arg, t) => [arg(address, t.Address)]
            }).then(data=>{proxyList[address]["balance"] = data.availableBalance})
        })
    }

    async function installProxyManager() {
        let transactionId = await fcl.mutate({
            cadence: `
                import AccountProxies from 0xAccountProxiesAddress

                transaction
                {
                  let account : AuthAccount

                  prepare(acct: AuthAccount)
                  {
                    self.account = acct

                    if acct.borrow<&AccountProxies.ProxyManager>(from: /storage/ProxyManager) == nil
                    {
                      acct.save<@AccountProxies.ProxyManager>(<-AccountProxies.CreateProxyManager(), to: /storage/ProxyManager)
                      acct.link<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerPublicInterface}>(/public/ProxyManager, target: /storage/ProxyManager)
                      acct.link<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdminInterface}>(/private/ProxyManager, target: /storage/ProxyManager)
                    }

                    log("ProxyManager Created on: ".concat(acct.address.toString()))
                  }

                  post
                  {
                    self.account.getCapability<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdminInterface}>(/private/ProxyManager).check(): "Could not find admin capability!"
                    getAccount(self.account.address).getCapability<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerPublicInterface}>(/public/ProxyManager).check(): "Could not find public capability!"
                  }
                }
            `,
            limit: 999
        })

        await fcl.tx(transactionId).onceSealed()
        await getProxyInfo()
    }

    async function createCollectionAndProxy() {
        fcl.config.put("0x00TargetContractAddress", transactionData.nft_address)
        fcl.config.put("0x00TargetContract", transactionData.nft_contract)
        fcl.config.put("0x00PublicKey", transactionData.public_key)
        fcl.config.put("0x00ProxyName", transactionData.proxy_name)
        fcl.config.put("0x00FundingAmount", transactionData.fund_amount)

        let transactionId = await fcl.mutate({
            cadence: `
            import 0x00TargetContract from 0x00TargetContractAddress
            import NonFungibleToken from 0xNFTContractAddress
            import AccountProxies from 0xAccountProxiesAddress

            transaction {
                prepare(signer: AuthAccount) {
                    // Create collection if it doesn't exist
                    if signer.borrow<&0x00TargetContract.Collection>(from: 0x00TargetContract.CollectionStoragePath) == nil
                    {
                        // Create a new empty collection
                        let collection <- 0x00TargetContract.createEmptyCollection()

                        // save it to the account
                        signer.save(<-collection, to: 0x00TargetContract.CollectionStoragePath)

                        // link a public capability for the collection
                        signer.link<&{0x00TargetContract.CollectionPublic, NonFungibleToken.CollectionPublic}>(
                            0x00TargetContract.CollectionPublicPath,
                            target: 0x00TargetContract.CollectionStoragePath
                        )

                        // link private capability for the collection
                        signer.link<&{0x00TargetContract.CollectionPrivate}>(
                            0x00TargetContract.CollectionPrivatePath,
                            target: 0x00TargetContract.CollectionStoragePath
                        )

                        //link a proxy capability for the collection
                        signer.link<&{0x00TargetContract.CollectionProxy}>(
                            0x00TargetContract.CollectionProxyPath,
                            target: 0x00TargetContract.CollectionStoragePath
                        )
                    }

                    //Create proxy manager if it doesn't exist
                    if signer.borrow<&AccountProxies.ProxyManager>(from: /storage/ProxyManager) == nil
                    {
                      signer.save<@AccountProxies.ProxyManager>(<-AccountProxies.CreateProxyManager(), to: /storage/ProxyManager)
                      signer.link<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerPublicInterface}>(/public/ProxyManager, target: /storage/ProxyManager)
                      signer.link<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdminInterface}>(/private/ProxyManager, target: /storage/ProxyManager)
                    }

                    //Create proxy account
                    let adminRef = signer.getCapability<&{AccountProxies.ProxyManagerAdminInterface}>(/private/ProxyManager).borrow() ?? panic("cannot borrow admin interface")
                    let proxyCap = signer.getCapability<&{0x00TargetContract.CollectionProxy}>(0x00TargetContract.CollectionProxyPath)

                    adminRef.CreateProxy(
                      signer: signer,
                      publicKey: "0x00PublicKey",
                      name: "0x00ProxyName",
                      capability: proxyCap,
                      initialFundingAmount: 0x00FundingAmount
                    )
                }
            }`
        })

        let transaction = await fcl.tx(transactionId).onceSealed()
        let newAddress = ""
        transaction.events.forEach(evt=>{
            if(evt.type=="flow.AccountCreated")
            {
                newAddress=evt.data.address
                fetch("/set_proxy_address?id="+id+"&address="+newAddress).then(transactionData = null)
            }
        })

        await getProxyInfo()
        await getProxyList()
    }


    function formatFileSize(bytes,decimalPoint) {
        if(bytes == 0) return '0 Bytes';
        var k = 1000,
            dm = decimalPoint || 2,
            sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function getTransactionRequest() {
        const urlParams = new URLSearchParams(window.location.search);
        id = urlParams.get('id');

        fetch("/get_transaction_info?id="+id)
            .then((response)=>response.json())
            .then((data)=>{transactionData=data})

        /*
        transactionData = {
            public_key: "PublicKey",
            proxy_name: "Test Proxy Name",
            nft_contract: "SampleNFT",
            nft_address: "0xdeadbeefcafe",
            fund_amount: 0.05,
            proxy_address: "None"
        }
        */

        //console.log(transactionData);
    }

    getTransactionRequest()
    getAccountInfo()
    getProxyInfo()
</script>

<div class="clr-row">
    <div class="clr-col-6">
        {#if mainAccountInfo}
            <table class="table">
                <thead>
                    <tr>
                        <th colspan="2">Account Info</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th>Address</th>
                        <td>{mainAccountInfo.address}</td>
                    </tr>
                    <tr>
                        <th>Flow Balance</th>
                        <td>{mainAccountInfo.balance}</td>
                    </tr>
                    <tr>
                        <th>Available Balance</th>
                        <td>{mainAccountInfo.availableBalance}</td>
                    </tr>
                    <tr>
                        <th>Storage Used</th>
                        <td>{formatFileSize(mainAccountInfo.storageUsed)}</td>
                    </tr>
                    <tr>
                        <th>Storage Capacity</th>
                        <td>{formatFileSize(mainAccountInfo.storageCapacity)}</td>
                    </tr>
                </tbody>
            </table>
        {:else}
            Fetching account info...
        {/if}
        <div style="border: 1px solid gray; margin-top: 10px; padding: 10px;">
        {#if transactionData != null && transactionData.public_key != ""}
                <b>Proxy account creation request, this transaction will do the following:</b>
                <div style="margin-left: 15px">
                    <ul>
                        <li>Create an NFT collection of type <b>{transactionData.nft_address}.{transactionData.nft_contract}</b></li>
                        <li>Create a proxy account with the name <b>{transactionData.proxy_name}</b></li>
                        <li>Grant limited permissions to the NFT collection on your main account to the proxy account</li>
                        <li>Transfer <b>{transactionData.fund_amount}</b> Flow into the proxy account from your main account</li>
                    </ul>
                </div>
                <div style="display: flex;flex-direction: row-reverse;">
                    <button class="btn" on:click={createCollectionAndProxy}>Create Proxy</button>
                </div>
        {:else}
                No proxy account creation request for this ID.
        {/if}
        </div>
    </div>
    <div class="clr-col-6">
        <table class="table">
            <thead>
            <tr>
                <th colspan="2">Proxy Manager</th>
            </tr>
            </thead>
            <tbody>
            <tr>
                <th>Status</th>
                <td>
                    {#if proxyInfo == null}
                        Not found
                        <span style="padding-left: 20px;"><button class="btn btn-sm" on:click={installProxyManager}>Install</button></span>
                    {:else}
                        Installed
                    {/if}
                </td>
            </tr>
            {#if proxyList != null}
            <tr>
            <th>Proxy count</th>
            <td>{Object.keys(proxyList).length}</td>
            </tr>
            {/if}
            </tbody>
        </table>

        {#if proxyInfo != null}
            <div style="text-align: center; margin-top: 30px;">
                <button class="btn" on:click={getProxyList}>Refresh Proxy List</button>
                {#if proxyList != null}
                    {#each Object.keys(proxyList) as key}
                        <table class="table">
                            <thead>
                            <tr>
                                <th colspan="2">{proxyList[key]["name"]}</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr>
                                <th>Address</th>
                                <td>{key}</td>
                            </tr>
                            <tr>
                                <th>Flow Available</th>
                                <td>{proxyList[key]["balance"]} <!--<span style="padding-left: 30px;"><button class="btn btn-sm">Add</button></span><button class="btn btn-sm">Remove</button>--></td>
                            </tr>
                            <tr>
                                <th>Capability</th>
                                <td>{proxyList[key]["proxyCapability"]["borrowType"]["type"]["typeID"].split(".")[1]}.{proxyList[key]["proxyCapability"]["borrowType"]["type"]["typeID"].split(".")[2]}</td>
                            </tr>
                            <tr>
                                <th>Active</th>
                                <td>
                                    {proxyList[key]["active"]}
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
    <div>
    </div>
</div>