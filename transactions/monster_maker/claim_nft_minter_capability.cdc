import MonsterMaker from "../../contracts/MonsterMaker.cdc"

/// Transaction that links an NFTMinter at the specified path (if it doesn't already exist),
/// retrieves it, and publishes it for the specified recipient under the given name
///
transaction(capabilityName: String, storagePath: StoragePath, provider: Address) {
    prepare(signer: AuthAccount) {
        let minterCap = signer.inbox.claim<&MonsterMaker.NFTMinter>(
            capabilityName,
            provider: provider
        ) ?? panic("No Capability available!")
        if !minterCap.check() {
            panic("Problem with Capability")
        }
        signer.save(minterCap, to: storagePath)
    }
}