import "MetadataViews"

import "HybridCustody"

import "RockPaperScissorsGame"

/// Sets a child account's Display as associated with RockPaperScissorsGame
///
transaction {

    let owned: &HybridCustody.OwnedAccount

    prepare(signer: AuthAccount) {
        self.owned = signer.borrow<&HybridCustody.OwnedAccount>(from: HybridCustody.OwnedAccountStoragePath)
            ?? panic("Could not borrow a reference to Hybrid Custody OwnedAccount")
    }
    execute {
        // Create display from the known contract association
        let info = RockPaperScissorsGame.info
        let display = MetadataViews.Display(
                name: info.name,
                description: info.description,
                thumbnail: info.thumbnail
            )
        self.owned.setDisplay(display)
    }
}