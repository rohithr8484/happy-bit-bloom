//! Charms SDK - Core data types and utilities for spell verification
//! 
//! This module provides the foundational types for interacting with Charms spells,
//! transactions, and app verification on Bitcoin.

pub use charms_data as data;

/// Re-export core types for convenience
pub mod prelude {
    pub use crate::data::{App, Data, Transaction};
    pub use crate::main;
}

/// Main macro for defining spell checker entry points
/// 
/// # Example
/// ```rust
/// charms_sdk::main! {
///     ($path:path) => {
///         fn main() {
///             use charms_sdk::data::{App, Data, Transaction};
///             let (app, tx, x, w): (App, Transaction, Data, Data) =
///                 charms_sdk::data::util::read(std::io::stdin())
///                     .expect("should deserialize (app, tx, x, w)");
///             assert!($path(&app, &tx, &x, &w));
///         }
///     };
/// }
/// ```
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

/// Utility module for reading and writing spell data
pub mod util {
    use super::data::{App, Data, Transaction};
    use std::io::Read;
    
    /// Read and deserialize spell data from a reader
    pub fn read<R: Read>(reader: R) -> Result<(App, Transaction, Data, Data), std::io::Error> {
        // In a real implementation, this would use serde/bincode to deserialize
        // For now, return a placeholder
        todo!("Implement deserialization from reader")
    }
    
    /// Serialize spell data to bytes
    pub fn serialize(app: &App, tx: &Transaction, x: &Data, w: &Data) -> Vec<u8> {
        // Serialize the tuple for transmission
        todo!("Implement serialization")
    }
}
