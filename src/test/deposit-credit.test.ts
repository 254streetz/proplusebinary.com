import { describe, expect, it } from 'vitest';
import { canCreditDeposit, depositNote, depositNoteMatchesTransaction, kesFromNote, megaPayCallbackFields, megaPayDepositReference, megaPayPaymentState, megaPayTransactionRequestId, megapayIdFromNote, resolveCreditDecision } from '@/lib/deposit-credit';

describe('MegaPay deposit crediting', () => {
  const note = depositNote({ transactionRequestId: 'SOFTPID1600', reference: '171000', amountKes: 1600, kesPerUsd: 129 });
  const webhookPaid = {
    ResponseCode: 0,
    ResponseDescription: 'Success. Request accepted for processing',
    TransactionID: 'SOFTPID1600',
    TransactionAmount: 1600,
    TransactionReceipt: 'SIS88JC7AM',
    TransactionReference: '171000',
  };

  it('credits only a completed payment with the exact requested shilling amount', () => {
    expect(megaPayPaymentState({ TransactionStatus: 'Completed', TransactionCode: '0', TransactionAmount: '1600' })).toBe('completed');
    expect(megaPayPaymentState(webhookPaid)).toBe('pending');
    expect(megaPayPaymentState({ status: 'Completed', TransactionAmount: 1600 })).toBe('completed');
    expect(megaPayPaymentState({ ResultCode: '200', data: { TransactionStatus: 'Completed', TransactionAmount: '1600' } })).toBe('completed');
    expect(canCreditDeposit(note, { TransactionStatus: 'Completed', TransactionAmount: 1600 })).toBe(true);
    expect(canCreditDeposit(note, webhookPaid)).toBe(false);
    expect(kesFromNote(note)).toBe(1600);
  });

  it('does not credit an accepted STK request or a smaller payment', () => {
    expect(megaPayPaymentState({ success: '200', massage: 'Request sent sucessfully.' })).toBe('pending');
    expect(megaPayPaymentState({ ResultCode: '200', ResultDesc: 'Success. Request accepted for processing' })).toBe('pending');
    expect(megaPayPaymentState({ ResponseCode: 0, TransactionAmount: 1600 })).toBe('pending');
    expect(megaPayPaymentState({ status: '200' })).toBe('pending');
    expect(megaPayPaymentState({ ResponseCode: 1032, ResponseDescription: 'Request cancelled by user' })).toBe('failed');
    expect(canCreditDeposit(note, { TransactionStatus: 'Completed', TransactionAmount: 100 })).toBe(false);
    expect(canCreditDeposit(note, { TransactionStatus: 'Completed', TransactionAmount: 0 })).toBe(false);
    expect(canCreditDeposit(note, { TransactionStatus: 'Completed' })).toBe(false);
    expect(canCreditDeposit(note, { TransactionStatus: 'Completed', TransactionAmount: 1700 })).toBe(false);
    expect(canCreditDeposit(note, { success: '200' })).toBe(false);
  });

  it('uses the status API result to decide whether a deposit is complete', () => {
    const ambiguous = { ResultCode: '200', ResultDesc: 'Success. Request accepted for processing' };
    expect(resolveCreditDecision(note, ambiguous)).toBe('pending');
    expect(resolveCreditDecision(note, { TransactionStatus: 'Completed', TransactionAmount: 1600 })).toBe('completed');
    expect(resolveCreditDecision(note, { ResponseCode: 1032 })).toBe('failed');
    expect(megaPayCallbackFields(webhookPaid)).toEqual({ transactionRequestId: 'SOFTPID1600', reference: '171000' });
    expect(megaPayTransactionRequestId({ success: '200', data: { transaction_request_id: 'SOFTPID1600' } })).toBe('SOFTPID1600');
    expect(megaPayCallbackFields({ data: { TransactionID: 'SOFTPID1600', TransactionReference: '171000' } })).toEqual({ transactionRequestId: 'SOFTPID1600', reference: '171000' });
  });

  it('finds the MegaPay id on new and older deposit notes', () => {
    expect(megapayIdFromNote(note)).toBe('SOFTPID1600');
    expect(megapayIdFromNote(depositNote({ reference: '171000', amountKes: 1600, kesPerUsd: 129 }))).toBeNull();
    expect(depositNoteMatchesTransaction('MegaPay request: SOFTPID1600 | KES 1600', 'SOFTPID1600')).toBe(true);
    expect(depositNoteMatchesTransaction(note, 'OTHER')).toBe(false);
    expect(megaPayDepositReference('171000')).toMatch(/^171000[a-f0-9]{32}$/);
  });
});
