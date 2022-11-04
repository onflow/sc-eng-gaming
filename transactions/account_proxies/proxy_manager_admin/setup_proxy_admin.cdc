import AccountProxies from "../../../contracts/utility/AccountProxies.cdc"

/// Transaction to setup a new ProxyAdmin resource in the signing account
///
transaction {
  
    let account : AuthAccount

    prepare(acct: AuthAccount) {
        
        self.account = acct
        
        if acct.borrow<&AccountProxies.ProxyManager>(from: /storage/ProxyManager) == nil {
            // Save a new ProxyManager resource
            acct.save<
                @AccountProxies.ProxyManager
            >(
                <-AccountProxies.createProxyManager(),
                to: /storage/ProxyManager
            )
            // Link public Capability
            acct.link<
                &AccountProxies.ProxyManager{AccountProxies.ProxyManagerPublic}
            >(
                AccountProxies.ProxyManagerPublicPath,
                target: AccountProxies.ProxyManagerStoragePath
            )
            // Link private Capability
            acct.link<
                &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}
            >(
                AccountProxies.ProxyManagerPrivatePath,
                target: AccountProxies.ProxyManagerStoragePath
            )
        }
        
        log("ProxyManager Created on: ".concat(acct.address.toString()))
    }

    post {
        // Make sure private Capability was linked properly
        self.account.getCapability<
            &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}
        >(
            AccountProxies.ProxyManagerPrivatePath
        ).check():
            "Could not find admin capability!"
        // Make sure public Capability was linked properly
        getAccount(
            self.account.address
        ).getCapability<
            &AccountProxies.ProxyManager{AccountProxies.ProxyManagerPublic}
        >(
            AccountProxies.ProxyManagerPublicPath
        ).check(): "Could not find public capability!"
    }
}
