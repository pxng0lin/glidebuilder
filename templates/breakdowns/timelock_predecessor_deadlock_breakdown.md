# Timelock Predecessor Deadlock via Whitelist Removal

## Vulnerability Overview

This vulnerability occurs in timelock contracts that use OpenZeppelin's timelock controller pattern with predecessor dependencies and whitelist-based execution controls. The deadlock happens when:

1. **Operation States**: Timelock operations have states (PENDING → READY → DONE)
2. **Predecessor Gating**: Execute functions check `isOperationDone(predecessorId)` before execution
3. **Whitelist Controls**: Some execute functions are gated by mutable whitelists that can be modified
4. **Deadlock Scenario**: If an operation becomes READY but whitelist checks fail, it never executes and never marks as DONE, blocking all successors

## Guardian Audits Report Summary

**Original Report**: https://defender.guardianaudits.com/submissions/688d597cc480df7cb3b8e593

**Affected Contract**: `EthenaTimelockController.executeWhitelisted`

**Root Cause**: A scheduled operation that later fails the whitelist check never transitions to Done and remains Ready forever. Any operation scheduled with that hash as its predecessor can never execute, effectively freezing governance actions that depend on it.

**Attack Flow**:
1. Operation A is scheduled while its target selector is still whitelisted
2. Before the delay elapses, governance removes that selector from the whitelist
3. At execution time `executeWhitelisted` reverts with `NotWhitelisted`
4. OpenZeppelin timelock keeps A in Ready state because only successful executions mark Done
5. Any subsequent operation B that lists A as its predecessor will trigger `TimelockUnexecutedPredecessor` and revert indefinitely

**Impact**:
- Blocks upgrades, parameter changes, or emergency actions referencing the stuck hash
- Causes queue clogging
- Requires human intervention (cancel + reschedule) introducing delay

## Key Indicators in Contracts

### 1. Execute Functions with Predecessor Checks
```solidity
function execute(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt)
    public payable virtual onlyRole(EXECUTOR_ROLE) {
    // Check predecessor is done
    if (predecessor != bytes32(0) && !isOperationDone(predecessor)) {
        revert TimelockInvalid();
    }
    // ... execute logic
}
```

### 2. Whitelist-Gated Execute Functions
```solidity
function executeWhitelisted(address target, uint256 value, bytes calldata data)
    public payable virtual onlyWhitelisted {
    // Whitelist check that can fail
    require(isWhitelisted(msg.sender), "Not whitelisted");
    // ... execute logic
}
```

### 3. Mutable Whitelist State
```solidity
mapping(address => bool) public whitelist;

function addToWhitelist(address account) external onlyOwner {
    whitelist[account] = true;
}

function removeFromWhitelist(address account) external onlyOwner {
    whitelist[account] = false;
}
```

## Attack Scenario

1. **Setup**: Operation A has predecessor Operation B
2. **State**: Operation B becomes READY (timelock delay passed)
3. **Whitelist Removal**: Admin removes attacker from whitelist
4. **Failed Execution**: Operation B's executeWhitelisted() reverts due to whitelist check
5. **Permanent Block**: Operation B never marks as DONE, blocking Operation A forever

## Proof of Concept (from Guardian Report)

The vulnerability is demonstrated with a Forge test showing:

1. **Setup**: Schedule operation A with whitelisted selector, then schedule operation B with A as predecessor
2. **Trigger**: Remove selector from whitelist before execution
3. **Exploit**: Operation A becomes READY but `executeWhitelisted` reverts
4. **Result**: Operation A stays READY forever, blocking operation B

```solidity
// Key test assertions:
vm.expectRevert(); // A fails due to whitelist removal
tl.execute(address(tl), 0, callExecuteWhitelisted, PREDECESSOR_NONE, SALT_A);
assertTrue(tl.isOperationReady(opA), "A should remain READY");

vm.expectRevert(); // B fails due to unexecuted predecessor A
tl.execute(address(tl), 0, callExecuteWhitelisted, opA, SALT_B);
```

## Query Stages

### Stage 1: Function Collection
- Target public/external functions (exclude constructors)
- Focus on execute-like functions: `execute`, `executeBatch`, `executeOperation`

### Stage 2: Predecessor Gating Detection
- Check function signatures for predecessor parameters
- Scan instructions for `isOperationDone` calls using Glider APIs
- Use `callee_names()` to detect timelock controller calls

### Stage 3: Whitelist Context Analysis
- Contract-level analysis for whitelist functionality
- Check for whitelist state variables (`whitelist`, `allowed`, `isWhitelisted`)
- Detect whitelist mutation functions (`addToWhitelist`, `removeFromWhitelist`)

### Stage 4: Risk Scoring
- **Execute Function**: +3 points
- **Predecessor Gating**: +4 points
- **Whitelist Present**: +2 points
- **Mutable Whitelist**: +3 points
- **Owner-Only Penalty**: -1 point

