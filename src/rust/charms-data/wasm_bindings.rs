//! WASM Bindings for Charms Data Types
//! 
//! This module provides JavaScript-compatible bindings for the core Charms
//! data types using wasm-bindgen. Build with: wasm-pack build --target web --features wasm

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;
#[cfg(feature = "wasm")]
use serde::{Deserialize, Serialize};
#[cfg(feature = "wasm")]
use std::collections::BTreeMap;

// ============================================
// WASM-compatible Data Types
// ============================================

#[cfg(feature = "wasm")]
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmApp {
    tag: String,
    vk_hash: String, // hex encoded
    params: Option<String>, // JSON encoded WasmData
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl WasmApp {
    #[wasm_bindgen(constructor)]
    pub fn new(tag: String, vk_hash: String) -> Self {
        Self {
            tag,
            vk_hash,
            params: None,
        }
    }
    
    #[wasm_bindgen(getter)]
    pub fn tag(&self) -> String {
        self.tag.clone()
    }
    
    #[wasm_bindgen(getter)]
    pub fn vk_hash(&self) -> String {
        self.vk_hash.clone()
    }
    
    #[wasm_bindgen]
    pub fn with_params(mut self, params_json: String) -> Self {
        self.params = Some(params_json);
        self
    }
    
    #[wasm_bindgen]
    pub fn to_json(&self) -> Result<String, JsError> {
        serde_json::to_string(self)
            .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
    }
    
    #[wasm_bindgen]
    pub fn from_json(json: &str) -> Result<WasmApp, JsError> {
        serde_json::from_str(json)
            .map_err(|e| JsError::new(&format!("Parse error: {}", e)))
    }
}

#[cfg(feature = "wasm")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum WasmData {
    Empty,
    Bool(bool),
    U64(u64),
    I64(i64),
    Bytes(String), // hex encoded
    String(String),
    List(Vec<WasmData>),
    Map(BTreeMap<String, WasmData>),
}

#[cfg(feature = "wasm")]
impl Default for WasmData {
    fn default() -> Self {
        WasmData::Empty
    }
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub struct WasmDataBuilder {
    data: WasmData,
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl WasmDataBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { data: WasmData::Empty }
    }
    
    #[wasm_bindgen]
    pub fn empty() -> Self {
        Self { data: WasmData::Empty }
    }
    
    #[wasm_bindgen]
    pub fn bool_value(value: bool) -> Self {
        Self { data: WasmData::Bool(value) }
    }
    
    #[wasm_bindgen]
    pub fn u64_value(value: u64) -> Self {
        Self { data: WasmData::U64(value) }
    }
    
    #[wasm_bindgen]
    pub fn i64_value(value: i64) -> Self {
        Self { data: WasmData::I64(value) }
    }
    
    #[wasm_bindgen]
    pub fn bytes_value(hex: String) -> Self {
        Self { data: WasmData::Bytes(hex) }
    }
    
    #[wasm_bindgen]
    pub fn string_value(value: String) -> Self {
        Self { data: WasmData::String(value) }
    }
    
    #[wasm_bindgen]
    pub fn to_json(&self) -> Result<String, JsError> {
        serde_json::to_string(&self.data)
            .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
    }
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmUtxoRef {
    txid: String,
    vout: u32,
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl WasmUtxoRef {
    #[wasm_bindgen(constructor)]
    pub fn new(txid: String, vout: u32) -> Self {
        Self { txid, vout }
    }
    
    #[wasm_bindgen(getter)]
    pub fn txid(&self) -> String {
        self.txid.clone()
    }
    
    #[wasm_bindgen(getter)]
    pub fn vout(&self) -> u32 {
        self.vout
    }
}

#[cfg(feature = "wasm")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmCharmState {
    pub apps: BTreeMap<String, WasmData>,
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub struct WasmCharmStateBuilder {
    apps: BTreeMap<String, WasmData>,
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl WasmCharmStateBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { apps: BTreeMap::new() }
    }
    
    #[wasm_bindgen]
    pub fn with_app_u64(mut self, tag: String, amount: u64) -> Self {
        self.apps.insert(tag, WasmData::U64(amount));
        self
    }
    
    #[wasm_bindgen]
    pub fn with_app_bytes(mut self, tag: String, hex: String) -> Self {
        self.apps.insert(tag, WasmData::Bytes(hex));
        self
    }
    
    #[wasm_bindgen]
    pub fn with_app_string(mut self, tag: String, value: String) -> Self {
        self.apps.insert(tag, WasmData::String(value));
        self
    }
    
    #[wasm_bindgen]
    pub fn to_json(&self) -> Result<String, JsError> {
        let state = WasmCharmState { apps: self.apps.clone() };
        serde_json::to_string(&state)
            .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
    }
    
    pub fn build(&self) -> WasmCharmState {
        WasmCharmState { apps: self.apps.clone() }
    }
}

#[cfg(feature = "wasm")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmTxInput {
    pub utxo_ref: WasmUtxoRef,
    pub charm_state: Option<WasmCharmState>,
}

#[cfg(feature = "wasm")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmTxOutput {
    pub index: u32,
    pub value: u64,
    pub script_pubkey: String,
    pub charm_state: Option<WasmCharmState>,
}

