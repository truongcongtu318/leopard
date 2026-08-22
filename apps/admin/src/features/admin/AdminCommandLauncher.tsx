'use client';

import { useRouter } from 'next/navigation';
import { Button, CommandDialog, type CommandDialogState } from '@leopard/ui';
import React from 'react';

import { executeAdminCommand, type CommandExecutionResult } from './execute-command';
import type { AdminCommandView, AdminDialogPreviewView } from './model';

function commandList(commands: readonly AdminCommandView[], onOpen: (command: AdminCommandView) => void) {
  return (
    <div className="mt-sm flex flex-wrap gap-xs">
      {commands.map((command) => (
        <Button
          key={`${command.kind}-${command.targetId}`}
          variant={command.buttonVariant}
          onPress={() => onOpen(command)}
        >
          {command.commandLabel}
        </Button>
      ))}
    </div>
  );
}

function launcherCopy() {
  return (
    <>
      <h3 id="admin-command-heading" className="font-semibold text-neutral-text">
        Command được backend cho phép
      </h3>
      <p className="mt-xxs text-body-compact text-neutral-muted">
        UI chỉ hiển thị capability có trong view model; kết quả thật phải đến từ persisted response.
      </p>
    </>
  );
}

/**
 * Preview-only variant: mirrors fixture scenarios through dialogPreview state.
 * Deliberately avoids router APIs so it renders without an App Router context.
 */
function PreviewCommandLauncher({
  commands,
  dialogPreview,
}: Readonly<{
  commands: readonly AdminCommandView[];
  dialogPreview: AdminDialogPreviewView | null;
}>) {
  const initialCommand = dialogPreview
    ? commands.find((candidate) => candidate.kind === dialogPreview.commandKind) ?? null
    : null;
  const fallbackFocusRef = React.useRef<HTMLHeadingElement>(null);
  const [activeCommand, setActiveCommand] = React.useState<AdminCommandView | null>(initialCommand);
  const [reason, setReason] = React.useState(dialogPreview?.reasonValue ?? '');
  const [state, setState] = React.useState<CommandDialogState>(dialogPreview?.state ?? 'idle');

  if (commands.length === 0) return null;

  return (
    <section aria-labelledby="admin-command-heading" className="min-w-0">
      {launcherCopy()}
      <div aria-hidden={activeCommand ? 'true' : undefined} className="mt-sm flex flex-wrap gap-xs">
        {commands.map((command) => (
          <Button
            key={`${command.kind}-${command.targetId}`}
            variant={command.buttonVariant}
            onPress={() => {
              setActiveCommand(command);
              setReason('');
              setState('idle');
            }}
          >
            {command.commandLabel}
          </Button>
        ))}
      </div>

      {activeCommand ? (
        <CommandDialog
          commandLabel={activeCommand.commandLabel}
          commandVariant={activeCommand.buttonVariant}
          consequence={activeCommand.consequence}
          fallbackFocusRef={fallbackFocusRef}
          isOpen
          {...(dialogPreview?.message ? { message: dialogPreview.message } : {})}
          onClose={() => {
            setActiveCommand(null);
            setReason('');
            setState('idle');
          }}
          onReasonChange={setReason}
          onResolveConflict={() => {
            setActiveCommand(null);
            setState('idle');
          }}
          onSubmit={() => setState('pending')}
          {...(dialogPreview?.reasonError ? { reasonError: dialogPreview.reasonError } : {})}
          reasonLabel={activeCommand.reasonPolicy.label}
          reasonPolicy={activeCommand.reasonPolicy}
          reasonValue={reason}
          state={state}
          targetItems={activeCommand.targetItems}
          title={`${activeCommand.commandLabel}: ${activeCommand.targetLabel}`}
        />
      ) : null}
    </section>
  );
}

/**
 * Live variant: submits through the BFF proxy to the real API and refreshes
 * server-rendered data after persisted success.
 */
