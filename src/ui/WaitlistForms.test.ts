import { describe, expect, it, vi } from 'vitest';
import { WaitlistForms } from './WaitlistForms';

describe('waitlist forms', () => {
  it('posts a valid email and shows success', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const root = createFormRoot();
    const forms = new WaitlistForms(root, send);

    root.form.submit();
    await vi.waitFor(() => {
      expect(send).toHaveBeenCalledWith('grey@hollowmile.com', '');
      expect(root.status.textContent).toBe(
        "You're on the list. We'll email you when iOS is ready.",
      );
    });
    expect(root.email.value).toBe('');
    forms.dispose();
  });

  it('shows a visible error when the API is unreachable', async () => {
    const send = vi.fn().mockResolvedValue('error');
    const root = createFormRoot();
    new WaitlistForms(root, send);

    root.form.submit();
    await vi.waitFor(() => {
      expect(root.status.textContent).toContain('hello@hollowmile.com');
    });
    expect(root.status.getAttribute('data-kind')).toBe('error');
  });

  it('rejects an invalid address without treating it as success', async () => {
    const send = vi.fn().mockResolvedValue('invalid');
    const root = createFormRoot('nope');
    new WaitlistForms(root, send);

    root.form.submit();
    await vi.waitFor(() => {
      expect(root.status.textContent).toBe('Enter a valid email address.');
    });
    expect(root.email.value).toBe('nope');
  });
});

function createFormRoot(email = 'grey@hollowmile.com'): ParentNode & {
  form: FakeForm;
  email: FakeField;
  status: FakeField;
} {
  const emailField = new FakeField(email);
  const websiteField = new FakeField('');
  const status = new FakeField('');
  const submit = new FakeField('');
  const form = new FakeForm({
    '[name="email"]': emailField,
    '[name="website"]': websiteField,
    '[role="status"]': status,
    'button[type="submit"]': submit,
  });

  return {
    form,
    email: emailField,
    status,
    querySelector() {
      return null;
    },
    querySelectorAll(selector: string) {
      if (selector !== '[data-waitlist]') {
        return [] as unknown as NodeListOf<Element>;
      }
      return [form] as unknown as NodeListOf<Element>;
    },
  } as unknown as ParentNode & {
    form: FakeForm;
    email: FakeField;
    status: FakeField;
  };
}

class FakeForm {
  dataset: { submitting?: string } = {};
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  constructor(private readonly fields: Record<string, FakeField>) {}

  querySelector(selector: string): FakeField | null {
    return this.fields[selector] ?? null;
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const bucket = this.listeners.get(type) ?? new Set();
    bucket.add(listener);
    this.listeners.set(type, bucket);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.get(type)?.delete(listener);
  }

  submit(): void {
    const event = {
      type: 'submit',
      currentTarget: this,
      preventDefault() {},
    } as unknown as Event;
    for (const listener of this.listeners.get('submit') ?? []) {
      if (typeof listener === 'function') {
        listener(event);
      }
    }
  }
}

class FakeField {
  disabled = false;
  dataset: { kind?: string } = {};
  textContent = '';

  constructor(public value: string) {}

  getAttribute(name: string): string | null {
    if (name === 'data-kind') {
      return this.dataset.kind ?? null;
    }
    return null;
  }
}
