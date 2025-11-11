# Bridge Idempotency Missing (Replay Attack) Vulnerability Breakdown

## Vulnerability Overview
The "Bridge Idempotency Missing" vulnerability occurs when cross-chain bridge processors fail to properly mark or clear processed items after handling messages or arrays. This allows attackers to replay the same inputs multiple times, potentially leading to duplicate transfers, mints, or other state changes. The vulnerability stems from inadequate state management in bridge handlers that process user-provided data without enforcing idempotency.

## Key Indicators in Contracts
- **Bridge Context**: Functions with LayerZero, Wormhole, or other bridge protocol signatures
- **Array Processing**: Functions that iterate over `messages[]`, `payloads[]`, or similar arrays
- **State Modification**: Transfers, mints, or sends within loops without clearing processed flags
- **Missing Guards**: Absence of `processed[hash]`, `seen[key]`, or `delete array[index]` patterns

## Query Stages
1. **Function Collection**: Target public/external functions with bridge-related signatures
2. **Context Detection**: Identify bridge protocols via signature keywords or callee names
3. **Array Parameter Check**: Look for array parameters or references to arrays in signatures
4. **Loop Detection**: Check for iteration patterns over arrays using instruction analysis
5. **Transfer Detection**: Verify presence of token transfers/mints within the function
6. **Guard Absence**: Confirm lack of processed flags or delete operations
7. **Deduplication**: Ensure unique function identification

## Optimization Focus
- **API-First Design**: Use Glider APIs exclusively (no source_code() or try/except)
- **Declarative Filtering**: Chain .filter() calls with helper functions for readability
- **Bounded Execution**: Set reasonable .exec() limits (100-1000) to prevent performance issues
- **Early Exits**: Cheap checks (signatures) before expensive operations (instruction analysis)
- **Semantic Analysis**: Prefer callee_functions() and instructions() over string matching