## Optimization Focus

### API-First Design
- Use `Functions().with_name_regex()` for initial filtering
- Leverage `callee_names()` for detecting `isOperationDone` calls
- Contract-level analysis with `functions().with_name_regex()` for whitelist detection
- Avoid `source_code()` usage - rely on semantic API methods

### Performance Optimizations
- **Early Filtering**: Filter execute functions first, then check predecessor gating
- **Contract Caching**: Cache whitelist analysis per contract to avoid redundant checks
- **Bounded Execution**: Use reasonable `.exec()` limits (50-100 range)
- **Declarative Queries**: Chain filters to reduce dataset before expensive operations

### Accuracy Improvements
- **Semantic Detection**: Use API methods over string pattern matching
- **False Positive Reduction**: Require both predecessor gating AND mutable whitelists
- **Context Awareness**: Distinguish between different types of execute functions

## Glider Query Implementation

```python
vulnerable_funcs = (
    Functions()
    .with_one_property([MethodProp.PUBLIC, MethodProp.EXTERNAL])
    .without_properties([MethodProp.IS_CONSTRUCTOR])
    .exec(LIMIT_FUNCS)
    .filter(lambda fn: not is_view_or_pure(fn))
    .filter(has_execute_hint)
    .filter(has_predecessor_gating)
    .filter(lambda fn: contract_has_whitelist(fn.get_contract()))
    .filter(lambda fn: contract_has_mutable_whitelist(fn.get_contract()))
)
```

## Mitigation Patterns

### 1. Atomic State Transitions (Recommended)
Mark operations as DONE before execution to prevent deadlocks:

```solidity
function executeWhitelisted(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt)
    public payable virtual onlyRole(EXECUTOR_ROLE) {
    bytes32 id = hashOperation(target, value, data, predecessor, salt);

    // Check predecessor BEFORE marking done
    if (predecessor != bytes32(0) && !isOperationDone(predecessor)) {
        revert TimelockUnexecutedPredecessor(predecessor);
    }

    // Mark operation as DONE BEFORE execution (atomic transition)
    _markOperationDone(id);

    // Execute with whitelist check
    require(isWhitelisted(msg.sender), "Not whitelisted");
    // ... execute logic
}
```

### 2. Separate Execution Paths
Keep whitelist-enforced functions separate from predecessor-dependent ones:

```solidity
// Standard timelock execute (with predecessor checks)
function execute(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt)
    public payable virtual onlyRole(EXECUTOR_ROLE) {
    // Predecessor checks and execution
}

// Separate whitelisted execution (no predecessor dependencies)
function executeWhitelisted(address target, uint256 value, bytes calldata data)
    public payable virtual {
    require(isWhitelisted(msg.sender), "Not whitelisted");
    // Direct execution without predecessor logic
}
```

### 3. Immutable or Append-Only Whitelists
Prevent whitelist removals that could cause deadlocks:

```solidity
// Constructor sets initial whitelist
constructor(address[] memory initialWhitelist) {
    for (uint i = 0; i < initialWhitelist.length; i++) {
        whitelist[initialWhitelist[i]] = true;
    }
}

// Only allow additions, no removals
function addToWhitelist(address account) external onlyOwner {
    whitelist[account] = true;
}

// Remove removal functions entirely
// function removeFromWhitelist(address account) external onlyOwner { ... } // DANGER
```

### 4. Emergency Cancel + Reschedule
As a last resort, governance can cancel stuck operations and reschedule without predecessors:

```solidity
// Emergency recovery
function emergencyReschedule(bytes32 stuckOpId, address target, uint256 value, bytes calldata data) external onlyOwner {
    // Cancel the stuck operation
    cancel(stuckOpId);

    // Reschedule without predecessor
    schedule(target, value, data, bytes32(0), newSalt, delay);
}
```

## Detection Accuracy

### True Positives
- Timelock controllers with predecessor dependencies
- Whitelist-gated execute functions
- Mutable whitelist state (add/remove capabilities)

### False Positives (Filtered Out)
- Execute functions without predecessor checks
- Contracts without whitelist functionality
- Immutable or append-only whitelists
- Owner-only functions (reduced risk)

### Edge Cases
- Multiple inheritance (check all base contracts)
- Proxy patterns (analyze implementation contracts)
- Custom timelock implementations (adapt detection patterns)

## References

- **Guardian Audits Report**: https://defender.guardianaudits.com/submissions/688d597cc480df7cb3b8e593
- **OpenZeppelin TimelockController**: https://docs.openzeppelin.com/contracts/4.x/api/governance#TimelockController
- **Ethena Audit Finding**: https://github.com/sherlock-audit/2024-05-ethena-judging/issues/123
- **Timelock Best Practices**: https://blog.openzeppelin.com/timelock-best-practices/</content>
</xai:function_call