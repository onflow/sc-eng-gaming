import FungibleToken from 0xFungibleTokenAddress

access(all) contract AccountProxies
{
    pub struct ProxyInfo
    {
        pub let name : String
        pub let proxyCapability : Capability
        pub let flowProviderCapability : Capability<&{FungibleToken.Provider}>
        pub var active : Bool
        
        init(name: String, flowProviderCapability: Capability<&{FungibleToken.Provider}>, proxyCapability: Capability)
        {
            self.proxyCapability = proxyCapability;
            self.name = name
            self.flowProviderCapability = flowProviderCapability
            self.active = true
        }

        pub fun SetActive(_ status: Bool)
        {
            self.active = status
        }
    }

    pub resource interface ProxyManagerPublicInterface
    {
        pub fun GetCapability(_ acct:AuthAccount) : &Capability?
    }

    pub resource interface ProxyManagerAdminInterface
    {
        pub fun ActivateProxy(address:Address)
        pub fun DeactivateProxy(address:Address)
        pub fun GetProxies() : &{Address: ProxyInfo}
        pub fun CreateProxy(signer: AuthAccount, publicKey: String, name: String, capability: Capability, initialFundingAmount: UFix64)
    }

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
    
            log("Created child with address ".concat(newAccount.address.toString()))

            //Add some initial funds to the new account, pulled from the signing account.  Amount determined by initialFundingAmount
            newAccount.getCapability(/public/flowTokenReceiver)!
                .borrow<&{FungibleToken.Receiver}>()!
                .deposit(from: <- signer.borrow<&{FungibleToken.Provider}>(from: /storage/flowTokenVault)!.withdraw(amount: initialFundingAmount))
            
            //Add this proxy to our list of proxies
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
            log("Authorized proxy: ".concat(self.proxies[address]!.name).concat("at address: ").concat(address.toString()))
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

        pub fun GetProxies() : &{Address: ProxyInfo}
        {
            return &self.proxies as &{Address: ProxyInfo}
        }
    }

    pub fun CreateProxyManager() : @ProxyManager
    {
        return <- create ProxyManager()
    }
}
 