## Glider Query Implementation
```python
from glider import *

def query():
    """
    @title: Bridge processors do not clear/mark processed items (idempotency missing)
    @description:
      Flags public/external bridge handlers that iterate over user/peer-provided arrays or messages and
      perform transfers/mints/sends without marking items as processed or deleting consumed state. This
      enables reprocessing/replay via duplicate inputs.

      Detection flow (declarative API chaining):
        1. Collect public/external functions with bridge signatures
        2. Filter for array processing and loop patterns
        3. Verify transfer operations within functions
        4. Exclude functions with proper idempotency guards

      A hit requires: bridge context + array iteration + transfers + no guards.
    @tags: bridge, cross-chain, idempotency, replay, transfer, mint
    @author: pxng0lin | CAGED 2025
    @reference: primers/replay_attack_primer_v1.md
    """

    LIMIT_FUNCS = 30_000
    LIMIT_RESULTS = 20

    # Bridge protocol hints
    BRIDGE_HINTS = {
        "layerzero", "lz", "endpoint", "oapp", "oft", "wormhole", "bridge", "router",
        "messenger", "axelar", "cctp", "ccip"
    }

    # Transfer operation names
    TRANSFER_NAMES = {
        "transfer", "transferfrom", "safetransfer", "safetransferfrom", "mint", "_mint", "send"
    }

    # Idempotency guard patterns
    GUARD_PATTERNS = {
        "processed[", "seen[", "claimed[", "isprocessed", "isseen", "isclaimed",
        "markprocessed", "markclaimed"
    }

    # Admin modifiers to exclude
    ADMIN_MODIFIERS = [
        'onlyOwner', 'onlyAdmin', 'onlyGovernor', 'onlyManager', 'onlyController',
        'onlyRole', 'onlyMinter', 'onlyBurner', 'onlyPauser', 'onlyOperator',
        'onlyAuthorized', 'onlyAuth', 'onlyDAO', 'onlyGovernance', 'onlyTreasury',
        'onlyFactory', 'onlyDeployer', 'onlyUpgrader', 'onlyInitializer', 'initializer',
        'onlyRelayer', 'onlyIdleCDO'
    ]

    def low(x):
        return (x or "").lower()

    def has_bridge_context(fn):
        """Check for bridge protocol context using signature and callee analysis"""
        sig = low(fn.signature() or "")
        if any(hint in sig for hint in BRIDGE_HINTS):
            return True

        # Check callees for bridge functions
        callees = fn.callee_functions().exec(50)
        for callee in callees:
            if callee and callee.name:
                callee_name_l = low(callee.name)
                if any(hint in callee_name_l for hint in BRIDGE_HINTS):
                    return True
        return False

    def has_array_processing(fn):
        """Detect array parameters or references to arrays/messages"""
        sig = low(fn.signature() or "")
        # Check for array parameters
        if "[]" in sig:
            return True
        # Check for array-related keywords
        if any(term in sig for term in ["payload", "message", "batch"]):
            return True
        return False

    def has_loop_patterns(fn):
        """Detect iteration patterns using instruction analysis"""
        instructions = fn.instructions().exec(100)
        ins_strs = [str(ins).lower() for ins in instructions]
        combined = ' '.join(ins_strs)

        # Check for loop keywords
        has_loop = any(hint in combined for hint in ["for (", "for(", "while (", "while("])
        # Check for array iteration indicators
        has_iteration = any(term in combined for term in ["length", "messages", "payloads"])

        return has_loop and has_iteration

    def has_transfer_operations(fn):
        """Detect transfer/mint operations using callee analysis"""
        # Check callees for transfer functions
        callees = fn.callee_functions().exec(50)
        for callee in callees:
            if callee and callee.name:
                callee_name_l = low(callee.name)
                if any(t in callee_name_l for t in TRANSFER_NAMES):
                    return True

        # Fallback to instruction analysis
        instructions = fn.instructions().exec(50)
        for ins in instructions:
            if ins.is_call():
                for name in (ins.callee_names() or []):
                    nl = low(name)
                    if any(t in nl for t in TRANSFER_NAMES):
                        return True
        return False

    def has_idempotency_guards(fn):
        """Check for processed flags or delete operations"""
        instructions = fn.instructions().exec(100)
        ins_strs = [str(ins).lower() for ins in instructions]
        combined = ' '.join(ins_strs)

        # Check for guard patterns
        if any(g in combined for g in GUARD_PATTERNS):
            return True
        # Check for delete operations
        if "delete " in combined and "[" in combined and "];" in combined:
            return True
        return False

    # Declarative query chaining
    vulnerable_funcs = (
        Functions()
        .with_one_property([MethodProp.PUBLIC, MethodProp.EXTERNAL])
        .without_properties([MethodProp.IS_CONSTRUCTOR])
        .without_modifier_names(ADMIN_MODIFIERS)
        .exec(LIMIT_FUNCS)
        .filter(lambda fn: not (fn.is_view() or fn.is_pure()))  # Exclude view/pure
        .filter(has_bridge_context)                             # Must be bridge-related
        .filter(has_array_processing)                           # Must process arrays
        .filter(has_loop_patterns)                              # Must have loops
        .filter(has_transfer_operations)                        # Must have transfers
        .filter(lambda fn: not has_idempotency_guards(fn))      # Must lack guards
    )

    return vulnerable_funcs[:LIMIT_RESULTS]
```

## Risk Assessment
- **Impact**: High - Can lead to unlimited duplicate operations, draining bridge funds or inflating token supplies
- **Likelihood**: Medium - Common in bridge implementations without proper state management
- **Exploitability**: High - Requires only replaying valid bridge messages
- **Detection Confidence**: High - Clear patterns in bridge handlers

## Mitigation Recommendations
1. **Implement Processed Flags**: Use mappings to track processed message hashes
2. **Nonce-Based Prevention**: Include nonces in messages to prevent duplicates
3. **Delete After Processing**: Clear array elements after successful processing
4. **Event Logging**: Emit events for each processed item
5. **Access Controls**: Restrict replay windows or require authorization

## False Positive Considerations
- Functions with proper guards may be incorrectly flagged if patterns aren't detected
- Internal bridge functions may not need idempotency if called from guarded entry points
- Test functions or administrative functions may intentionally allow replays