function RuntimeCommandLauncher({
  commands,
}: Readonly<{ commands: readonly AdminCommandView[] }>) {
  const router = useRouter();
  const fallbackFocusRef = React.useRef<HTMLHeadingElement>(null);
  const [activeCommand, setActiveCommand] = React.useState<AdminCommandView | null>(null);
  const [reason, setReason] = React.useState('');
  const [state, setState] = React.useState<CommandDialogState>('idle');
  const [dialogMessage, setDialogMessage] = React.useState<string | null>(null);
  const [reasonError, setReasonError] = React.useState<string | null>(null);

  if (commands.length === 0) return null;

  const close = () => {
    setActiveCommand(null);
    setReason('');
    setState('idle');
    setDialogMessage(null);
    setReasonError(null);
  };

  const applyResult = (result: CommandExecutionResult) => {
    if (result.state === 'invalid') {
      setState('invalid');
      setReasonError(result.reasonError);
      return;
    }
    if (result.state === 'conflict') {
      setState('conflict');
      setDialogMessage(result.message);
      return;
    }
    if (result.state === 'success') {
      setState('success');
      setDialogMessage(result.message);
      // Re-render the server components so the list/detail reflects the
      // persisted backend state instead of optimistic local mutation.
      router.refresh();
      return;
    }
    setState(result.state);
    setDialogMessage(result.message);
  };

  const submit = async () => {
    if (!activeCommand) return;

    // Local policy pre-check mirrors the backend reason contract so obvious
    // mistakes never leave the browser.
    const trimmed = reason.trim();
    const { minLength = 0, maxLength = Number.POSITIVE_INFINITY } = activeCommand.reasonPolicy;
    if (trimmed.length < Math.max(minLength, 5)) {
      setState('invalid');
      setReasonError(`Nội dung phải có ít nhất ${Math.max(minLength, 5)} ký tự.`);
      return;
    }
    if (trimmed.length > maxLength) {
      setState('invalid');
      setReasonError(`Nội dung tối đa ${maxLength} ký tự.`);
      return;
    }

    setState('pending');
    applyResult(await executeAdminCommand(activeCommand, trimmed));
  };

  return (
    <section aria-labelledby="admin-command-heading" className="min-w-0">
      {launcherCopy()}
      {commandList(commands, (command) => {
        setActiveCommand(command);
        setReason('');
        setState('idle');
        setDialogMessage(null);
        setReasonError(null);
      })}

      {activeCommand ? (
        <CommandDialog
          commandLabel={activeCommand.commandLabel}
          commandVariant={activeCommand.buttonVariant}
          consequence={activeCommand.consequence}
          fallbackFocusRef={fallbackFocusRef}
          isOpen
          {...(dialogMessage ? { message: dialogMessage } : {})}
          onClose={close}
          onReasonChange={(value) => {
            setReason(value);
            if (reasonError) setReasonError(null);
            if (state === 'invalid') setState('idle');
          }}
          onResolveConflict={close}
          onSubmit={() => void submit()}
          {...(reasonError ? { reasonError } : {})}
          reasonLabel={activeCommand.reasonPolicy.label}
          reasonPolicy={activeCommand.reasonPolicy}
          reasonValue={reason}
          state={state}
          targetItems={activeCommand.targetItems}
          title={`${activeCommand.commandLabel}: ${activeCommand.targetLabel}`}
        />
      ) : null}
    </section>
  );
}

export function AdminCommandLauncher({
  commands,
  dialogPreview,
  runtime = false,
}: Readonly<{
  commands: readonly AdminCommandView[];
  dialogPreview: AdminDialogPreviewView | null;
  /** When true the dialog submits through the live API instead of preview state. */
  runtime?: boolean;
}>) {
  if (runtime) {
    return <RuntimeCommandLauncher commands={commands} />;
  }
  return <PreviewCommandLauncher commands={commands} dialogPreview={dialogPreview} />;
}
