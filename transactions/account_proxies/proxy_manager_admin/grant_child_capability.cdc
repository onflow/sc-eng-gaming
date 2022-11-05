import AccountProxies from "../../../contracts/utility/AccountProxies.cdc"
import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"

/// Grants the specified address access to a Capability
///
transaction(childAccount:Address) {
    
    let adminCap: Capability<&AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}>
    let adminCapRef: &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}

    prepare(acct: AuthAccount)  {
        // Get a reference to the ProxyManagerAdmin
        self.adminCap = acct.getCapability<
                &AccountProxies.ProxyManager{AccountProxies.ProxyManagerAdmin}
            >(
                AccountProxies.ProxyManagerPrivatePath
            )
        self.adminCapRef = self.adminCap.borrow() ?? panic("cannot borrow admin interface")

        // Path to GamePlayerProxy Capability & Capability
        let capPath = RockPaperScissorsGame.GamePlayerPrivatePath
        let childCap : Capability = acct.getCapability<&{
                RockPaperScissorsGame.GamePlayerProxy
            }>(
                capPath
            )

        // Grant the account the access Capability
        self.adminCapRef.grantChildCapability(
                address: childAccount,
                path: capPath,
                capability: childCap
            )
        
        log(
            "Capability: "
            .concat(
                childCap.getType().identifier
            ).concat(" authorized on: ")
            .concat(childAccount.toString())
        )
    }

    post {
        // check stuff
    }
    }
