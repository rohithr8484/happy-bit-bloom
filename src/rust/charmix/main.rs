//! Charmix Main Entry Point
//! 
//! This binary reads spell data from stdin and validates it using the
//! appropriate spell checker based on the app configuration.

use charms_sdk::data::{App, Data, Transaction};

/// Main entry point using the charmix macro
/// 
/// In a real SP1 zkVM environment, this would be compiled to an ELF binary
/// and executed inside the zkVM to generate proofs.
fn main() {
    // Read spell data from stdin
    let (app, tx, x, w): (App, Transaction, Data, Data) = 
        charms_sdk::data::util::read(std::io::stdin())
            .expect("should deserialize (app, tx, x, w): (App, Transaction, Data, Data)");
    
    // Route to appropriate checker based on app tag
    let result = match app.tag.as_str() {
        tag if tag.starts_with("token:") => charmix::token::check(&app, &tx, &x, &w),
        tag if tag.starts_with("nft:") => charmix::nft::check(&app, &tx, &x, &w),
        tag if tag.starts_with("escrow:") => charmix::escrow::check(&app, &tx, &x, &w),
        _ => {
            eprintln!("Unknown app type: {}", app.tag);
            false
        }
    };
    
    assert!(result, "Spell verification failed for app: {}", app.tag);
    
    println!("✓ Spell verified successfully");
}

/// Alternative main using macro pattern (commented for reference)
/// 
/// ```rust
/// charmix::main!(charmix::token::check);
/// ```

#[cfg(test)]
mod tests {
    use super::*;
    use charms_sdk::data::*;
    
    fn create_test_token_tx() -> (App, Transaction, Data, Data) {
        let app = App::new("token:TEST", [0u8; 32]);
        
        let mut tx = Transaction::new([1u8; 32]);
        
        // Input: 1000 tokens
        tx.inputs.push(TxInput {
            utxo_ref: UtxoRef { txid: [0u8; 32], vout: 0 },
            charm_state: Some(
                CharmState::new().with_app("token:TEST", Data::U64(1000))
            ),
        });
        
        // Output: 1000 tokens (split)
        tx.outputs.push(TxOutput {
            index: 0,
            value: 546,
            script_pubkey: vec![0x00, 0x14], // P2WPKH prefix
            charm_state: Some(
                CharmState::new().with_app("token:TEST", Data::U64(700))
            ),
        });
        tx.outputs.push(TxOutput {
            index: 1,
            value: 546,
            script_pubkey: vec![0x00, 0x14],
            charm_state: Some(
                CharmState::new().with_app("token:TEST", Data::U64(300))
            ),
        });
        
        let x = Data::Bytes(vec![0x30, 0x44]); // Mock signature prefix
        let w = Data::Empty;
        
        (app, tx, x, w)
    }
    
    #[test]
    fn test_token_spell() {
        let (app, tx, x, w) = create_test_token_tx();
        assert!(charmix::token::check(&app, &tx, &x, &w));
    }
    
    #[test]
    fn test_token_mint_detection() {
        let app = App::new("token:MINT", [0u8; 32]);
        let mut tx = Transaction::new([2u8; 32]);
        
        // No inputs with tokens
        tx.inputs.push(TxInput {
            utxo_ref: UtxoRef { txid: [0u8; 32], vout: 0 },
            charm_state: None,
        });
        
        // Output with new tokens
        tx.outputs.push(TxOutput {
            index: 0,
            value: 546,
            script_pubkey: vec![],
            charm_state: Some(
                CharmState::new().with_app("token:MINT", Data::U64(1_000_000))
            ),
        });
        
        assert!(charmix::token::is_mint(&app, &tx));
    }
    
    #[test]
    fn test_escrow_state_transition() {
        let app = App::new("escrow:CONTRACT1", [0u8; 32]);
        let mut tx = Transaction::new([3u8; 32]);
        
        // Input: Created state (0)
        tx.inputs.push(TxInput {
            utxo_ref: UtxoRef { txid: [0u8; 32], vout: 0 },
            charm_state: Some(
                CharmState::new().with_app("escrow:CONTRACT1", Data::U64(0))
            ),
        });
        
        // Output: Funded state (1)
        tx.outputs.push(TxOutput {
            index: 0,
            value: 100_000,
            script_pubkey: vec![],
            charm_state: Some(
                CharmState::new().with_app("escrow:CONTRACT1", Data::U64(1))
            ),
        });
        
        let x = Data::Empty;
        let w = Data::Empty;
        
        assert!(charmix::escrow::check(&app, &tx, &x, &w));
    }
}
