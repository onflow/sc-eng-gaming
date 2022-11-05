import FungibleToken from "./FungibleToken.cdc"

access(all) contract AccountProxies
{
    //Struct for keeping track of proxy accounts
    pub struct ProxyInfo
    {
        //Friendly name for the proxy to make identifying it easier
        pub let name : String
        //The capability that this proxy should have access to
        pub let proxyCapability : Capability
        //The flow provider capability of the proxy.  Used to let the main account pull funds from the proxy
        pub let flowProviderCapability : Capability<&{FungibleToken.Provider}>
        //Flag indicating if the proxy is currently allowed to access the capability granted to it
        pub var active : Bool
        
        //Initialization
        init(name: String, flowProviderCapability: Capability<&{FungibleToken.Provider}>, proxyCapability: Capability)
        {
            self.proxyCapability = proxyCapability;
            self.name = name
            self.flowProviderCapability = flowProviderCapability
            self.active = true
        }

        //Set the active status of the proxy
        pub fun SetActive(_ status: Bool)
        {
            self.active = status
        }
    }

    //Allows a proxy to get the capability assigned to it.
    //It is public, but requires that the proxy pass in it's AuthAccount to identify itself so only authorized
    //proxies can get a capability from this function
    pub resource interface ProxyManagerPublicInterface
    {
        pub fun GetCapability(_ acct:AuthAccount) : &Capability?
    }

    //Admin interface that allow the main account to create and manage it's proxies
    pub resource interface ProxyManagerAdminInterface
    {
        pub fun ActivateProxy(address:Address)
        pub fun DeactivateProxy(address:Address)
        pub fun GetProxies() : &{Address: ProxyInfo}
        pub fun CreateProxy(signer: AuthAccount, publicKey: String, name: String, capability: Capability, initialFundingAmount: UFix64)
    }

    //The ProxyManager resource tracks allowed proxies and thier granted capabilities
    pub resource ProxyManager : ProxyManagerAdminInterface, ProxyManagerPublicInterface
    {
        priv let proxies : {Address: ProxyInfo}

        init()
        {
            self.proxies = {}
        }

        //signer: The main Flow account
        //publicKey: The public key that will be used for the new proxy account
        //name: A name that will easily identify what this proxy does.  Recommended:  GameName_MachineName
        //capability: The private capability that this proxy will have access to
        //initialFundingAmount: The amount of Flow Tokens that should be transfered from the main account into the proxy account
        pub fun CreateProxy(signer: AuthAccount, publicKey: String, name: String, capability: Capability, initialFundingAmount: UFix64)
        {
            //Create a public key for the proxy account from the passed in string
            let key = PublicKey(
                publicKey: publicKey.decodeHex(),
                signatureAlgorithm: SignatureAlgorithm.ECDSA_P256
            )
            
            //Create the proxy account
            let newAccount = AuthAccount(payer: signer)
            
            //Add the key to the new account
            newAccount.keys.add(
                publicKey: key,
                hashAlgorithm: HashAlgorithm.SHA3_256,
                weight: 1000.0
            )

            //Add some initial funds to the new account, pulled from the signing account.  Amount determined by initialFundingAmount
            newAccount.getCapability(/public/flowTokenReceiver)!
                .borrow<&{FungibleToken.Receiver}>()!
                .deposit(from: <- signer.borrow<&{FungibleToken.Provider}>(from: /storage/flowTokenVault)!.withdraw(amount: initialFundingAmount))
            
            //Add this proxy to our list of proxies, grabbing the flow token provider capability as we do it.
            self.proxies[newAccount.address] = ProxyInfo(name: name, flowProviderCapability: newAccount.getCapability<&{FungibleToken.Provider}>(/private/flowTokenProvider), proxyCapability: capability)
            newAccount.save(signer.address, to: /storage/MainAccountAddress)
        }

        //Activates the proxy, allowing it to access the capability on the main account
        pub fun ActivateProxy(address:Address)
        {
            if !self.proxies.containsKey(address)
            {
                log("Unknown proxy ".concat(address.toString()))
                return
            }
                
            self.proxies[address]!.SetActive(true)
        }

        //Deactivates the proxy. It will no longer be allowed to access the capability on the main account
        pub fun DeactivateProxy(address:Address)
        {
            if self.proxies.containsKey(address)
            {
                self.proxies[address]!.SetActive(false)
            }
            else
            {
                log("Proxy not found: ".concat(address.toString()))        
            }
        }

        //Returns a reference to the capability that was granted to the proxy that is requesting it
        //This is a reference, so it can't be stored.  The proxy will have to call this every transaction to get
        //the capability.  This allows the main account to disable the proxy at any time and have it instantly lose
        //access to the capability.
        pub fun GetCapability(_ acct:AuthAccount) : &Capability?
        {
            if !self.proxies.containsKey(acct.address)
            {
                log("Proxy not found")
                return nil
            }
            
            if !self.proxies[acct.address]!.active
            {
                log("Proxy not active")
                return nil
            }
            
            return &self.proxies[acct.address]!.proxyCapability as &Capability
        }

        //Returns the proxy dictionary
        pub fun GetProxies() : &{Address: ProxyInfo}
        {
            return &self.proxies as &{Address: ProxyInfo}
        }
    }

    //Called by main accounts to allow them to install a ProxyManager on themselves.
    pub fun CreateProxyManager() : @ProxyManager
    {
        return <- create ProxyManager()
    }
}
 