"use client";

export function ConfirmSubmitButton({
  action,
  confirmMessage,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  confirmMessage: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
