//! Charmix - Example Charms Spell Checker Implementation
//! 
//! This library implements a spell checker for the Charms protocol,
//! demonstrating how to validate token transfers and state transitions.
//! 
//! Build with WASM support: `wasm-pack build --target web --features wasm`

#[cfg(feature = "wasm")]
pub mod wasm_bindings;

pub use charms_sdk::data;

/// Main entry point macro - re-export from SDK
#[macro_export]
macro_rules! main {
    ($path:path) => {
        fn main() {
            use charms_sdk::data::{App, Data, Transaction};
            
            let (app, tx, x, w): (App, Transaction, Data, Data) =
                charms_sdk::data::util::read(std::io::stdin())
                    .expect("should deserialize (app, tx, x, w): (App, Transaction, Data, Data)");
            
            assert!($path(&app, &tx, &x, &w));
        }
    };
}

/// Token spell checker - validates token transfer rules
pub mod token {
    use charms_sdk::data::{App, Data, Transaction, CharmState};
    
    /// Validate a token transfer spell
    /// 
    /// Rules:
    /// - Total input amount must equal total output amount (conservation)
    /// - All inputs must be authorized (signature verification)
    /// - Token app tag must match across all UTXOs
    pub fn check(app: &App, tx: &Transaction, x: &Data, _w: &Data) -> bool {
        let app_tag = &app.tag;
        
        // Sum input token amounts
        let input_sum: u64 = tx.inputs.iter()
            .filter_map(|input| {
                input.charm_state.as_ref()
                    .and_then(|state| state.get(app_tag))
                    .and_then(|data| data.as_u64())
            })
            .sum();
        
        // Sum output token amounts
        let output_sum: u64 = tx.outputs.iter()
            .filter_map(|output| {
                output.charm_state.as_ref()
                    .and_then(|state| state.get(app_tag))
                    .and_then(|data| data.as_u64())
            })
            .sum();
        
        // Check conservation rule
        if input_sum != output_sum {
            return false;
        }
        
        // Check authorization (simplified - real impl would verify signatures)
        if let Some(auth_data) = x.as_bytes() {
            if auth_data.is_empty() {
                return false;
            }
        }
        
        true
    }
    
    /// Check if this is a mint operation (creating new tokens)
    pub fn is_mint(app: &App, tx: &Transaction) -> bool {
        let app_tag = &app.tag;
        
        // Mint if no inputs have this token but outputs do
        let has_input_tokens = tx.inputs.iter().any(|input| {
            input.charm_state.as_ref()
                .map(|state| state.get(app_tag).is_some())
                .unwrap_or(false)
        });
        
        let has_output_tokens = tx.outputs.iter().any(|output| {
            output.charm_state.as_ref()
                .map(|state| state.get(app_tag).is_some())
                .unwrap_or(false)
        });
        
        !has_input_tokens && has_output_tokens
    }
    
    /// Check if this is a burn operation (destroying tokens)
    pub fn is_burn(app: &App, tx: &Transaction) -> bool {
        let app_tag = &app.tag;
        
        let input_sum: u64 = tx.inputs.iter()
            .filter_map(|input| {
                input.charm_state.as_ref()
                    .and_then(|state| state.get(app_tag))
                    .and_then(|data| data.as_u64())
            })
            .sum();
        
        let output_sum: u64 = tx.outputs.iter()
            .filter_map(|output| {
                output.charm_state.as_ref()
                    .and_then(|state| state.get(app_tag))
                    .and_then(|data| data.as_u64())
            })
            .sum();
        
        input_sum > output_sum
    }
}

/// NFT spell checker - validates non-fungible token rules
pub mod nft {
    use charms_sdk::data::{App, Data, Transaction};
    
    /// NFT data structure
    #[derive(Debug, Clone)]
    pub struct NftData {
        pub id: [u8; 32],
        pub metadata_hash: [u8; 32],
        pub creator: Vec<u8>,
    }
    
