import "MetadataViews"

import "HybridCustody"

import "RockPaperScissorsGame"

/// Sets a child account's Display as associated with RockPaperScissorsGame
///
transaction(childAddress: Address) {

    let manager: &HybridCustody.Manager

    prepare(signer: AuthAccount) {
        self.manager = signer.borrow<&HybridCustody.Manager>(from: HybridCustody.ManagerStoragePath)
            ?? panic("Could not borrow a reference to Hybrid Custody Manager")
    }
    execute {
        // Create display from the known contract association
        let info = RockPaperScissorsGame.info
        let display = MetadataViews.Display(
                name: info.name,
                description: info.description,
                thumbnail: info.thumbnail
            )
        self.manager.setChildAccountDisplay(address: childAddress, display)
    }
}