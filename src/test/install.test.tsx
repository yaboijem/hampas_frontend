import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import InstallPrompt from '../components/InstallPrompt';

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as unknown as Record<string, unknown>).__hampasInstallEvent;
});

describe('InstallPrompt', () => {
  test('shows install button when prompt event fires', () => {
    const promptFn = vi.fn();
    const event = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<void> };
    Object.defineProperty(event, 'prompt', { value: promptFn });
    (window as unknown as Record<string, unknown>).__hampasInstallEvent = event;

    render(<InstallPrompt />);

    fireEvent(window, new Event('beforeinstallprompt'));
    expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /install app/i }));
    expect(promptFn).toHaveBeenCalled();
  });
});
