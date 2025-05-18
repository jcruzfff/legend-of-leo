// Legend of Leo NFT Program
// Based on the ARC-721 standard from https://vote.aleo.org/p/721

program legend_of_leo_nft.aleo {
    // Define attribute structure
    struct attribute {
        trait_type: field,
        value: field
    }

    // Define data structure for NFT
    struct TokenData {
        name: field,
        image: field,
        creator: address
    }

    // Define NFT record
    record Token {
        owner: address,
        data: TokenData,
        edition: scalar
    }

    // Collection settings
    mapping collection_info: field => field;
    // 0: name
    // 1: symbol
    // 2: max_supply
    // 3: current_supply
    
    // NFT uniqueness tracking
    mapping token_owners: field => address;
    mapping minted_tokens: field => bool;

    // Initialize the NFT collection
    transition initialize(
        name: field,
        symbol: field,
        max_supply: u64
    ) -> bool {
        assert(max_supply > 0u64);
        return true;
    }

    // Mint a new NFT privately
    transition mint(
        receiver: address,
        name: field,
        image: field,
        edition: scalar // User provides the edition number
    ) -> Token {
        // Create token data
        let data: TokenData = TokenData {
            name: name,
            image: image,
            creator: self.caller
        };

        // Create the NFT record
        let token: Token = Token {
            owner: receiver,
            data: data,
            edition: edition
        };
        
        return token;
    }
    
    // Self-mint function (mints to caller)
    transition self_mint(
        name: field,
        image: field,
        edition: scalar
    ) -> Token {
        // Create token data
        let data: TokenData = TokenData {
            name: name,
            image: image,
            creator: self.caller
        };

        // Create the NFT record
        let token: Token = Token {
            owner: self.caller,
            data: data,
            edition: edition
        };
        
        return token;
    }

    // Transfer an NFT privately
    transition transfer(
        token: Token, 
        to: address
    ) -> Token {
        return Token {
            owner: to,
            data: token.data,
            edition: token.edition
        };
    }
    
    // Simple test function to help debug
    transition test_mint(receiver: address) -> Token {
        // Use hardcoded values for testing
        let name: field = 123field;
        let image: field = 456field;
        let edition: scalar = 1scalar;
        
        // Create token data
        let data: TokenData = TokenData {
            name: name,
            image: image,
            creator: self.caller
        };

        // Create the NFT record
        let token: Token = Token {
            owner: receiver,
            data: data,
            edition: edition
        };
        
        return token;
    }
    
    // Ultra simple test function with just u64 inputs
    transition simple_test(a: u64, b: u64) -> u64 {
        return a + b;
    }
}
