from glider import *


def query():
    """
    @title: Unchecked ERC20 transfer return values
    @description:
      Detects public/external functions that call ERC20 transfer/transferFrom without checking return values
      and without using SafeERC20 wrappers. Uses Glider APIs for all detection logic following API-first design principles.

      A hit requires:
        - Calls ERC20 transfer/transferFrom functions
        - Does not use SafeERC20 wrappers
        - Does not check return values with require/assert
        - Not event emission or ETH transfer
    @tags: token, erc20, unchecked-return, insolvency, theft
    @author: pxng0lin | CAGED 2025
    @reference: https://github.com/crytic/slither/wiki/Detector-Documentation#unchecked-transfer
    """

    LIMIT_FUNCS = 100

    def low(x):
        return (x or "").lower()

    def has_unchecked_token_transfers(fn):
        """Check for ERC20 transfer calls without safety checks using API-first approach"""
        # Stage 1: Locate ERC20 transfer/transferFrom calls (exclude internal helpers like _transfer)
        candidate_calls = (
            fn.callee_functions()
            .with_name_regex(r"^(transfer|transferFrom)$")
            .exec()
        )

        transfer_calls = [
            call for call in candidate_calls
            if call
            and call.get_contract()
            and fn.get_contract()
            and call.get_contract().address != fn.get_contract().address
        ]

        if not transfer_calls:
            return False

        # Stage 2: Check for SafeERC20 usage via callee_functions (early exit if safe)
        safe_calls = fn.callee_functions().with_name_regex(r'safe(Transfer|TransferFrom|Approve)').exec()
        if safe_calls:
            return False  # Uses SafeERC20

        # Stage 3: Check for require/assert guards via instruction analysis
        guard_calls = fn.instructions().with_one_of_callee_names(["require", "assert"], sensitivity=False).exec()

        if guard_calls:
            return False  # Has guards

        return True

    def is_not_event_emission(fn):
        """Exclude functions that only emit Transfer events using component analysis"""
        instructions = fn.instructions().exec()

        for ins in instructions:
            if ins and ins.get_components:
                components = ins.get_components().exec()
                for comp in components:
                    if (comp and comp.name and
                        low(comp.name) == 'transfer' and
                        comp.kind and 'event' in str(comp.kind).lower()):
                        return False  # This is event emission, not token transfer

        return True

    def is_not_eth_transfer(fn):
        """Exclude native ETH transfer operations using signature analysis"""
        # Check for external calls with transfer(uint256) signature
        eth_transfers = (
            fn.instructions()
            .external_calls()
            .with_callee_signature("transfer(uint256)")
            .exec()
        )

        if eth_transfers:
            return False

        # Check for low-level calls with transfer signature
        low_level_transfers = (
            fn.instructions()
            .low_level_external_calls()
            .with_callee_signature("transfer(uint256)")
            .exec()
        )

        return not bool(low_level_transfers)

    # API-first filtering: unchecked transfers - event emissions - ETH transfers
    vulnerable_funcs = (
        Functions()
        .with_one_property([MethodProp.PUBLIC, MethodProp.EXTERNAL])
        .without_properties([MethodProp.IS_CONSTRUCTOR, MethodProp.IS_VIEW, MethodProp.IS_PURE])
        .exec(LIMIT_FUNCS)
        .filter(has_unchecked_token_transfers)                 # Unchecked ERC20 transfers
        .filter(is_not_event_emission)                         # Not just event emission
        .filter(is_not_eth_transfer)                           # Not native ETH transfers
    )

    return vulnerable_funcs
