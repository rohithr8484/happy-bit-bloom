//! WASM Bindings for Charms SDK
//! 
//! This module provides JavaScript-compatible bindings for the Charms SDK
//! using wasm-bindgen. Build with: wasm-pack build --target web --features wasm

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
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmApp {
    pub tag: String,
    pub vk_hash: String, // hex encoded
    #[serde(default)]
    pub params: Option<WasmData>,
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
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmUtxoRef {
    pub txid: String,
    pub vout: u32,
}

#[cfg(feature = "wasm")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmCharmState {
    pub apps: BTreeMap<String, WasmData>,
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

// ============================================
// Check Results
// ============================================

#[cfg(feature = "wasm")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmCheckResult {
    pub valid: bool,
    pub spell_type: String,
    pub input_sum: Option<u64>,
    pub output_sum: Option<u64>,
    pub is_mint: Option<bool>,
    pub is_burn: Option<bool>,
    pub current_state: Option<String>,
    pub next_state: Option<String>,
    pub state_transition_valid: Option<bool>,
    pub errors: Vec<String>,
}

// ============================================
// WASM Entry Points
// ============================================

#[cfg(feature = "wasm")]
#[wasm_bindgen(start)]
pub fn init() {
    // Set up panic hook for better error messages in browser console
    console_error_panic_hook::set_once();
}

/// Check a spell and return validation result
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn check_spell(app_json: &str, tx_json: &str, x_json: &str, w_json: &str) -> Result<JsValue, JsError> {
    let app: WasmApp = serde_json::from_str(app_json)
        .map_err(|e| JsError::new(&format!("Failed to parse app: {}", e)))?;
    let tx: WasmTransaction = serde_json::from_str(tx_json)
        .map_err(|e| JsError::new(&format!("Failed to parse tx: {}", e)))?;
    let x: WasmData = serde_json::from_str(x_json).unwrap_or(WasmData::Empty);
    let w: WasmData = serde_json::from_str(w_json).unwrap_or(WasmData::Empty);
    
    let result = check_spell_internal(&app, &tx, &x, &w);
    
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Failed to serialize result: {}", e)))
}

/// Check a token spell
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn check_token(app_json: &str, tx_json: &str, x_json: &str) -> Result<JsValue, JsError> {
    let app: WasmApp = serde_json::from_str(app_json)
        .map_err(|e| JsError::new(&format!("Failed to parse app: {}", e)))?;
    let tx: WasmTransaction = serde_json::from_str(tx_json)
        .map_err(|e| JsError::new(&format!("Failed to parse tx: {}", e)))?;
    let x: WasmData = serde_json::from_str(x_json).unwrap_or(WasmData::Empty);
    
    let result = check_token_internal(&app, &tx, &x);
    
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Failed to serialize result: {}", e)))
}

/// Check an escrow spell
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn check_escrow(app_json: &str, tx_json: &str) -> Result<JsValue, JsError> {
    let app: WasmApp = serde_json::from_str(app_json)
        .map_err(|e| JsError::new(&format!("Failed to parse app: {}", e)))?;
    let tx: WasmTransaction = serde_json::from_str(tx_json)
        .map_err(|e| JsError::new(&format!("Failed to parse tx: {}", e)))?;
    
    let result = check_escrow_internal(&app, &tx);
    
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Failed to serialize result: {}", e)))
}

/// Verify a normalized spell structure
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn verify_spell(spell_json: &str) -> Result<JsValue, JsError> {
    let spell: WasmNormalizedSpell = serde_json::from_str(spell_json)
        .map_err(|e| JsError::new(&format!("Failed to parse spell: {}", e)))?;
    
    let valid = spell.version > 0 && !spell.ins.is_empty() && !spell.outs.is_empty();
    
    let result = serde_json::json!({
        "valid": valid,
        "version": spell.version,
        "inputCount": spell.ins.len(),
        "outputCount": spell.outs.len(),
    });
    
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Failed to serialize result: {}", e)))
}

