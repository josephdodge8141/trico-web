import { useEffect, useRef, useState, type RefObject } from 'react';
import type { InquiryRequest } from '@app/schemas';

import { submitInquiry } from '../services/inquiry.js';

type InquiryStatus = 'idle' | 'sending' | 'sent' | 'error';

export function useInquirySubmission(): {
  readonly status: InquiryStatus;
  readonly feedbackRef: RefObject<HTMLDivElement | null>;
  readonly send: (input: InquiryRequest, form: HTMLFormElement) => Promise<void>;
  readonly reset: () => void;
} {
  const [status, setStatus] = useState<InquiryStatus>('idle');
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (status === 'sent' || status === 'error') feedbackRef.current?.focus();
  }, [status]);
  return {
    status,
    feedbackRef,
    send: async (input, form): Promise<void> => {
      if (status === 'sending') return;
      setStatus('sending');
      try {
        await submitInquiry(input);
        form.reset();
        setStatus('sent');
      } catch {
        setStatus('error');
      }
    },
    reset: () => setStatus('idle'),
  };
}
