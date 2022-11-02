<script>
    import * as fcl from "@onflow/fcl";
    import Account from "./Account.svelte"

    fcl.config({
        "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn", // Endpoint set to Testnet"
        "accessNode.api": "https://rest-testnet.onflow.org", // Mainnet: "https://rest-mainnet.onflow.org"
        "app.detail.title": "Flow Proxy Account Manager",
        "flow.network": "testnet",
        "0xAccountProxiesAddress": "0xdc47b6640307a7c8",
        "0xFungibleTokenAddress": "0x9a0766d93b6608b7",
        "0xNFTContractAddress": "0x631e88ae7f1d7c20",
        "fcl.limit": 999,
    })

    let currentUser = null;

    function setUser(user) {
        currentUser = user;
        fcl.config.put("0xUserAddress", user.addr)
    }

    fcl.currentUser.subscribe(setUser)
    fcl.currentUser().authenticate()

</script>

<div class="main-container">
    <header class="header header-6">
        <h2 style="margin-left: 1rem; margin-top: 10px;">Flow Proxy Account Manager</h2>
        {#if currentUser != null && currentUser.addr != null}
            <button class="btn" style="margin-left: auto; margin-right: 10px; margin-top: 10px;" on:click={()=>fcl.currentUser().unauthenticate()}>Log Out</button>
        {/if}
    </header>
    <div class="content-container">
        <div class="content-area">
            {#if currentUser == null || currentUser.addr == null}
                <h4>Log in to proceed</h4>
                <div>
                    <button class="btn" on:click={()=>fcl.currentUser().authenticate()}>Log In</button>
                </div>
            {:else}
                <Account user={currentUser}/>
            {/if}

        </div>
    </div>
</div>