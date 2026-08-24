import { submitWaitlist } from '../waitlist/iosWaitlist';

const STATUS = {
  sending: 'Sending…',
  ok: "You're on the list. We'll email you when iOS is ready.",
  invalid: 'Enter a valid email address.',
  error: "Couldn't reach the waitlist. Email hello@hollowmile.com instead.",
} as const;

/** Email signup forms marked with [data-waitlist]. */
export class WaitlistForms {
  private readonly forms: HTMLFormElement[];
  private readonly onSubmit = (event: Event): void => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement | null;
    if (!form || form.dataset.submitting === 'true') {
      return;
    }
    void this.submitForm(form);
  };

  constructor(
    root: ParentNode = document,
    private readonly send: typeof submitWaitlist = submitWaitlist,
  ) {
    this.forms = Array.from(root.querySelectorAll<HTMLFormElement>('[data-waitlist]'));
    for (const form of this.forms) {
      form.addEventListener('submit', this.onSubmit);
    }
  }

  dispose(): void {
    for (const form of this.forms) {
      form.removeEventListener('submit', this.onSubmit);
    }
  }

  private async submitForm(form: HTMLFormElement): Promise<void> {
    const emailInput = form.querySelector<HTMLInputElement>('[name="email"]');
    const websiteInput = form.querySelector<HTMLInputElement>('[name="website"]');
    const status = form.querySelector<HTMLElement>('[role="status"]');
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!emailInput || !status) {
      return;
    }

    form.dataset.submitting = 'true';
    emailInput.disabled = true;
    if (submit) {
      submit.disabled = true;
    }
    status.dataset.kind = '';
    status.textContent = STATUS.sending;

    const result = await this.send(emailInput.value, websiteInput?.value ?? '');

    delete form.dataset.submitting;
    emailInput.disabled = false;
    if (submit) {
      submit.disabled = false;
    }

    if (result === 'ok') {
      status.dataset.kind = 'ok';
      status.textContent = STATUS.ok;
      emailInput.value = '';
      return;
    }
    if (result === 'invalid') {
      status.dataset.kind = 'error';
      status.textContent = STATUS.invalid;
      return;
    }
    status.dataset.kind = 'error';
    status.textContent = STATUS.error;
  }
}
