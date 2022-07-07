import {
    PK, Role, Account, Party, ada, AvailableMoney, Constant, ConstantParam,
    NegValue, AddValue, SubValue, MulValue, DivValue, ChoiceValue, TimeIntervalStart,
    TimeIntervalEnd, UseValue, Cond, AndObs, OrObs, NotObs, ChoseSomething,
    ValueGE, ValueGT, ValueLT, ValueLE, ValueEQ, TrueObs, FalseObs, Deposit,
    Choice, Notify, Close, Pay, If, When, Let, Assert, SomeNumber, AccountId,
    ChoiceId, Token, ValueId, Value, EValue, Observation, Bound, Action, Payee,
    Case, Timeout, ETimeout, TimeParam, Contract
} from 'marlowe-js';

(function (): Contract {

    const allocateAda = (party: Party, amount: Value): Action => { 
        // Enacts an internal deposit on the party's account; no funds actually leave the account.
        // In other words, this would equate to allocating funds for <some-eventual-operation>.  
        // A Close contract would pay back the money to the owners of the accounts.
        return Deposit(party, party, ada, amount);
    }

    const payAda = (party1: Party, party2: Party, beneficiary: Party, amount: Value): Contract => { 
        return Pay(party1, Account(beneficiary), ada, amount, 
                    Pay(party2, Account(beneficiary), ada, amount, 
                        Close));
    }


    const cazze = (party1: Party, party2: Party, beneficiary: Party, amount: Value, depositDeadline: Timeout): Case => {
        return Case(
                    // one party allocates the required amount
                    allocateAda(party1, amount), 
                        When( 
                            [
                                Case(
                                    // second party allocates the required amount
                                    allocateAda(party2, amount), 

                                    // all prerequisites met, so contract triggers and
                                    // parties pay the required amount to beneficiary
                                    payAda(party1, party2, beneficiary, amount)
                                )
                            ],
                        // other party did not do its part within the deadline
                        depositDeadline,

                        // funds allocated in internal accounts revert back to owners of said accounts
                        Close 
                    )
                );
    }

    const contract = (party1: Party, party2: Party, beneficiary: Party, requiredAmount: Value, 
                        secondDepositDeadline: Timeout, fullContractDeadline: Timeout): Contract => {

        return  When( 
                    [
                        cazze(party1, party2, beneficiary, requiredAmount, secondDepositDeadline),
                        cazze(party2, party1, beneficiary, requiredAmount, secondDepositDeadline),
                    ],
                // neither party did its part within the deadline
                fullContractDeadline,

                // funds allocated in internal accounts revert back to owners of said accounts
                Close
        )       
    }

    return contract( 
        Role("Party01"), 
        Role("Party02"), 
        Role("Beneficiary"), 
        ConstantParam("RequiredAmount"),
        TimeParam("SecondDepositDeadline"),
        TimeParam("FullContractDeadline")
    )
})