#[cfg(feature = "wasm")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmTransaction {
    pub txid: String,
    pub inputs: Vec<WasmTxInput>,
    pub outputs: Vec<WasmTxOutput>,
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub struct WasmTransactionBuilder {
    txid: String,
    inputs: Vec<WasmTxInput>,
    outputs: Vec<WasmTxOutput>,
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl WasmTransactionBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new(txid: String) -> Self {
        Self {
            txid,
            inputs: Vec::new(),
            outputs: Vec::new(),
        }
    }
    
    #[wasm_bindgen]
    pub fn add_input(mut self, txid: String, vout: u32, charm_state_json: Option<String>) -> Self {
        let charm_state = charm_state_json.and_then(|json| {
            serde_json::from_str::<WasmCharmState>(&json).ok()
        });
        
        self.inputs.push(WasmTxInput {
            utxo_ref: WasmUtxoRef { txid, vout },
            charm_state,
        });
        self
    }
    
    #[wasm_bindgen]
    pub fn add_output(mut self, index: u32, value: u64, script_pubkey: String, charm_state_json: Option<String>) -> Self {
        let charm_state = charm_state_json.and_then(|json| {
            serde_json::from_str::<WasmCharmState>(&json).ok()
        });
        
        self.outputs.push(WasmTxOutput {
            index,
            value,
            script_pubkey,
            charm_state,
        });
        self
    }
    
    #[wasm_bindgen]
    pub fn to_json(&self) -> Result<String, JsError> {
        let tx = WasmTransaction {
            txid: self.txid.clone(),
            inputs: self.inputs.clone(),
            outputs: self.outputs.clone(),
        };
        serde_json::to_string(&tx)
            .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
    }
    
    pub fn build(&self) -> WasmTransaction {
        WasmTransaction {
            txid: self.txid.clone(),
            inputs: self.inputs.clone(),
            outputs: self.outputs.clone(),
        }
    }
}

// ============================================
// Spell Types for WASM
// ============================================

#[cfg(feature = "wasm")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmSpellInput {
    pub utxo_ref: WasmUtxoRef,
    pub charms: Option<WasmCharmState>,
}

#[cfg(feature = "wasm")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmSpellOutput {
    pub index: u32,
    pub charms: Option<WasmCharmState>,
}

#[cfg(feature = "wasm")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmNormalizedSpell {
    pub version: u32,
    pub ins: Vec<WasmSpellInput>,
    pub outs: Vec<WasmSpellOutput>,
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub struct WasmSpellBuilder {
    version: u32,
    ins: Vec<WasmSpellInput>,
    outs: Vec<WasmSpellOutput>,
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl WasmSpellBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new(version: u32) -> Self {
        Self {
            version,
            ins: Vec::new(),
            outs: Vec::new(),
        }
    }
    
    #[wasm_bindgen]
    pub fn add_input(mut self, txid: String, vout: u32, charms_json: Option<String>) -> Self {
        let charms = charms_json.and_then(|json| {
            serde_json::from_str::<WasmCharmState>(&json).ok()
        });
        
        self.ins.push(WasmSpellInput {
            utxo_ref: WasmUtxoRef { txid, vout },
            charms,
        });
        self
    }
    
    #[wasm_bindgen]
    pub fn add_output(mut self, index: u32, charms_json: Option<String>) -> Self {
        let charms = charms_json.and_then(|json| {
            serde_json::from_str::<WasmCharmState>(&json).ok()
        });
        
        self.outs.push(WasmSpellOutput {
            index,
            charms,
        });
        self
    }
    
    #[wasm_bindgen]
    pub fn to_json(&self) -> Result<String, JsError> {
        let spell = WasmNormalizedSpell {
            version: self.version,
            ins: self.ins.clone(),
            outs: self.outs.clone(),
        };
        serde_json::to_string(&spell)
            .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
    }
    
    #[wasm_bindgen]
    pub fn verify(&self) -> bool {
        self.version > 0 && !self.ins.is_empty() && !self.outs.is_empty()
    }
}

// ============================================
// WASM Entry Points
// ============================================

#[cfg(feature = "wasm")]
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Get version string
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn get_data_version() -> String {
    "0.10.0".to_string()
}

/// Create empty WasmData JSON
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn create_empty_data() -> String {
    r#"{"type":"Empty"}"#.to_string()
}

/// Create u64 WasmData JSON
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn create_u64_data(value: u64) -> String {
    format!(r#"{{"type":"U64","value":{}}}"#, value)
}

/// Create bytes WasmData JSON from hex string
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn create_bytes_data(hex: &str) -> String {
    format!(r#"{{"type":"Bytes","value":"{}"}}"#, hex)
}

/// Parse and validate charm state JSON
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn validate_charm_state(json: &str) -> Result<bool, JsError> {
    match serde_json::from_str::<WasmCharmState>(json) {
        Ok(_) => Ok(true),
        Err(e) => Err(JsError::new(&format!("Invalid charm state: {}", e))),
    }
}

/// Parse and validate transaction JSON
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn validate_transaction(json: &str) -> Result<bool, JsError> {
    match serde_json::from_str::<WasmTransaction>(json) {
        Ok(_) => Ok(true),
        Err(e) => Err(JsError::new(&format!("Invalid transaction: {}", e))),
    }
}

/// Parse and validate spell JSON
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn validate_spell(json: &str) -> Result<JsValue, JsError> {
    let spell: WasmNormalizedSpell = serde_json::from_str(json)
        .map_err(|e| JsError::new(&format!("Invalid spell: {}", e)))?;
    
    let is_valid = spell.version > 0 && !spell.ins.is_empty() && !spell.outs.is_empty();
    
    let result = serde_json::json!({
        "valid": is_valid,
        "version": spell.version,
        "inputCount": spell.ins.len(),
        "outputCount": spell.outs.len(),
    });
    
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
}
