import GamePieceNFT from "../contracts/GamePieceNFT.cdc"

/// Transaction enabling minting and game name registration
/// in GamePieceNFT contract via the Administrator resource
///
transaction(registrationFee: UFix64) {

    let adminRef: &GamePieceNFT.Administrator
    
    prepare(acct: AuthAccount) {
        // Get the Administrator reference from storage
        self.adminRef = acct
            .borrow<&GamePieceNFT.Administrator>(
                from: GamePieceNFT.AdminStoragePath
            ) ?? panic("Could not borrow GamePieceNFT.Administrator reference!")
    }

    execute {
        // Enable minting & game name registration
        self.adminRef.allowMinting(true)
        self.adminRef.allowRegistration(true)
        // Set the registration fee
        self.adminRef.setRegistrationFee(registrationFee)
    }
}