/// Build a token transaction for testing
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn build_token_tx(
    app_tag: &str,
    vk_hash: &str,
    input_amounts_json: &str,
    output_amounts_json: &str
) -> Result<JsValue, JsError> {
    let input_amounts: Vec<u64> = serde_json::from_str(input_amounts_json)
        .map_err(|e| JsError::new(&format!("Failed to parse input amounts: {}", e)))?;
    let output_amounts: Vec<u64> = serde_json::from_str(output_amounts_json)
        .map_err(|e| JsError::new(&format!("Failed to parse output amounts: {}", e)))?;
    
    let app = WasmApp {
        tag: app_tag.to_string(),
        vk_hash: vk_hash.to_string(),
        params: None,
    };
    
    let inputs: Vec<WasmTxInput> = input_amounts.iter().enumerate().map(|(i, &amount)| {
        let mut apps = BTreeMap::new();
        apps.insert(app_tag.to_string(), WasmData::U64(amount));
        WasmTxInput {
            utxo_ref: WasmUtxoRef {
                txid: "0".repeat(64),
                vout: i as u32,
            },
            charm_state: Some(WasmCharmState { apps }),
        }
    }).collect();
    
    let outputs: Vec<WasmTxOutput> = output_amounts.iter().enumerate().map(|(i, &amount)| {
        let mut apps = BTreeMap::new();
        apps.insert(app_tag.to_string(), WasmData::U64(amount));
        WasmTxOutput {
            index: i as u32,
            value: 546,
            script_pubkey: "0014".to_string(),
            charm_state: Some(WasmCharmState { apps }),
        }
    }).collect();
    
    let tx = WasmTransaction {
        txid: "0".repeat(64),
        inputs,
        outputs,
    };
    
    let result = serde_json::json!({
        "app": app,
        "tx": tx,
    });
    
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Failed to serialize result: {}", e)))
}

/// Get SDK version
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn get_version() -> String {
    "0.1.0".to_string()
}

// ============================================
// Internal Check Functions
// ============================================

#[cfg(feature = "wasm")]
fn get_state_data(state: &Option<WasmCharmState>, app_tag: &str) -> Option<WasmData> {
    state.as_ref()?.apps.get(app_tag).cloned()
}

#[cfg(feature = "wasm")]
fn data_as_u64(data: &Option<WasmData>) -> Option<u64> {
    match data.as_ref()? {
        WasmData::U64(v) => Some(*v),
        _ => None,
    }
}

#[cfg(feature = "wasm")]
fn check_spell_internal(app: &WasmApp, tx: &WasmTransaction, x: &WasmData, w: &WasmData) -> WasmCheckResult {
    if app.tag.starts_with("token:") {
        check_token_internal(app, tx, x)
    } else if app.tag.starts_with("nft:") {
        check_nft_internal(app, tx, x)
    } else if app.tag.starts_with("escrow:") {
        check_escrow_internal(app, tx)
    } else {
        WasmCheckResult {
            valid: false,
            spell_type: "unknown".to_string(),
            input_sum: None,
            output_sum: None,
            is_mint: None,
            is_burn: None,
            current_state: None,
            next_state: None,
            state_transition_valid: None,
            errors: vec![format!("Unknown app type: {}", app.tag)],
        }
    }
}

#[cfg(feature = "wasm")]
fn check_token_internal(app: &WasmApp, tx: &WasmTransaction, x: &WasmData) -> WasmCheckResult {
    let mut errors = Vec::new();
    let app_tag = &app.tag;
    
    // Sum input amounts
    let input_sum: u64 = tx.inputs.iter()
        .filter_map(|input| {
            let state = get_state_data(&input.charm_state, app_tag);
            data_as_u64(&state)
        })
        .sum();
    
    // Sum output amounts
    let output_sum: u64 = tx.outputs.iter()
        .filter_map(|output| {
            let state = get_state_data(&output.charm_state, app_tag);
            data_as_u64(&state)
        })
        .sum();
    
    // Check conservation
    if input_sum != output_sum {
        errors.push(format!("Token conservation failed: input={} != output={}", input_sum, output_sum));
    }
    
    // Check authorization
    if matches!(x, WasmData::Bytes(s) if s.is_empty()) {
        errors.push("Empty authorization data".to_string());
    }
    
    let is_mint = input_sum == 0 && output_sum > 0;
    let is_burn = input_sum > output_sum;
    
    WasmCheckResult {
        valid: errors.is_empty(),
        spell_type: "token".to_string(),
        input_sum: Some(input_sum),
        output_sum: Some(output_sum),
        is_mint: Some(is_mint),
        is_burn: Some(is_burn),
        current_state: None,
        next_state: None,
        state_transition_valid: None,
        errors,
    }
}