    /// Validate an NFT transfer
    /// 
    /// Rules:
    /// - NFT ID must be unique and not duplicated
    /// - Only one output can contain each NFT
    /// - Creator signature required for initial mint
    pub fn check(app: &App, tx: &Transaction, x: &Data, _w: &Data) -> bool {
        let app_tag = &app.tag;
        
        // Collect all input NFT IDs
        let input_nfts: Vec<&[u8]> = tx.inputs.iter()
            .filter_map(|input| {
                input.charm_state.as_ref()
                    .and_then(|state| state.get(app_tag))
                    .and_then(|data| data.as_bytes())
            })
            .collect();
        
        // Collect all output NFT IDs
        let output_nfts: Vec<&[u8]> = tx.outputs.iter()
            .filter_map(|output| {
                output.charm_state.as_ref()
                    .and_then(|state| state.get(app_tag))
                    .and_then(|data| data.as_bytes())
            })
            .collect();
        
        // Check no duplicates in outputs
        let mut seen: Vec<&[u8]> = Vec::new();
        for nft in &output_nfts {
            if seen.contains(nft) {
                return false; // Duplicate NFT
            }
            seen.push(nft);
        }
        
        // All output NFTs must come from inputs (no creation without proper mint)
        for nft in &output_nfts {
            if !input_nfts.contains(nft) {
                // This is a mint - verify creator signature in x
                if x.is_empty() {
                    return false;
                }
            }
        }
        
        true
    }
}

/// Escrow spell checker - validates escrow contract rules
pub mod escrow {
    use charms_sdk::data::{App, Data, Transaction};
    
    /// Escrow states
    #[derive(Debug, Clone, PartialEq, Eq)]
    pub enum EscrowState {
        Created,
        Funded,
        MilestoneCompleted(u32),
        Released,
        Disputed,
        Refunded,
    }
    
    /// Validate escrow state transitions
    pub fn check(app: &App, tx: &Transaction, x: &Data, _w: &Data) -> bool {
        let app_tag = &app.tag;
        
        // Get current escrow state from inputs
        let current_state = tx.inputs.iter()
            .find_map(|input| {
                input.charm_state.as_ref()
                    .and_then(|state| state.get(app_tag))
                    .and_then(|data| parse_escrow_state(data))
            });
        
        // Get next state from outputs
        let next_state = tx.outputs.iter()
            .find_map(|output| {
                output.charm_state.as_ref()
                    .and_then(|state| state.get(app_tag))
                    .and_then(|data| parse_escrow_state(data))
            });
        
        // Validate state transition
        match (current_state, next_state) {
            (None, Some(EscrowState::Created)) => true, // Initial creation
            (Some(EscrowState::Created), Some(EscrowState::Funded)) => true,
            (Some(EscrowState::Funded), Some(EscrowState::MilestoneCompleted(_))) => true,
            (Some(EscrowState::MilestoneCompleted(_)), Some(EscrowState::Released)) => true,
            (Some(EscrowState::Funded), Some(EscrowState::Disputed)) => true,
            (Some(EscrowState::Disputed), Some(EscrowState::Refunded)) => true,
            (Some(EscrowState::Disputed), Some(EscrowState::Released)) => true,
            _ => false, // Invalid transition
        }
    }
    
    fn parse_escrow_state(data: &Data) -> Option<EscrowState> {
        match data.as_u64()? {
            0 => Some(EscrowState::Created),
            1 => Some(EscrowState::Funded),
            2 => Some(EscrowState::Released),
            3 => Some(EscrowState::Disputed),
            4 => Some(EscrowState::Refunded),
            n if n >= 100 => Some(EscrowState::MilestoneCompleted((n - 100) as u32)),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use charms_sdk::data::*;
    
    #[test]
    fn test_token_conservation() {
        let app = App::new("test-token", [0u8; 32]);
        
        let mut tx = Transaction::new([0u8; 32]);
        
        // Add input with 1000 tokens
        tx.inputs.push(TxInput {
            utxo_ref: UtxoRef { txid: [0u8; 32], vout: 0 },
            charm_state: Some(
                CharmState::new().with_app("test-token", Data::U64(1000))
            ),
        });
        
        // Add outputs totaling 1000 tokens
        tx.outputs.push(TxOutput {
            index: 0,
            value: 546,
            script_pubkey: vec![],
            charm_state: Some(
                CharmState::new().with_app("test-token", Data::U64(600))
            ),
        });
        tx.outputs.push(TxOutput {
            index: 1,
            value: 546,
            script_pubkey: vec![],
            charm_state: Some(
                CharmState::new().with_app("test-token", Data::U64(400))
            ),
        });
        
        let auth = Data::Bytes(vec![1, 2, 3]); // Mock authorization
        
        assert!(token::check(&app, &tx, &auth, &Data::Empty));
    }
}
