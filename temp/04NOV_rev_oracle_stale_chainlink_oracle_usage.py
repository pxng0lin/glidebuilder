from glider import *


def query():
    """
    @title: Stale/invalid Chainlink oracle usage for critical decisions
    @description:
      Flags functions that use Chainlink AggregatorV3Interface or oracle wrappers for critical financial flows
      without checking staleness/heartbeat/round completeness or sequencer uptime (on L2).

      A hit requires:
        - critical money-flow function (borrow/liquidate/withdraw/repay/settle), and
        - Chainlink usage (direct latestRoundData/latestAnswer OR oracle wrapper like oracleConfigurator.getPrice), and
        - lacks validation: updatedAt freshness, answeredInRound >= roundId, price > 0 checks, sequencer uptime, and
        - no NFT mint/refund patterns (unrelated to price oracles).

    @tags: oracle, chainlink, stale, insolvency, liquidation
    @author: pxng0lin | CAGED 2025
    @info: API-first detection with proper filtering before exec()
    """

    LIMIT_FUNCS = 50_000
    LIMIT_RESULTS = 1000
    LIMIT_CALLEES = 100
    LIMIT_INS = 200

    # Critical financial function names
    CRIT_NAMES = {'borrow', 'liquidate', 'liquidation', 'redeem', 'withdraw', 'repay', 'issue', 'settle'}

    # Chainlink-specific methods and interfaces
    CL_FEED_METHODS = {'latestrounddata', 'latestanswer'}
    CL_INTERFACE_NAMES = {'aggregatorv3interface', 'ipricefeed', 'ioracle'}

    # Oracle wrapper patterns
    ORACLE_WRAPPER_PATTERNS = {'oracleconfigurator', 'pricefeed', 'aggregator', 'oracle'}

    # Negative signals (NFT mints, refunds)
    NEGATIVE_SIGNALS = {'_safemint', '_mint', 'refund', 'payable(', 'transfer(', 'msg.sender.transfer'}

    def low(x):
        return (x or '').lower()

    def is_critical_function(fn):
        """Check if function performs critical financial operations"""
        sig = low(fn.signature() or '')
        return any(crit in sig for crit in CRIT_NAMES)

    def uses_chainlink_oracle(fn):
        """Check for Chainlink oracle usage (direct or wrapper)"""
        # Check for direct Chainlink method calls
        callees = fn.callee_functions().exec(LIMIT_CALLEES)
        for callee in callees:
            if callee and callee.name:
                callee_name_lc = low(callee.name)
                if callee_name_lc in CL_FEED_METHODS:
                    return True  # Direct Chainlink usage

                # Check for oracle wrapper patterns
                has_price = 'price' in callee_name_lc
                has_oracle = 'oracle' in callee_name_lc
                has_wrapper = any(pattern in callee_name_lc for pattern in ORACLE_WRAPPER_PATTERNS)
                if has_price or has_oracle or has_wrapper:
                    return True  # Oracle wrapper usage

        # Check for Chainlink interface usage in contract
        if fn.contract and fn.contract.functions():
            contract_functions = fn.contract.functions().exec(50)
            for contract_fn in contract_functions:
                if contract_fn and contract_fn.signature():
                    sig_lc = low(contract_fn.signature())
                    if any(iface in sig_lc for iface in CL_INTERFACE_NAMES):
                        return True

        return False

    def has_validation_checks(fn):
        """Check for oracle validation (staleness, freshness, round checks)"""
        instructions = fn.instructions().exec(LIMIT_INS)

        # Check for validation patterns in instructions
        validation_patterns = {
            'updatedat', 'answeredinround', 'roundid', 'block.timestamp',
            'staleness', 'freshness', 'timeout', 'deadline',
            'price > 0', 'price != 0', 'answer > 0', 'answer != 0'
        }

        for instr in instructions:
            instr_str = low(str(instr))
            if any(pattern in instr_str for pattern in validation_patterns):
                return True

            # Check for require/assert calls
            if 'require(' in instr_str or 'assert(' in instr_str:
                return True

        return False

    def has_negative_signals(fn):
        """Check for negative signals (NFT mints, refunds)"""
        callees = fn.callee_functions().exec(LIMIT_CALLEES)
        for callee in callees:
            if callee and callee.name:
                callee_name_lc = low(callee.name)
                if any(signal in callee_name_lc for signal in NEGATIVE_SIGNALS):
                    return True
        return False

    def has_function_body(fn):
        """Check if function has a body (exclude interfaces)"""
        instr_builder = fn.instructions()
        instr_sample = instr_builder.exec(1) if instr_builder else []
        return bool(instr_sample)

    # API-first filtering: Chainlink oracle usage without validation
    vulnerable_funcs = (
        Functions()
        .with_one_property([MethodProp.PUBLIC, MethodProp.EXTERNAL])
        .without_properties([MethodProp.IS_CONSTRUCTOR, MethodProp.IS_VIEW, MethodProp.IS_PURE])
        .filter(has_function_body)                              # Must have function body
        .filter(is_critical_function)                           # Critical financial operations
        .filter(uses_chainlink_oracle)                          # Uses Chainlink oracles
        .filter(lambda fn: not has_validation_checks(fn))      # Lacks validation checks
        .filter(lambda fn: not has_negative_signals(fn))       # No negative signals
        .exec(LIMIT_FUNCS)
    )

    return vulnerable_funcs[:LIMIT_RESULTS]
