/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/swap_program.json`.
 */
export type SwapProgram = {
  "address": "AGMg3zTXw2DNy2RzBtvxTTt3DCM2EY2LPYXssdanWjV7",
  "metadata": {
    "name": "swapProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addLiquidity",
      "docs": [
        "Add liquidity to market vaults",
        "Traceability: UC-003, REQ-F-003, REQ-F-004"
      ],
      "discriminator": [
        181,
        157,
        89,
        67,
        143,
        182,
        52,
        72
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "vaultA",
          "writable": true
        },
        {
          "name": "vaultB",
          "writable": true
        },
        {
          "name": "authorityTokenA",
          "writable": true
        },
        {
          "name": "authorityTokenB",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "market"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amountA",
          "type": "u64"
        },
        {
          "name": "amountB",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeMarket",
      "docs": [
        "Initialize a new market for trading between two SPL tokens",
        "Traceability: UC-001, REQ-F-001"
      ],
      "discriminator": [
        35,
        35,
        189,
        193,
        155,
        48,
        170,
        203
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "tokenMintA"
              },
              {
                "kind": "account",
                "path": "tokenMintB"
              }
            ]
          }
        },
        {
          "name": "tokenMintA"
        },
        {
          "name": "tokenMintB"
        },
        {
          "name": "vaultA",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "vaultB",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "setPrice",
      "docs": [
        "Set or update the exchange rate for a market",
        "Traceability: UC-002, REQ-F-002"
      ],
      "discriminator": [
        16,
        19,
        182,
        8,
        149,
        83,
        72,
        181
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "market"
          ]
        }
      ],
      "args": [
        {
          "name": "newPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "swap",
      "docs": [
        "Execute bidirectional token swap (permissionless)",
        "Traceability: UC-004, UC-005, REQ-F-006, REQ-F-007, REQ-F-009"
      ],
      "discriminator": [
        248,
        198,
        158,
        145,
        225,
        117,
        135,
        200
      ],
      "accounts": [
        {
          "name": "market"
        },
        {
          "name": "vaultA",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "vaultB",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "userTokenA",
          "writable": true
        },
        {
          "name": "userTokenB",
          "writable": true
        },
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "swapAToB",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "marketAccount",
      "discriminator": [
        201,
        78,
        187,
        225,
        240,
        198,
        201,
        251
      ]
    }
  ],
  "events": [
    {
      "name": "liquidityAdded",
      "discriminator": [
        154,
        26,
        221,
        108,
        238,
        64,
        217,
        161
      ]
    },
    {
      "name": "marketInitialized",
      "discriminator": [
        134,
        160,
        122,
        87,
        50,
        3,
        255,
        81
      ]
    },
    {
      "name": "priceSet",
      "discriminator": [
        152,
        186,
        196,
        72,
        117,
        210,
        36,
        160
      ]
    },
    {
      "name": "swapExecuted",
      "discriminator": [
        150,
        166,
        26,
        225,
        28,
        89,
        38,
        79
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "overflow",
      "msg": "Arithmetic overflow detected"
    },
    {
      "code": 6001,
      "name": "divisionByZero",
      "msg": "Division by zero (price may not be set)"
    },
    {
      "code": 6002,
      "name": "invalidAmount",
      "msg": "Invalid amount (must be greater than 0)"
    },
    {
      "code": 6003,
      "name": "priceNotSet",
      "msg": "Price not set (administrator must call set_price first)"
    },
    {
      "code": 6004,
      "name": "insufficientLiquidity",
      "msg": "Insufficient liquidity in vault to fulfill swap"
    },
    {
      "code": 6005,
      "name": "sameTokenSwapDisallowed",
      "msg": "Same token swaps are not allowed (Token A and Token B must be distinct mints)"
    },
    {
      "code": 6006,
      "name": "unauthorized",
      "msg": "Only the market authority can perform this operation"
    },
    {
      "code": 6007,
      "name": "invalidDecimals",
      "msg": "Token decimals must be between 0 and 18"
    }
  ],
  "types": [
    {
      "name": "liquidityAdded",
      "docs": [
        "Event emitted when liquidity is added to vaults",
        "",
        "Traceability: REQ-NF-011, spec/contracts/EVENTS-swap-program.md"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "docs": [
              "Market PDA address"
            ],
            "type": "pubkey"
          },
          {
            "name": "authority",
            "docs": [
              "Administrator who added liquidity"
            ],
            "type": "pubkey"
          },
          {
            "name": "amountA",
            "docs": [
              "Amount of Token A added"
            ],
            "type": "u64"
          },
          {
            "name": "amountB",
            "docs": [
              "Amount of Token B added"
            ],
            "type": "u64"
          },
          {
            "name": "vaultABalance",
            "docs": [
              "Vault A balance after addition"
            ],
            "type": "u64"
          },
          {
            "name": "vaultBBalance",
            "docs": [
              "Vault B balance after addition"
            ],
            "type": "u64"
          },
          {
            "name": "timestamp",
            "docs": [
              "Unix timestamp"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketAccount",
      "docs": [
        "Central aggregate root representing a trading pair between two SPL tokens.",
        "",
        "Traceability: ENT-MKT-001, REQ-F-001, REQ-F-010"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Administrator's wallet public key (immutable, set during initialization)",
              "Traceability: REQ-F-002, REQ-F-008"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenMintA",
            "docs": [
              "SPL Token Mint address for Token A (immutable)",
              "Traceability: REQ-F-001, BR-MKT-004 (must differ from token_mint_b)"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenMintB",
            "docs": [
              "SPL Token Mint address for Token B (immutable)",
              "Traceability: REQ-F-001, BR-MKT-004 (must differ from token_mint_a)"
            ],
            "type": "pubkey"
          },
          {
            "name": "price",
            "docs": [
              "Exchange rate: 1 Token A = (price / 10^6) Token B",
              "Range: 0 to u64::MAX (0 means not set, swaps will fail)",
              "Traceability: REQ-F-002, INV-MKT-004"
            ],
            "type": "u64"
          },
          {
            "name": "decimalsA",
            "docs": [
              "Decimal places for Token A (0-18, from mint metadata)",
              "Traceability: REQ-F-010, INV-MKT-005"
            ],
            "type": "u8"
          },
          {
            "name": "decimalsB",
            "docs": [
              "Decimal places for Token B (0-18, from mint metadata)",
              "Traceability: REQ-F-010, INV-MKT-005"
            ],
            "type": "u8"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed for CPI signer derivation (stored to avoid recomputation)",
              "Traceability: REQ-F-011, ADR-004"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "marketInitialized",
      "docs": [
        "Event emitted when a market is initialized",
        "",
        "Traceability: REQ-NF-009, spec/contracts/EVENTS-swap-program.md"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "docs": [
              "Market PDA address"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenMintA",
            "docs": [
              "Token A mint address"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenMintB",
            "docs": [
              "Token B mint address"
            ],
            "type": "pubkey"
          },
          {
            "name": "authority",
            "docs": [
              "Market administrator (who initialized the market)"
            ],
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "docs": [
              "Unix timestamp of initialization"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "priceSet",
      "docs": [
        "Event emitted when exchange rate is updated",
        "",
        "Traceability: REQ-NF-010, spec/contracts/EVENTS-swap-program.md"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "docs": [
              "Market PDA address"
            ],
            "type": "pubkey"
          },
          {
            "name": "authority",
            "docs": [
              "Administrator who set the price"
            ],
            "type": "pubkey"
          },
          {
            "name": "oldPrice",
            "docs": [
              "Previous price value"
            ],
            "type": "u64"
          },
          {
            "name": "newPrice",
            "docs": [
              "New price value"
            ],
            "type": "u64"
          },
          {
            "name": "timestamp",
            "docs": [
              "Unix timestamp of price change"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "swapExecuted",
      "docs": [
        "Event emitted when a swap is executed",
        "",
        "Traceability: REQ-NF-012, spec/contracts/EVENTS-swap-program.md"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "docs": [
              "Market PDA address"
            ],
            "type": "pubkey"
          },
          {
            "name": "user",
            "docs": [
              "User who executed the swap"
            ],
            "type": "pubkey"
          },
          {
            "name": "swapAToB",
            "docs": [
              "Swap direction: true = A→B, false = B→A"
            ],
            "type": "bool"
          },
          {
            "name": "inputAmount",
            "docs": [
              "Input amount provided by user"
            ],
            "type": "u64"
          },
          {
            "name": "outputAmount",
            "docs": [
              "Output amount received by user"
            ],
            "type": "u64"
          },
          {
            "name": "timestamp",
            "docs": [
              "Unix timestamp"
            ],
            "type": "i64"
          }
        ]
      }
    }
  ]
};