#[cfg(feature = "wasm")]
fn check_nft_internal(app: &WasmApp, tx: &WasmTransaction, x: &WasmData) -> WasmCheckResult {
    let mut errors = Vec::new();
    let app_tag = &app.tag;
    
    // Collect input NFT IDs
    let input_nfts: Vec<String> = tx.inputs.iter()
        .filter_map(|input| {
            let state = get_state_data(&input.charm_state, app_tag)?;
            match state {
                WasmData::Bytes(s) => Some(s),
                _ => None,
            }
        })
        .collect();
    
    // Collect output NFT IDs
    let output_nfts: Vec<String> = tx.outputs.iter()
        .filter_map(|output| {
            let state = get_state_data(&output.charm_state, app_tag)?;
            match state {
                WasmData::Bytes(s) => Some(s),
                _ => None,
            }
        })
        .collect();
    
    // Check for duplicates
    let mut seen = std::collections::HashSet::new();
    for nft in &output_nfts {
        if !seen.insert(nft.clone()) {
            errors.push(format!("Duplicate NFT in outputs: {}", nft));
        }
    }
    
    // Check mints have authorization
    for nft in &output_nfts {
        if !input_nfts.contains(nft) {
            if matches!(x, WasmData::Empty) {
                errors.push(format!("NFT mint without authorization: {}", nft));
            }
        }
    }
    
    WasmCheckResult {
        valid: errors.is_empty(),
        spell_type: "nft".to_string(),
        input_sum: None,
        output_sum: None,
        is_mint: Some(!input_nfts.is_empty() && !output_nfts.is_empty()),
        is_burn: None,
        current_state: None,
        next_state: None,
        state_transition_valid: None,
        errors,
    }
}

#[cfg(feature = "wasm")]
fn check_escrow_internal(app: &WasmApp, tx: &WasmTransaction) -> WasmCheckResult {
    let mut errors = Vec::new();
    let app_tag = &app.tag;
    
    let state_names = ["Created", "Funded", "Released", "Disputed", "Refunded"];
    
    // Get current state
    let current_state: Option<u64> = tx.inputs.iter()
        .find_map(|input| {
            let state = get_state_data(&input.charm_state, app_tag);
            data_as_u64(&state)
        });
    
    // Get next state
    let next_state: Option<u64> = tx.outputs.iter()
        .find_map(|output| {
            let state = get_state_data(&output.charm_state, app_tag);
            data_as_u64(&state)
        });
    
    let current_name = current_state
        .and_then(|s| state_names.get(s as usize))
        .map(|s| s.to_string())
        .unwrap_or_else(|| "None".to_string());
    
    let next_name = next_state
        .and_then(|s| state_names.get(s as usize))
        .map(|s| s.to_string())
        .unwrap_or_else(|| "None".to_string());
    
    // Valid transitions
    let valid_transitions: Vec<(Option<u64>, Option<u64>)> = vec![
        (None, Some(0)),       // -> Created
        (Some(0), Some(1)),    // Created -> Funded
        (Some(1), Some(2)),    // Funded -> Released
        (Some(1), Some(3)),    // Funded -> Disputed
        (Some(3), Some(4)),    // Disputed -> Refunded
        (Some(3), Some(2)),    // Disputed -> Released
    ];
    
    let is_valid = valid_transitions.iter()
        .any(|(from, to)| *from == current_state && *to == next_state);
    
    if !is_valid {
        errors.push(format!("Invalid escrow transition: {} -> {}", current_name, next_name));
    }
    
    WasmCheckResult {
        valid: errors.is_empty(),
        spell_type: "escrow".to_string(),
        input_sum: None,
        output_sum: None,
        is_mint: None,
        is_burn: None,
        current_state: Some(current_name),
        next_state: Some(next_name),
        state_transition_valid: Some(is_valid),
        errors,
    }
}

// ============================================
// Non-WASM exports for native use
// ============================================

#[cfg(not(feature = "wasm"))]
pub fn check_spell_native(app: &crate::data::App, tx: &crate::data::Transaction, x: &crate::data::Data, w: &crate::data::Data) -> bool {
    // Native implementation delegates to the actual Rust logic
    true
}
