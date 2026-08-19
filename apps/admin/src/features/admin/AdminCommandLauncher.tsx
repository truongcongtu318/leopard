'use client';

import { Button, CommandDialog, type CommandDialogState } from '@leopard/ui';
import React from 'react';

import type { AdminCommandView, AdminDialogPreviewView } from './model';

export function AdminCommandLauncher({
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

  const open = (command: AdminCommandView) => {
    setActiveCommand(command);
    setReason('');
    setState('idle');
  };

  const close = () => {
    setActiveCommand(null);
    setReason('');
    setState('idle');
  };

  return (
    <section aria-labelledby="admin-command-heading" className="min-w-0">
      <h3
        id="admin-command-heading"
        ref={fallbackFocusRef}
        tabIndex={-1}
        className="font-semibold text-neutral-text"
      >
        Command được backend cho phép
      </h3>
      <p className="mt-xxs text-body-compact text-neutral-muted">
        UI chỉ hiển thị capability có trong view model; kết quả thật phải đến từ persisted response.
      </p>
      <div
        aria-hidden={activeCommand ? 'true' : undefined}
        className="mt-sm flex flex-wrap gap-xs"
      >
        {commands.map((command) => (
          <Button
            key={`${command.kind}-${command.targetId}`}
            variant={command.buttonVariant}
            onPress={() => open(command)}
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
          onClose={close}
          onReasonChange={setReason}
          onResolveConflict={close}
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
