//! Charms Data Types - Core types for the Charms protocol
//! 
//! This crate defines the fundamental data structures used throughout
//! the Charms ecosystem for spell verification and transaction processing.
//! 
//! Build with WASM support: `wasm-pack build --target web --features wasm`

#[cfg(feature = "wasm")]
pub mod wasm_bindings;

use std::collections::BTreeMap;

/// Represents a Charms application definition
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct App {
    /// The unique identifier/tag for this app
    pub tag: String,
    /// Version key hash for verification
    pub vk_hash: [u8; 32],
    /// Application-specific parameters
    pub params: Data,
}

impl App {
    /// Create a new App instance
    pub fn new(tag: impl Into<String>, vk_hash: [u8; 32]) -> Self {
        Self {
            tag: tag.into(),
            vk_hash,
            params: Data::Empty,
        }
    }
    
    /// Create an App with parameters
    pub fn with_params(tag: impl Into<String>, vk_hash: [u8; 32], params: Data) -> Self {
        Self {
            tag: tag.into(),
            vk_hash,
            params,
        }
    }
}

/// Represents a Bitcoin transaction in the Charms context
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Transaction {
    /// Transaction ID (32-byte hash)
    pub txid: [u8; 32],
    /// Input UTXOs with their charm states
    pub inputs: Vec<TxInput>,
    /// Output UTXOs with their charm states  
    pub outputs: Vec<TxOutput>,
    /// The normalized spell being executed
    pub spell: Option<NormalizedSpell>,
}

impl Transaction {
    /// Create a new empty transaction
    pub fn new(txid: [u8; 32]) -> Self {
        Self {
            txid,
            inputs: Vec::new(),
            outputs: Vec::new(),
            spell: None,
        }
    }
    
    /// Add an input to the transaction
    pub fn add_input(&mut self, input: TxInput) {
        self.inputs.push(input);
    }
    
    /// Add an output to the transaction
    pub fn add_output(&mut self, output: TxOutput) {
        self.outputs.push(output);
    }
    
    /// Verify the transaction spell is valid
    pub fn verify_spell(&self) -> bool {
        if let Some(ref spell) = self.spell {
            spell.verify()
        } else {
            true // No spell means no charm constraints
        }
    }
}

/// Transaction input with optional charm state
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TxInput {
    /// Reference to the UTXO being spent
    pub utxo_ref: UtxoRef,
    /// Charm state attached to this input (if any)
    pub charm_state: Option<CharmState>,
}

/// Transaction output with optional charm state
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TxOutput {
    /// Output index
    pub index: u32,
    /// Satoshi value
    pub value: u64,
    /// Script pubkey
    pub script_pubkey: Vec<u8>,
    /// Charm state for this output (if any)
    pub charm_state: Option<CharmState>,
}

/// Reference to a UTXO
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UtxoRef {
    /// Transaction ID containing this UTXO
    pub txid: [u8; 32],
    /// Output index within the transaction
    pub vout: u32,
}

/// Charm state attached to a UTXO
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CharmState {
    /// Map of app tags to their state data
    pub apps: BTreeMap<String, Data>,
}

impl CharmState {
    /// Create an empty charm state
    pub fn new() -> Self {
        Self {
            apps: BTreeMap::new(),
        }
    }
    
    /// Add app state
    pub fn with_app(mut self, tag: impl Into<String>, state: Data) -> Self {
        self.apps.insert(tag.into(), state);
        self
    }
    
    /// Get state for an app
    pub fn get(&self, tag: &str) -> Option<&Data> {
        self.apps.get(tag)
    }
}

impl Default for CharmState {
    fn default() -> Self {
        Self::new()
    }
}

/// A normalized spell structure for ZK verification
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NormalizedSpell {
    /// Protocol version
    pub version: u32,
    /// Spell inputs
    pub ins: Vec<SpellInput>,
    /// Spell outputs
    pub outs: Vec<SpellOutput>,
}

impl NormalizedSpell {
    /// Create a new spell
    pub fn new(version: u32) -> Self {
        Self {
            version,
            ins: Vec::new(),
            outs: Vec::new(),
        }
    }
    
    /// Verify the spell is well-formed
    pub fn verify(&self) -> bool {
        // Basic validation
        self.version > 0 && !self.ins.is_empty() && !self.outs.is_empty()
    }
}

/// Spell input reference
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpellInput {
    /// UTXO reference
    pub utxo_ref: UtxoRef,
    /// Input charm state
    pub charms: Option<CharmState>,
}

/// Spell output definition
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpellOutput {
    /// Output index
    pub index: u32,
    /// Output charm state
    pub charms: Option<CharmState>,
}

/// Flexible data type for app state
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Data {
    /// No data
    Empty,
    /// Boolean value
    Bool(bool),
    /// Unsigned integer
    U64(u64),
    /// Signed integer
    I64(i64),
    /// Byte array
    Bytes(Vec<u8>),
    /// UTF-8 string
    String(String),
    /// List of data values
    List(Vec<Data>),
    /// Map of string keys to data values
    Map(BTreeMap<String, Data>),
}

impl Data {
    /// Check if data is empty
    pub fn is_empty(&self) -> bool {
        matches!(self, Data::Empty)
    }
    
    /// Get as u64 if applicable
    pub fn as_u64(&self) -> Option<u64> {
        match self {
            Data::U64(v) => Some(*v),
            _ => None,
        }
    }
    
    /// Get as bytes if applicable
    pub fn as_bytes(&self) -> Option<&[u8]> {
        match self {
            Data::Bytes(v) => Some(v),
            _ => None,
        }
    }
    
    /// Get as string if applicable
    pub fn as_str(&self) -> Option<&str> {
        match self {
            Data::String(s) => Some(s),
            _ => None,
        }
    }
}

impl Default for Data {
    fn default() -> Self {
        Data::Empty
    }
}

/// Utility functions for data handling
pub mod util {
    use super::*;
    use std::io::Read;
    
    /// Read and deserialize data from stdin
    pub fn read<R: Read>(_reader: R) -> Result<(App, Transaction, Data, Data), std::io::Error> {
        // Placeholder - real implementation would use serde
        Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Not implemented"
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_app_creation() {
        let app = App::new("test-token", [0u8; 32]);
        assert_eq!(app.tag, "test-token");
    }
    
    #[test]
    fn test_charm_state() {
        let state = CharmState::new()
            .with_app("token", Data::U64(1000));
        
        assert!(state.get("token").is_some());
        assert_eq!(state.get("token").unwrap().as_u64(), Some(1000));
    }
    
    #[test]
    fn test_spell_verification() {
        let mut spell = NormalizedSpell::new(1);
        spell.ins.push(SpellInput {
            utxo_ref: UtxoRef { txid: [0u8; 32], vout: 0 },
            charms: None,
        });
        spell.outs.push(SpellOutput {
            index: 0,
            charms: None,
        });
        
        assert!(spell.verify());
    }
}
