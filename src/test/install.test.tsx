import { act, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import InstallPrompt from '../components/InstallPrompt';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (window as unknown as Record<string, unknown>).__hampasInstallEvent;
});

function fireInstallable() {
  const promptFn = vi.fn().mockResolvedValue(undefined);
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>;
  };
  Object.defineProperty(event, 'prompt', { value: promptFn });
  (window as unknown as Record<string, unknown>).__hampasInstallEvent = event;
  fireEvent(window, event);
  return promptFn;
}

describe('InstallPrompt', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  test('shows install UI top-right when prompt event fires', () => {
    render(<InstallPrompt />);
    fireInstallable();
    expect(screen.getByText(/install hampas on your device/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
    const root = screen.getByTestId('install-prompt');
    expect(root.className).toMatch(/top-/);
    expect(root.className).toMatch(/right-/);
    expect(root.className).not.toMatch(/bottom-/);
  });

  test('Install button calls deferred.prompt', async () => {
    render(<InstallPrompt />);
    const promptFn = fireInstallable();
    fireEvent.click(screen.getByRole('button', { name: /install app/i }));
    expect(promptFn).toHaveBeenCalled();
  });

  test('auto-hides after 3.5 seconds', async () => {
    render(<InstallPrompt />);
    fireInstallable();
    expect(screen.getByText(/install hampas on your device/i)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });
    expect(screen.queryByText(/install hampas on your device/i)).not.toBeInTheDocument();
  });
});
