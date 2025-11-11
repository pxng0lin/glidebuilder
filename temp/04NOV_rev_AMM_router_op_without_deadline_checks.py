from glider import *


def query():
    """
    @title: AMM router operations without deadline checks
    @description:
      Detects swap/add/remove-liquidity functions in AMM routers that either:
      - Accept a deadline parameter but do not enforce deadline checks
      - Omit deadline parameters entirely while performing AMM operations

       This enables MEV attacks and transaction griefing where pending transactions
       can be executed at unfavorable times or blocked indefinitely.

       A hit requires:
         - Function performs AMM operations (swap/liquidity management)
         - Has AMM/router context (Uniswap, router, pair, pool references)
         - Either lacks deadline parameter entirely OR has deadline parameter but no enforcement

    @tags: amm, router, deadline, mev, griefing
    @author: pxng0lin | CAGED 2025
    @reference: https://docs.uniswap.org/contracts/v3/guides/swaps/multihop-swaps#deadlines
    """

    LIMIT_FUNCS = 7_500

    def low(x):
        return (x or "").lower()

    def has_amm_context(fn):
        """Check for AMM/router context using signature and callee analysis"""
        AMM_HINTS = {'uniswap', 'v2', 'v3', 'router', 'pair', 'pool', 'amm', 'dex'}

        sig = low(fn.signature() or "")
        if any(hint in sig for hint in AMM_HINTS):
            return True

        # Check callees for AMM functions
        callee_names = [low(callee.name) for callee in fn.callee_functions().exec() if callee and callee.name]
        if any(any(hint in name for hint in AMM_HINTS) for name in callee_names):
            return True
        return False

    def has_swap_liquidity_operations(fn):
        """Check for swap/liquidity operations using API-first approach"""
        SWAP_LIQUIDITY_HINTS = {
            'swap', 'addliquidity', 'removeliquidity', 'mint', 'burn', 'trade',
            'exchange', 'liquidity', 'pair', 'pool'
        }

        sig = low(fn.signature() or "")
        if any(hint in sig for hint in SWAP_LIQUIDITY_HINTS):
            return True

        # Check callees for swap/liquidity functions
        callee_names = [low(callee.name) for callee in fn.callee_functions().exec() if callee and callee.name]
        if any(any(hint in name for hint in SWAP_LIQUIDITY_HINTS) for name in callee_names):
            return True
        return False

    def has_deadline_parameter(fn):
        """Check if function accepts deadline parameter"""
        sig = low(fn.signature() or "")
        return 'deadline' in sig

    def has_deadline_enforcement(fn):
        """Check for deadline enforcement using instruction analysis"""
        # Check for block.timestamp usage in instructions (assume comparison if in require/assert)
        timestamp_ins = fn.instructions().with_globals([GlobalFilters.BLOCK_TIME_STAMP]).exec()
        for ins in timestamp_ins:
            ins_str = str(ins).lower()
            if 'require' in ins_str or 'assert' in ins_str:
                return True

        # Check for deadline comparisons in instructions
        instructions = fn.instructions().exec()
        for ins in instructions:
            ins_str = str(ins).lower()
            if ('deadline' in ins_str and ('<=' in ins_str or '<' in ins_str or 'require' in ins_str or 'assert' in ins_str)):
                return True

        # Check for modifier-based deadline enforcement (apply same instruction checks to modifiers)
        modifiers = fn.modifiers().exec()
        for mod in modifiers:
            mod_ins = mod.instructions().exec()
            for ins in mod_ins:
                ins_str = str(ins).lower()
                if ('block.timestamp' in ins_str and ('require' in ins_str or 'assert' in ins_str)):
                    return True
                if ('deadline' in ins_str and ('<=' in ins_str or '<' in ins_str or 'require' in ins_str or 'assert' in ins_str)):
                    return True
            mod_name = low(mod.name or "")
            if any(term in mod_name for term in ['deadline', 'within', 'before', 'expired']):
                return True

        return False

    def has_admin_guards(fn):
        """Check if function has admin guards (modifiers with msg.sender and require/assert)"""
        modifiers = fn.modifiers().exec()
        for mod in modifiers:
            mod_ins = mod.instructions().exec()
            has_msg_sender = any('msg.sender' in str(ins).lower() for ins in mod_ins)
            has_guard = any('require' in str(ins).lower() or 'assert' in str(ins).lower() for ins in mod_ins)
            if has_msg_sender and has_guard:
                return True
        return False

    def has_function_body(fn):
        """Check if function has a body (exclude interfaces/abstract declarations)"""
        source = fn.source_code()
        return source and '{' in source and '}' in source

    # API-first filtering: AMM functions without proper deadline enforcement
    vulnerable_funcs = (
        Functions()
        .with_one_property([MethodProp.PUBLIC, MethodProp.EXTERNAL])
        .without_properties([MethodProp.IS_CONSTRUCTOR, MethodProp.IS_VIEW, MethodProp.IS_PURE])
        .exec(LIMIT_FUNCS)
        .filter(lambda fn: not has_admin_guards(fn))           # Exclude admin-guarded functions
        .filter(has_function_body)                              # Must have function body (exclude interfaces)
        .filter(has_amm_context)                                # AMM/router context
        .filter(has_swap_liquidity_operations)                  # Swap/liquidity operations
        .filter(lambda fn: not has_deadline_parameter(fn) or not has_deadline_enforcement(fn))  # Lacks deadline param OR has deadline but no enforcement
    )

    return vulnerable_funcs
