// Verified AskOracle ABI, retrieved from robin.etherscan.io on 2026-10-08.
export const askOracleAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "intake_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "imd_",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "action_",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "signer_",
        "type": "address"
      },
      {
        "internalType": "uint16",
        "name": "panelSize_",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "quorum_",
        "type": "uint16"
      },
      {
        "internalType": "uint32",
        "name": "validForSeconds_",
        "type": "uint32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "requestId",
        "type": "bytes32"
      }
    ],
    "name": "AlreadyConsumed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "expiresAt",
        "type": "uint64"
      }
    ],
    "name": "AttestationExpired",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "issuedAt",
        "type": "uint64"
      }
    ],
    "name": "AttestationNotYetValid",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BadSignature",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DeadlinePassed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DuplicateRequest",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidAttestation",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidConfiguration",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidPayment",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidQuestion",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidShortString",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotPending",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyIntake",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "str",
        "type": "string"
      }
    ],
    "name": "StringTooLong",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TooEarly",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnknownQuestion",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnknownRequest",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "expected",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "got",
        "type": "uint8"
      }
    ],
    "name": "WrongAnswerType",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroSigner",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "oracleRequestId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "answer",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "agreed",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "quorum",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "panelSize",
        "type": "uint16"
      }
    ],
    "name": "Answered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "asker",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "intakeRequestId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "question",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      }
    ],
    "name": "Asked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "EIP712DomainChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "signer",
        "type": "address"
      }
    ],
    "name": "OracleSignerSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "panelSize",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "quorum",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "validForSeconds",
        "type": "uint32"
      }
    ],
    "name": "PanelSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "intake",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "imd",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "action",
        "type": "bytes32"
      }
    ],
    "name": "ProtocolSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "Unanswered",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "ANSWER_TIMEOUT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ISSUED_AT_TOLERANCE",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "QUESTION_CHAIN_ID",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "action",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "text",
        "type": "string"
      }
    ],
    "name": "ask",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "requestId",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "chainId",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "questionHash",
            "type": "bytes32"
          },
          {
            "internalType": "uint8",
            "name": "answerType",
            "type": "uint8"
          },
          {
            "internalType": "bytes",
            "name": "answer",
            "type": "bytes"
          },
          {
            "internalType": "uint256",
            "name": "figure",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "fromBlock",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "toBlock",
            "type": "uint64"
          },
          {
            "internalType": "bytes32",
            "name": "blockHash",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "panelJobId",
            "type": "bytes32"
          },
          {
            "internalType": "uint16",
            "name": "panelSize",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "quorum",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "agreed",
            "type": "uint16"
          },
          {
            "internalType": "uint64",
            "name": "issuedAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "expiresAt",
            "type": "uint64"
          }
        ],
        "internalType": "struct OracleAttestation.Attestation",
        "name": "a",
        "type": "tuple"
      }
    ],
    "name": "attestationDigest",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "consumed",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "count",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "eip712Domain",
    "outputs": [
      {
        "internalType": "bytes1",
        "name": "fields",
        "type": "bytes1"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "version",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "chainId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "verifyingContract",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "salt",
        "type": "bytes32"
      },
      {
        "internalType": "uint256[]",
        "name": "extensions",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "imd",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "intake",
    "outputs": [
      {
        "internalType": "contract IIntake",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "latestAnswered",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "markUnanswered",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "requestId",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "requestId",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "chainId",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "questionHash",
            "type": "bytes32"
          },
          {
            "internalType": "uint8",
            "name": "answerType",
            "type": "uint8"
          },
          {
            "internalType": "bytes",
            "name": "answer",
            "type": "bytes"
          },
          {
            "internalType": "uint256",
            "name": "figure",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "fromBlock",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "toBlock",
            "type": "uint64"
          },
          {
            "internalType": "bytes32",
            "name": "blockHash",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "panelJobId",
            "type": "bytes32"
          },
          {
            "internalType": "uint16",
            "name": "panelSize",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "quorum",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "agreed",
            "type": "uint16"
          },
          {
            "internalType": "uint64",
            "name": "issuedAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "expiresAt",
            "type": "uint64"
          }
        ],
        "internalType": "struct OracleAttestation.Attestation",
        "name": "a",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "onOracleResult",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "oracleSigner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "panelSize",
    "outputs": [
      {
        "internalType": "uint16",
        "name": "",
        "type": "uint16"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "question",
    "outputs": [
      {
        "internalType": "address",
        "name": "asker",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "text",
        "type": "string"
      },
      {
        "internalType": "enum AskOracle.Status",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "answer",
        "type": "bool"
      },
      {
        "internalType": "uint16",
        "name": "agreed",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "quorum_",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "panelSize_",
        "type": "uint16"
      },
      {
        "internalType": "uint64",
        "name": "askedAt",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "answeredAt",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "questionIdFor",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "quorum",
    "outputs": [
      {
        "internalType": "uint16",
        "name": "",
        "type": "uint16"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "requestDetails",
    "outputs": [
      {
        "internalType": "address",
        "name": "requestIntake",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "intakeRequestId",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "requestedPanelSize",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "requestedQuorum",
        "type": "uint16"
      },
      {
        "internalType": "uint32",
        "name": "requestedValidity",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "panelSize_",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "quorum_",
        "type": "uint16"
      },
      {
        "internalType": "uint32",
        "name": "validForSeconds_",
        "type": "uint32"
      }
    ],
    "name": "setPanel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "intake_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "imd_",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "action_",
        "type": "bytes32"
      }
    ],
    "name": "setProtocol",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "signer_",
        "type": "address"
      }
    ],
    "name": "setSigner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "validForSeconds",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
