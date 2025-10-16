/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/sol_bnb_escrow.json`.
 */
export type SolBnbEscrow = {
  "address": "TDoetY1LKXn5vxxgkpE3keKhpRvbwHV6a2ep2Lreqov",
  "metadata": {
    "name": "solBnbEscrow",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "bookListing",
      "docs": [
        "Instruction for a guest to book a listing and deposit the payment into escrow."
      ],
      "discriminator": [
        224,
        62,
        29,
        168,
        172,
        83,
        10,
        7
      ],
      "accounts": [
        {
          "name": "listing",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "listing"
              }
            ]
          }
        },
        {
          "name": "guest",
          "writable": true,
          "signer": true
        },
        {
          "name": "host",
          "relations": [
            "listing"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createListing",
      "docs": [
        "Instruction to create a property listing.",
        "It now accepts a fixed 16-byte array for the property ID instead of a variable-length String/URI."
      ],
      "discriminator": [
        18,
        168,
        45,
        24,
        191,
        31,
        117,
        54
      ],
      "accounts": [
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "host"
              }
            ]
          }
        },
        {
          "name": "host",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "priceLamports",
          "type": "u64"
        },
        {
          "name": "propertyId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        }
      ]
    },
    {
      "name": "getAllListings",
      "docs": [
        "Instruction to allow the client to easily query the program."
      ],
      "discriminator": [
        237,
        125,
        77,
        90,
        182,
        149,
        110,
        60
      ],
      "accounts": [],
      "args": []
    },
    {
      "name": "releasePayment",
      "docs": [
        "Instruction for the host and guest to release the payment from escrow to the host."
      ],
      "discriminator": [
        24,
        34,
        191,
        86,
        145,
        160,
        183,
        233
      ],
      "accounts": [
        {
          "name": "listing",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "listing"
              }
            ]
          }
        },
        {
          "name": "host",
          "writable": true,
          "signer": true
        },
        {
          "name": "guest",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "listing",
      "discriminator": [
        218,
        32,
        50,
        73,
        43,
        134,
        26,
        58
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "alreadyBooked",
      "msg": "Listing is already booked."
    },
    {
      "code": 6001,
      "name": "notBooked",
      "msg": "Listing is not booked."
    },
    {
      "code": 6002,
      "name": "invalidGuest",
      "msg": "Invalid guest trying to release payment."
    }
  ],
  "types": [
    {
      "name": "listing",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "host",
            "type": "pubkey"
          },
          {
            "name": "priceLamports",
            "type": "u64"
          },
          {
            "name": "propertyId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "isBooked",
            "type": "bool"
          },
          {
            "name": "guest",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
