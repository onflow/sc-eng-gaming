import RockPaperScissorsGame from "../../../contracts/RockPaperScissorsGame.cdc"
import GamePieceNFT from "../../../contracts/GamePieceNFT.cdc"
import FungibleToken from "../../../contracts/utility/FungibleToken.cdc"
import ExampleToken from "../../../contracts/utility/ExampleToken.cdc"

/// Registers the RockPaperScissorsGame.name with
/// GamePieceNFT so that Moves can be assigned to 
/// escrowed NFTs
///
transaction(registrationFeeAmount: UFix64) {

    let providerRef: &{FungibleToken.Provider}
    let contractAdminRef: &RockPaperScissorsGame.ContractAdmin

    prepare(acct: AuthAccount) {
        self.providerRef = acct.borrow<&{FungibleToken.Provider}>(
            from: ExampleToken.VaultStoragePath
        ) ?? panic("Could not get Provider reference from signing account's storage!")
        self.contractAdminRef = acct.borrow<&RockPaperScissorsGame.ContractAdmin>(
            from: RockPaperScissorsGame.ContractAdminStoragePath
        ) ?? panic("Could not get ContractAdmin reference from signing account's storage!")
    }
    execute {
        let feeVault: @ExampleToken.Vault <- self.providerRef.withdraw(amount: registrationFeeAmount) as! @ExampleToken.Vault
        self.contractAdminRef.registerGameWithGamePieceNFT(feeVault: <-feeVault)
    }
}
